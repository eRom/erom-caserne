# Design - Référentiel d'IDs central de l'agence (CASERNE.md)

- **Date** : 2026-06-01
- **Chantier** : #1 sur 4 (Référentiel d'IDs) - les suivants : Setup agence, Consolidation/packaging, Génération cross-agents
- **Statut** : design validé en brainstorming, en attente de relecture avant plan d'implémentation

## Contexte & but

Les IDs de l'agence eRom (Slack, Linear) sont aujourd'hui dispersés : skills `erom-linear` et `erom-slack`, hardcodés dans `erom-handoff`, lus depuis le `CLAUDE.md` projet par `erom-inbox`/`erom-agence-onboarding`. Aucune source unique.

Objectif : **une source de vérité unique, neutre, partagée par les 3 agents (Claude, Codex, Gemini) et persistante cross-sessions**, injectée automatiquement au démarrage de chaque session.

## Périmètre

**Dans le scope :**
- Le fichier `~/.config/CASERNE.md` (structure + contenu IDs).
- Le hook d'injection côté Claude (fourni par le plugin) avec résolution de l'identité de l'agent courant.
- La génération v1 du fichier (migration manuelle one-shot).

**Hors scope (autres chantiers) :**
- Les hooks équivalents Codex/Gemini (-> chantier Génération cross-agents).
- Le setup agence qui (re)génère le fichier automatiquement (-> chantier Setup).
- Le retrait des références prose à `erom-linear`/`erom-slack` et le recasage de la guidance d'écriture Slack (-> chantier Consolidation).

## Décisions de design

1. **Emplacement** : `~/.config/CASERNE.md`, fichier unique, neutre (hors plugin), local à la machine. Non distribué : il contient les UUID spécifiques de l'instance, qui n'ont rien à faire dans un plugin open source.
2. **Nature** : conteneur de contexte agence **multi-sections extensible**. Ce chantier ne remplit que la section IDs ; les sections futures (paths, préférences, persona partagée) sont prévues structurellement mais hors scope.
3. **Contenu = infra stable uniquement** : agents, team Linear, statuts, labels, projets infra, channels de base. Exclus : le par-projet (projet/channel courant) reste dans le `CLAUDE.md` du projet ; les secrets/tokens restent en variables d'environnement, jamais dans ce fichier (il est injecté en contexte = une fuite sinon).
4. **Format** : Markdown + tables. Lisible par le LLM (puisque injecté) et réécrivable proprement par le futur setup.
5. **Mode d'accès** : **injecté au démarrage** (SessionStart), pas de lookup à la demande. Conséquence : les skills `erom-linear`/`erom-slack` (volet référentiel) deviennent obsolètes.
6. **Hook fourni par le plugin** : référencé via `${CLAUDE_PLUGIN_ROOT}/hooks/erom_agence.sh`. Il (a) détecte l'agent courant, (b) émet un en-tête d'identité explicite, (c) injecte le corps de `~/.config/CASERNE.md`.
7. **Résolution self à l'injection** : l'identité de l'agent courant est posée en clair en tête ; le LLM ne devine jamais sa ligne. La table des 3 agents reste présente pour adresser les autres.
8. **Génération v1 = migration manuelle one-shot** depuis le global existant (`~/.claude/skills/erom-linear` + `erom-slack`, qui restent la source canonique des valeurs). Le setup agence automatisera la regénération ensuite.

## Architecture

### Le fichier `~/.config/CASERNE.md`

```markdown
# CASERNE - Contexte agence eRom

## Agents
| Agent  | Slack ID    | Linear ID   | Email                           |
|--------|-------------|-------------|---------------------------------|
| Claude | U0CLAUDE000 | 8500cb1a... | agent-claude@example.com |
| Codex  | U0CODEX0000 | 1c164d23... | agent-codex@example.com  |
| Gemini | U0GEMINI000 | 60c1cb06... | agent-avy@example.com    |
| Romain | U0HUMAN0000 | 8c7ea2ad... | owner@example.com        |

## Linear - workspace eRom / team EAT (5b57dc03...)
Statuts : Backlog ... · Todo ... · Specification ... · Implementation ... · Done ... · Canceled ... · Duplicate ...
Labels  : PLAN OK ... · SPEC OK ... · handoff ... · doc ... · feature ... · bug ...
Projets : Handoffs ... · eRom HQ ...

## Slack
#caserne : C0CASERNE00

<!-- sections futures (hors scope) : paths, préférences, persona partagée -->
```

Valeurs complètes = recopiées depuis le global existant à la migration v1.

### Le hook (flux au démarrage)

```
SessionStart
  -> ${CLAUDE_PLUGIN_ROOT}/hooks/erom_agence.sh
       1. détecte l'agent courant (CLAUDECODE / GEMINI_CLI / CODEX_SANDBOX)
       2. émet l'en-tête self :
          <caserne-self>Tu es agent-claude - Slack U0CLAUDE000 · Linear 8500cb1a...</caserne-self>
       3. cat ~/.config/CASERNE.md  (no-op silencieux si absent)
  -> stdout = contexte additionnel injecté
```

Le fichier est commun aux 3 agents (même machine, même `$HOME`) ; seul l'en-tête self diffère, calculé au moment de l'injection.

## Génération v1

Migration manuelle, une fois : recopier les IDs du global (`erom-linear` + `erom-slack`) dans `~/.config/CASERNE.md` au format ci-dessus. Pas de dépendance au chantier Setup.

## Impacts & dette (suivi)

- **Hook projet de ce matin** (`erom-agence-plugin/.claude/settings.json`) : devient redondant -> à retirer quand le hook plugin atterrit, sinon double injection dans ce dossier.
- **`erom-linear`/`erom-slack` du plugin** : déjà retirés (2026-06-01). Le global `~/.claude` reste intact (runtime actuel) et n'est pas touché.
- **Table de formatting Slack** : a quitté le plugin avec `erom-slack`, à recaser au chantier Consolidation.
- **Références prose** à `erom-linear`/`erom-slack` dans `erom-handoff`/`erom-inbox`/`erom-agence-onboarding` : à rafraîchir au chantier Consolidation.

## Points à vérifier à l'implémentation

- **Mécanisme exact des hooks de plugin Claude Code** : déclaration (`hooks/hooks.json` ou dans `plugin.json`), résolution du chemin via `${CLAUDE_PLUGIN_ROOT}`, cwd d'exécution. À confirmer dans la doc Claude Code (détail récent, ne pas présumer).
- **`erom_agence.sh`** : l'existant vit dans `claude-agence-plugin/scripts/` et fait la détection d'agent (`$EROM_AGENCE_HOME`). Décider si le hook = ce script déplacé/enrichi dans `hooks/`, ou un script de hook distinct qui réutilise la détection.
- **Pas de repo git** sur `claude-agence-plugin/` ni à la racine -> le design doc et les fichiers ne peuvent pas être commités pour l'instant.

## Critères de succès

- `~/.config/CASERNE.md` existe, contient les IDs infra (agents, Linear team/statuts/labels/projets, Slack channels), **zéro secret, zéro par-projet**.
- Au démarrage d'une session Claude (plugin activé), le contexte contient l'en-tête self correct (agent courant + ses IDs) **et** le corps de `CASERNE.md`.
- Pas de double injection (hook projet retiré).
- Une op Slack/Linear récupère les IDs **sans** invoquer `erom-linear`/`erom-slack`.

## Addendum - 2026-06-02 - Étage projet : `_memory_/ONBOARD.md`

La décision #3 ci-dessus excluait volontairement le par-projet de `CASERNE.md` en le laissant « dans le `CLAUDE.md` du projet » (cf. lignes 29 et 97). **Cette dernière partie est révisée.** `CLAUDE.md` est spécifique à Claude, donc incompatible avec la distribution multi-agents (Gemini lit `GEMINI.md`, Codex `AGENTS.md`) : les IDs par-projet ne peuvent pas vivre dans un fichier dont le nom dépend de l'agent.

**Décision** : modèle de référence d'IDs à **deux étages**, tous deux injectés par le même hook SessionStart (`caserne_session_start.sh`) :

| Étage | Fichier | Portée | Balise injectée |
|-------|---------|--------|-----------------|
| Agence | `~/.config/CASERNE.md` | infra stable, cross-projet (inchangé) | `<caserne-self>` + dump |
| **Projet** | `<repo>/_memory_/ONBOARD.md` | Linear project + canal Slack du repo | `<caserne-project>` |

Le fichier projet est neutre (aucun préfixe d'agent), committé avec le repo, et porte le bloc qu'écrivait déjà l'onboarding :

```markdown
## <slug> - Onboarding (eRom)

| Cible | Référence |
|-------|-----------|
| Linear Project | `<linear_project_id>` (team EAT) |
| Slack | `#<slug>` (`<slack_channel_id>`) |
```

**Conséquences (commit `5fa8980`)** :
- `caserne_session_start.sh` : après le dump de `CASERNE.md`, détecte la racine repo et `cat` `<repo>/_memory_/ONBOARD.md` sous `<caserne-project>` (no-op hors repo / si absent).
- `erom-agence-onboarding` : écrit `_memory_/ONBOARD.md` au lieu de merger dans `CLAUDE.md` (fin de la « merge intelligente », idempotence = existe/pas) + **migration one-shot** du bloc legacy encore présent dans `CLAUDE.md`.
- `erom-inbox` / `erom-session-checkpoint` : lisent l'identité projet dans le contexte injecté (plus de `git rev-parse` + grep + regex UUID).
- `erom-session-end` : suppression du pointeur lazy vers `CLAUDE.md`.

**Migration** : un projet déjà onboardé garde son bloc dans `CLAUDE.md` jusqu'au prochain run de `/erom-agence-onboarding`, qui le déplace vers `_memory_/ONBOARD.md` et le retire de `CLAUDE.md` (sans toucher aux autres sections). Tant que la migration n'a pas eu lieu, `<caserne-project>` n'est pas injecté et `erom-inbox` invite à relancer l'onboarding.

**Reste à faire** : propager aux variantes générées (Antigravity/Codex) via le transpileur (chantier #4) - leurs hooks équivalents devront injecter le même fichier projet.
