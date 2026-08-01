# relay — transport d'idées cross-harness via Linear

**Date** : 2026-07-09
**Statut** : design validé en brainstorm (session Claude Code du 2026-07-09)
**Remplace** : le volet inter-harness des skills supprimés `handoff` / `session-checkpoint` / `session-continue` (suppression au commit `8587e02`). Le volet intra-harness (coupure quota, `/clear`) n'est pas repris : TaskList + mémoire native le couvrent.

## Problème

Environnement de dev multi-harness et multi-modèles : les idées naissent n'importe où (opencode + deepseek, chatgpt.com, claude.ai, Pi Agent, Claude Code) et doivent pouvoir être développées ailleurs, typiquement sur Claude Code + Opus où vit la pipeline superpowers (brainstorm → spec → plan).

L'ancien skill `handoff` a échoué sur deux points, diagnostiqués explicitement :

- **Périmètre (C)** : calibré « session de dev » (git, fichiers, blockers) alors que le besoin réel est le transport d'**idées en gestation**, dont tout le contexte est la conversation elle-même.
- **Reprise (B)** : chaîne de dépendances fragile côté harness cible (connecteur Linear générique + CASERNE.md à résoudre + skill installé), et aucune couverture des web apps (un skill de plugin ne peut pas exister sur chatgpt.com ni claude.ai).

## Décision

**Approche « doctrine »** : un skill unique `relay` dans ce repo + les tools MCP caserne existants. **Zéro développement serveur.**

Vérifié le 2026-07-09 dans le control-plane :

- `create_issue` accepte `project`, `labels`, `notify`, `workspace` en optionnel (`src/server.ts:52-67`) — on vise le projet Handoffs depuis n'importe quel cwd, y compris en HTTP où il n'y a pas de projet courant (`src/http/sessions.ts:82` construit le contexte sur `configDir`).
- `list_issues` accepte `project`, `state`, `query`, `limit` (`src/server.ts:101-116`).
- Le registre caserne contient déjà le projet `Handoffs` et le label `handoff` (`~/.config/caserne/employees.yml`).
- `caserne serve` (Streamable HTTP + OAuth 2.1 + Tailscale Funnel) est branchable en connecteur custom sur claude.ai et chatgpt.com, write actions comprises (vérifié en live, docs OpenAI et Anthropic, juillet 2026).

Approches écartées :

- **Tools serveur dédiés** (`drop_idea` / `pick_idea`) : robustesse maximale mais on figerait un gabarit jamais éprouvé. Conservée comme plan B (voir Escalade).
- **Fichier-first** (`ideas/*.md`) : rate frontalement les web apps et le multi-device, re-crée la fragilité de reprise sous une autre forme.

## Le concept

Un **relay** = une issue Linear dans le projet `Handoffs` qui transporte une **idée en phase gazeuse** : après l'étincelle, avant la pipeline.

Frontières du territoire :

- Dès que l'idée entre en pipeline superpowers (brainstorm formel, spec committée), **le repo git devient le véhicule** : le relay est libéré en pointant la spec. Un relay ne transporte jamais l'état d'un chantier.
- La survie intra-harness (coupure quota, `/clear`) n'est pas du relay.
- Le nom : le skill s'appelle `relay` (le passage de témoin) ; le label Linear existant reste `handoff` (rangement registre, invisible à l'usage).

## Gabarit

Titre : l'idée en 3-6 mots, sans ponctuation finale.

Description markdown **agnostique** (sera lue par n'importe quel modèle sur n'importe quel harness, pas de jargon Claude, pas de chemin inexpliqué). Deux sections obligatoires, trois facultatives :

```markdown
## Idée
(2-4 phrases : quoi, pour qui, pourquoi maintenant)

## Next
(la prochaine étape d'exploration, concrète et petite :
« brainstormer X », « vérifier si Y existe », « prototyper Z en 30 min »)

## Déclencheur      ← facultatif
(d'où ça vient : le problème rencontré, la conversation ; recharge le contexte mental)

## Exploré          ← facultatif
(pistes discutées ET écartées, avec le pourquoi ; évite de re-débattre)

## Cible            ← facultatif
(repo/projet pressenti, harness ou modèle conseillé pour la suite)
```

Métadonnées fixées : projet `Handoffs`, label `handoff`, state `Todo`, `notify: false` (une idée perso ne spamme pas un canal Slack). Aucun autre champ Linear (pas de priority, milestone, cycle, assignee). Si un repo cible existe déjà sur le disque, le passer via le paramètre `workspace` de `create_issue` (rendu en bloc `#### workspace` par le form template caserne) plutôt qu'en prose.

Viser « une session fraîche reprend sans poser de question bête ». Le minimum vital est Idée + Next ; les sections facultatives s'ajoutent quand elles portent quelque chose, jamais pour remplir.

## Les 4 verbes

### Déposer

1. Rédiger le draft depuis le contexte de conversation (jamais re-demander ce qui a déjà été dit).
2. Montrer le draft complet (titre + description), demander confirmation.
3. Confirmé → `create_issue({ title, description, project: "Handoffs", labels: ["handoff"], notify: false })`.
4. Confirmer : `Relay déposé : "<titre>" → EAT-XXX` + URL.

### Lister

`list_issues({ project: "Handoffs", state: "Todo" })`. Affichage compact, toujours avec l'identifier :

```
=== Relays (3 Todo) ===
1. [EAT-170] Dashboard v3 temps réel     2h
2. [EAT-165] Connecteur OAuth Stalwart   hier
3. [EAT-158] Bug chunking E5             3j
```

« tous » → omettre `state` ; « les finis » → `state: "Done"`.

### Reprendre

- Identifier fourni → `get_issue({ id: "EAT-XXX" })` ; sinon recherche : `list_issues({ project: "Handoffs", query: <titre>, limit: 5 })` (match unique → l'utiliser ; plusieurs → demander lequel).
- Afficher le payload complet, puis reformuler le **Next** en 2 phrases max.
- **Pont pipeline** : si le skill `superpowers:brainstorming` est disponible dans le harness courant et que l'intention est d'approfondir l'idée, proposer d'enchaîner dessus avec le contenu du relay comme brief.
- Ne jamais libérer automatiquement à la reprise.

### Libérer

`update_issue({ id: "EAT-XXX", state: "Done" })` uniquement — jamais de suppression, l'historique reste. Si un véhicule a pris le relais (spec committée, repo), le pointer via `comment_issue` avant de fermer.

## Côté web apps (claude.ai, chatgpt.com)

Le connecteur caserne (via `caserne serve`) expose les mêmes tools sous la même identité : le dépôt et la reprise marchent sans skill. Le gabarit y vit sous forme d'un **prompt de poche** à coller en custom instructions (ou projet ChatGPT) :

> Quand je te demande de déposer/relayer une idée : crée une issue Linear via le connecteur caserne avec `create_issue({ project: "Handoffs", labels: ["handoff"], notify: false })`. Titre 3-6 mots. Description markdown : `## Idée` (2-4 phrases) et `## Next` (prochaine étape concrète) obligatoires ; `## Déclencheur`, `## Exploré`, `## Cible` si utiles. Montre-moi le draft avant de créer.

Fallback ultime sans connecteur : l'app Linear directe (mobile/web) — le réceptacle étant une simple issue, le flux dégradé reste fonctionnel.

## Livrable

Un seul skill : `skills/relay/SKILL.md` dans ce repo.

- Frontmatter au format maison, triggers riches couvrant le vocabulaire réel : « passe le relais », « dépose cette idée », « relaie ça », « sauvegarde cette idée pour plus tard », « mes relays en attente », « mes idées en attente », « reprends le relay X », « reprends l'idée du dashboard », « libère le relay ».
- Garde anti-déclenchement-spontané (même hygiène que `session-end` : jamais sur signal faible, intention explicite requise).
- Corps : le concept et ses frontières, le gabarit, les 4 verbes avec les appels exacts, la doctrine de rédaction. Intention ambiguë → question fermée, ne pas deviner.
- Mise à jour de la table des skills dans le README si elle existe.

## Prérequis opérationnels (hors design, à traiter séparément)

- `caserne serve` doit tourner en continu sur le Mac pour les web apps (routine launchd à créer — hors scope ici).
- Zone grise ChatGPT : la doc officielle est ambiguë sur la dispo du full MCP en plan Plus/Pro individuel. Vérification 10 secondes : Settings → Apps & Connectors → Advanced settings → toggle Developer mode.
- Deux exigences côté serveur à vérifier au premier branchement web (dev control-plane éventuel, hors scope relay) : émission de refresh tokens (`offline_access`, sinon le connecteur ChatGPT meurt à l'expiration du premier token) et annotation `readOnlyHint` sur les tools de lecture (évite les confirmations inutiles sur ChatGPT).

## Critères de succès

1. Une idée déposée depuis opencode (deepseek v4 flash) ou chatgpt.com se reprend sur Claude Code en moins d'une minute, sans question bête.
2. Le pont vers `superpowers:brainstorming` s'enchaîne naturellement à la reprise.
3. Les dépôts produits par les petits modèles respectent le gabarit (Idée + Next présents, pas de dump de conversation).

## Escalade (plan B documenté)

Si la doctrine ne tient pas cross-modèles (critère 3 en échec récurrent malgré un gabarit stabilisé) : créer `drop_idea` / `pick_idea` dans le control-plane, le gabarit porté par le `inputSchema` zod (un petit modèle remplit un formulaire mieux qu'il ne suit une doctrine). Mêmes verbes, même réceptacle : la bascule est incrémentale, rien n'est jeté.
