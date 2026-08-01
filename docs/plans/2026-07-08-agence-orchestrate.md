# agence-orchestrate (doctrine du siège boss) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le skill `agence-orchestrate` (doctrine du chef d'orchestre en session principale, siège `boss`) et mettre `agence-network` en cohérence post-merge, conformément à `docs/specs/2026-07-08-agence-orchestrate-design.md`.

**Architecture:** Deux fichiers SKILL.md en prose dans le plugin maître (`claude-agence-plugin/skills/`). Aucun code, aucun test automatisé : la vérification est une relecture croisée contre la surface CLI réelle du `caserne` mergé (repo voisin `erom-agence-control-plane`, main). Le texte complet des livrables est DANS ce plan — l'implémenteur transcrit, il n'invente pas de doctrine.

**Tech Stack:** Markdown (SKILL.md avec frontmatter YAML), conventions du monorepo plugin.

## Global Constraints

- Tout en **français**, style des skills existants (`agence-network` est le modèle structurel).
- **Maître seul** : éditer uniquement `claude-agence-plugin/` ; jamais `codex-agence-plugin/` ni `gemini-agence-plugin/` (générés). Régénération + version = hors chantier.
- **Aucune donnée propre à l'installation** dans les fichiers distribués : pas de chemins `/Users/...`, pas de noms de subagents personnels (`search-deep`…), pas d'IDs. Les exemples utilisent des placeholders (`/abs/du/projet`).
- Le fichier dirty pré-existant `claude-agence-plugin/skills/agence-control/SKILL.md` ne doit être **ni touché ni commité** (modif sans rapport, laissée en l'état).
- Chaque commande/flag/exit code/message d'erreur cité par les skills doit exister dans le CLI réel. Échantillons capturés le 2026-07-08 contre `erom-agence-control-plane` main (`8a3d94b`) — sources citées dans les steps de vérification.
- Deux commits, messages conventionnels FR (voir Tasks 1-2). Jamais `rm` ; `trash` si besoin (aucune suppression prévue).

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `claude-agence-plugin/skills/agence-orchestrate/SKILL.md` | **Créer** — doctrine du chef d'orchestre (texte complet en Task 1) |
| `claude-agence-plugin/skills/agence-network/SKILL.md` | **Modifier** — 4 retouches chirurgicales (texte exact en Task 2) |

Hors périmètre, décidé : variantes générées, version, `agence-control` (dirty pré-existant), volet images (spec §7).

---

### Task 1: Créer le skill `agence-orchestrate`

**Files:**
- Create: `claude-agence-plugin/skills/agence-orchestrate/SKILL.md`

**Interfaces:**
- Consumes: la surface CLI boss livrée dans `erom-agence-control-plane` (main, `8a3d94b`) — échantillons réels capturés : USAGE (`caserne` sans argument), messages `Agent inconnu dans « … » : …` / `Agent inactif : …` / `Alias réservé : "boss" (siège du poste de commandement, hors swarm).` / `Tâche orpheline : …` / `Timeout : … toujours pending après … min.` / `Aucune session : lance depuis un pane swarm, ou précise -s <session>.` / `message livré, mais tâche non enregistrée au ledger (ne PAS re-send)`, exit codes `waitForTask` 0/2/3, défaut `1_800_000` ms (30 min), bootstrap : `Une task_request reçue se clôt par : caserne send <expéditeur> response <task_id> success|failure <résultat>`.
- Produces: le skill référencé par la retouche d'`agence-network` (Task 2).

- [ ] **Step 1: Écrire le fichier intégral**

Créer `claude-agence-plugin/skills/agence-orchestrate/SKILL.md` avec EXACTEMENT ce contenu :

````markdown
---
name: agence-orchestrate
description: "Doctrine du chef d'orchestre du réseau caserne : déléguer un travail à un salarié IA du swarm depuis la session principale (siège boss, hors pane), suivre l'exécution et synthétiser le livrable. Déclenche UNIQUEMENT sur intention réseau explicite : déléguer / dispatcher à un salarié nommé (« délègue à agy », « demande à agy de… »), lancer un travail « via l'agence » / « sur le réseau », ou suivre une task réseau déjà lancée (où en est la task, relance agy, lis la réponse). Ne se déclenche PAS sur une demande de recherche ordinaire sans intention réseau exprimée : elle reste aux moyens locaux de la session. Complément hors-pane de agence-network (le manuel du salarié dans son pane)."
user-invocable: true
---

# Agence — orchestrer le réseau depuis la session principale (siège boss)

Le swarm caserne fait tourner une équipe de salariés IA dans une session tmux (`agence-network` est leur manuel). Ce skill est l'autre bout de la lunette : **toi, la session principale, hors pane**, qui délègues un travail au réseau et récupères le livrable. Hors pane (`CASERNE_ALIAS` absent), caserne te donne automatiquement le siège externe **`boss`** : tes `send` / `read` signent `boss`, sans configuration.

Tout passe par le CLI **`caserne`** (surface exacte : `caserne` sans argument). Ce skill enseigne le *quand / pourquoi* — le protocole, pas les flags.

## Les principes non négociables

1. **Déclenchement explicite seulement.** Tu ne dispatches au réseau que sur intention exprimée (« délègue à agy », « via l'agence », un salarié nommé). Une recherche ordinaire reste aux moyens locaux de la session hôte. Pas de spawn implicite.
2. **Hors pane, tu es `boss`.** Jamais une incarnation : `boss` est refusé au spawn mais toujours joignable en messagerie. `-s agence` est obligatoire sur chaque commande (hors serveur tmux, la session n'est pas déductible). Session standing par convention : **`agence`**.
3. **Aucun artefact dans la messagerie.** Les livrables vont dans un dossier de sortie ; la response ne porte que résumé + chemins. L'injection chez toi est tronquée (~500 caractères), le ledger reste léger.
4. **N'utilise JAMAIS tmux directement.** `team`, `send`, `tasks`, `fire` : caserne fait tout.
5. **Jamais de bascule silencieuse coûteuse.** Un échec du réseau se rattrape **une fois** (table plus bas) ; ensuite tu préviens et proposes le fallback local. Tu ne relances pas en boucle.

## Table de routage v1

Utilisée seulement quand le salarié n'est pas nommé :

| Signal | Salarié | Pourquoi |
|---|---|---|
| Deep research, veille, état de l'art | `agy` | Grounding Google natif, quota Antigravity |

Salarié nommé explicitement (« délègue à glm ») → la table est court-circuitée, même protocole.

## Le protocole de dispatch (5 temps)

### 1. Ensure up

```
caserne team -s agence
caserne run agy -s agence --detach     # seulement si absent ou dead
```

`--detach` : spawn silencieux, sans attach (ton terminal n'est pas volé). **Aucune attente de readiness** : le send est valide dès la réservation au roster (`spawning` accepté), l'injection idle-aware part quand le TUI du salarié est prêt.

### 2. Formule l'objective (gabarit)

Un objective structuré, en **une seule ligne** (l'injection dans le pane est mono-ligne) :

```
<mission en une phrase>. Contexte : <ce qu'il faut savoir>. Écris tes livrables dans <ABS>/.claude/agence/out/<ton task_id>/ (crée le dossier). Quand c'est fini, réponds par : caserne send boss response <task_id> success|failure <résumé + chemins des fichiers>.
```

- `<ABS>` = chemin **absolu** du projet courant. Le cwd du salarié n'est pas le tien (la session `agence` est cross-projets) : tout chemin passé est absolu.
- Le salarié connaît son `task_id` (il est dans le message reçu) : il crée le sous-dossier lui-même ; toi tu reconstruis le chemin exact dès le send.
- La consigne de clôture est redondante avec le bootstrap caserne : ceinture et bretelles.

### 3. Send — capture le `task_id`

```
caserne send agy task "<objective>" -s agence
```

Imprime le **`task_id` seul sur stdout** (contrat parsable). Capture-le : c'est ta clé de suivi. S'il sort `message livré, mais tâche non enregistrée au ledger (ne PAS re-send)` : n'envoie **pas** une deuxième fois, le message est déjà chez le salarié — suis à la main (`caserne read -s agence`).

### 4. Attends en arrière-plan

```
caserne tasks <task_id> --wait -s agence
```

Lance ce wait **en tâche de fond** de ton harness et continue ton travail : tu es réveillé à la clôture.

| Exit | Sens | Et ensuite |
|---|---|---|
| 0 | task close (success **ou** failure) — la fiche est imprimée | lis le result |
| 2 | destinataire dead (tâche orpheline) | rattrapage ci-dessous |
| 3 | timeout (défaut 30 min ; `--timeout <min>`) | rattrapage ci-dessous |

### 5. Au réveil : vérifie, puis synthétise

- Lis le result (résumé + chemins). Une **failure est une clôture** : lis-la, elle dit pourquoi.
- **Vérifie l'existence réelle des fichiers livrés** (`ls` du dossier de sortie) avant d'affirmer quoi que ce soit.
- Synthétise à l'utilisateur ; remonte le fichier si le livrable le mérite.

## Rattrapages

| Symptôme | Rattrapage (une fois) | Si ça échoue encore |
|---|---|---|
| wait exit 2 (orpheline) | `caserne run <agent> -s agence --detach` puis re-dispatch d'une **task neuve** | préviens et propose le fallback local |
| wait exit 3 (timeout) | `caserne send <alias> chat "où en es-tu sur <task_id> ?" -s agence` + re-wait | préviens et propose le fallback local |
| réponse mal formée (chat au lieu de response, task jamais close) | même traitement que le timeout ; `caserne read --unread -s agence` + `caserne tasks -s agence` pour voir ce qui s'est réellement dit | idem |
| tmux absent ou cassé (`caserne doctor`) | — | fallback local d'emblée |

« Fallback local » = les moyens de recherche de la session hôte (subagents, workflows) — leur choix est la configuration de la session, hors périmètre de ce skill.

## Erreurs fréquentes

| Erreur | Cause | Correction |
|---|---|---|
| `Aucune session : lance depuis un pane swarm, ou précise -s <session>.` | `-s` oublié (hors tmux, session non déductible) | ajoute `-s agence` |
| `Agent inconnu dans « agence » : <alias>` | salarié jamais recruté dans la session | `caserne run <agent> -s agence --detach` |
| `Agent inactif : <alias>` | incarnation dead | idem (respawn), puis re-dispatch |
| `Alias réservé : "boss" …` | tentative de spawner une incarnation nommée boss | `boss` n'est pas une incarnation ; choisis un autre alias |

## Cycle typique

```
caserne team -s agence                          # agy actif ?
caserne run agy -s agence --detach              # sinon : spawn silencieux
caserne send agy task "État de l'art X. Contexte : Y. Écris tes livrables dans /abs/du/projet/.claude/agence/out/<ton task_id>/ (crée le dossier). Quand c'est fini, réponds par : caserne send boss response <task_id> success|failure <résumé + chemins>." -s agence
# → task-ab12
caserne tasks task-ab12 --wait -s agence        # en tâche de fond
# … tu continues ton travail ; réveil à la clôture …
ls /abs/du/projet/.claude/agence/out/task-ab12/ # vérifie le livrable, puis synthétise
```

## Ce que ce skill ne couvre pas

- **Le salarié dans son pane** (recruter, répondre à une task, `team` / `fire` / `clean`) → `agence-network`.
- **L'identité et le travail dans l'agence** (Linear, Slack, mail) → `agence-control`.
- **Le choix des moyens locaux de fallback** : configuration de la session hôte, hors plugin.
- **Le volet images** (génération / édition → agy) : attend une vérification réelle d'agy en pane ; le jour venu, c'est une ligne de plus à la table de routage.
````

- [ ] **Step 2: Vérifier les citations CLI contre la source réelle**

Chaque commande/message cité doit exister dans le CLI mergé. Run (depuis n'importe où) :

```bash
caserne 2>&1 | grep -c -- "--detach"                    # attendu : 1 (ligne run de l'USAGE)
caserne 2>&1 | grep -c -- "--wait"                      # attendu : 1 (ligne tasks)
command grep -c 'Aucune session : lance depuis un pane swarm, ou précise -s <session>' /Users/x/dev/erom-agence-control-plane/src/swarm/context.ts   # attendu : 1
command grep -c 'Alias réservé : "\${BOSS_ALIAS}" (siège du poste de commandement, hors swarm)' /Users/x/dev/erom-agence-control-plane/src/swarm/roster.ts  # attendu : 1
command grep -c 'ne PAS re-send' /Users/x/dev/erom-agence-control-plane/src/cli/swarm.ts  # attendu : 1
command grep -c '1_800_000' /Users/x/dev/erom-agence-control-plane/src/cli/swarm.ts       # attendu : 1 (défaut 30 min)
command grep -c 'success|failure <résultat>' /Users/x/dev/erom-agence-control-plane/src/swarm/wrapper.ts  # attendu : 1 (bootstrap)
```

Expected: chaque grep renvoie ≥ 1 (le `-c` exact peut varier si le fichier évolue ; 0 = citation morte, STOP et remonter).

- [ ] **Step 3: Auto-relecture distribution**

Vérifier dans le fichier créé : aucun chemin `/Users/`, aucun nom de subagent personnel, aucun ID. Run :

```bash
command grep -n '/Users/\|search-deep\|search-perplexity\|Cxxxx\|U[0-9A-Z]\{8\}' claude-agence-plugin/skills/agence-orchestrate/SKILL.md
```

Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add claude-agence-plugin/skills/agence-orchestrate/SKILL.md
git commit -m "feat(skills): agence-orchestrate — doctrine du chef d'orchestre (siège boss)"
```

(Ne pas stager `agence-control/SKILL.md`, dirty pré-existant.)

---

### Task 2: Retouche `agence-network` (cohérence post-merge)

**Files:**
- Modify: `claude-agence-plugin/skills/agence-network/SKILL.md` (4 retouches : principe 1 ~L15, section send ~L56, tableau erreurs ~L136, « ne couvre pas » ~L145)

**Interfaces:**
- Consumes: le skill `agence-orchestrate` créé en Task 1 (référencé deux fois).
- Produces: rien (dernier livrable).

- [ ] **Step 1: Retouche 1 — principe 1 (hors pane = boss)**

Remplacer (texte exact actuel, ~L15) :

```
`send` / `read` s'en servent pour savoir qui tu es et où tu es. Hors pane swarm (terminal nu), pas de `CASERNE_ALIAS` → `send` refuse : la messagerie est **agent-à-agent**.
```

par :

```
`send` / `read` s'en servent pour savoir qui tu es et où tu es. Hors pane swarm (pas de `CASERNE_ALIAS` : session principale, terminal nu), l'expéditeur devient le siège externe **`boss`** — le poste de commandement hors swarm ; sa doctrine vit dans `agence-orchestrate`.
```

- [ ] **Step 2: Retouche 2 — section send (une task peut venir de boss)**

Après la ligne (~L56) :

```
Expéditeur = **toi** (`CASERNE_ALIAS`). Destinataire **inconnu** ou **mort** → erreur ; en cours de spawn (`spawning`) → **accepté** (le message attend son readiness).
```

ajouter (même paragraphe, phrase suivante) :

```
Une task peut venir de **`boss`** (la session principale, hors pane) : tu la clos exactement pareil — `caserne send boss response <task_id> …`. `boss` est toujours joignable même s'il n'apparaît jamais dans `team`.
```

- [ ] **Step 3: Retouche 3 — supprimer la ligne d'erreur périmée**

Dans le tableau « Erreurs fréquentes », supprimer la ligne (l'erreur n'existe plus dans le CLI) :

```
| `Expéditeur inconnu : CASERNE_ALIAS absent` | `send` lancé hors pane swarm | lance depuis un pane incarné (`caserne run … -s`) |
```

- [ ] **Step 4: Retouche 4 — renvoi vers agence-orchestrate**

Dans « Ce que cette skill ne couvre pas », ajouter en première puce :

```
- **L'orchestration depuis la session principale** (siège `boss` : dispatch, wait, synthèse) → `agence-orchestrate`.
```

- [ ] **Step 5: Vérifier**

```bash
command grep -c 'CASERNE_ALIAS absent' claude-agence-plugin/skills/agence-network/SKILL.md   # attendu : 0
command grep -c 'agence-orchestrate' claude-agence-plugin/skills/agence-network/SKILL.md      # attendu : 2
command grep -c 'send refuse\|send` refuse' claude-agence-plugin/skills/agence-network/SKILL.md  # attendu : 0
```

- [ ] **Step 6: Commit**

```bash
git add claude-agence-plugin/skills/agence-network/SKILL.md
git commit -m "fix(skills): agence-network — siège boss hors pane (post-merge control-plane)"
```

---

### Task 3: Porte finale (relecture croisée, aucun commit)

**Files:** aucun — vérification globale (spec §5).

- [ ] **Step 1: Cohérence croisée des deux skills**

Vérifier que les deux SKILL.md racontent la même histoire : `agence-network` renvoie à `agence-orchestrate` pour le hors-pane ; `agence-orchestrate` renvoie à `agence-network` pour le dans-pane ; la consigne de clôture (`send boss response <task_id> success|failure …`) est identique des deux côtés (et au bootstrap CLI).

```bash
command grep -n 'send boss response' claude-agence-plugin/skills/agence-network/SKILL.md claude-agence-plugin/skills/agence-orchestrate/SKILL.md
```

Expected: ≥ 1 occurrence dans chaque fichier, syntaxe identique.

- [ ] **Step 2: Périmètre git**

```bash
command git log --oneline -3
command git status --short
```

Expected: les 2 commits des Tasks 1-2 en tête ; seul `claude-agence-plugin/skills/agence-control/SKILL.md` reste dirty (pré-existant, non touché) ; aucun fichier des variantes générées modifié.
