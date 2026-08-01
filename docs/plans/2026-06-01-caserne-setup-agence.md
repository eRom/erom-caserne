# Setup agence (`erom-agence-setup`) - Implementation Plan

> ⚠️ **OBSOLÈTE - 2026-06-02.** La skill `erom-agence-setup` issue de ce plan a été **retirée** (discovery/réconciliation MCP pilotées par le LLM : non déterministe et coûteux pour du one-shot). Remplacée par un template `erom-agence-onboarding/references/CASERNE_TEMPLATE.md` rempli à la main (étape 0 de `erom-agence-onboarding`). `agency-model.yml` + `render_caserne.sh` supprimés. Voir le bandeau de la spec `2026-06-01-caserne-setup-agence-design.md`. Plan conservé comme archive.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le skill `erom-agence-setup` qui provisionne l'infra de l'agence (Linear/Slack, idempotent) et (re)génère `~/.config/CASERNE.md`.

**Architecture:** Skill agentique forké (`context: fork`, `agent: erom-builder`) calqué sur `erom-agence-onboarding` mais au niveau agence. Un modèle YAML embarqué (`agency-model.yml`) déclare la structure cible par rôle ; l'agent fait discovery/create via MCP puis exporte les IDs résolus dans des variables `CASERNE_*` et invoque un script de rendu déterministe et testé (`render_caserne.sh`) qui génère/merge CASERNE.md.

**Tech Stack:** Bash (`set -euo pipefail`, TDD bash comme le hook du chantier #1), YAML (donnée), Markdown (SKILL.md). Aucune dépendance runtime nouvelle.

**Spec :** `docs/specs/2026-06-01-caserne-setup-agence-design.md`. **Branche :** `feat/agence-setup`.

**Raffinements actés vs spec (cf. notes de handoff) :** (a) le « checkpoint » manuel = re-run idempotent, pas pause interactive (agent fork sans dialogue) ; (b) `Duplicate` → type `duplicate` ; (c) bloc géré entouré de marqueurs `<!-- CASERNE:BEGIN/END -->`, tables non-alignées.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `claude-agence-plugin/skills/erom-agence-setup/agency-model.yml` | Modèle embarqué : structure cible par rôle + noms par défaut + `creatable`. Donnée, lue par l'agent, réutilisée au #3. |
| `claude-agence-plugin/skills/erom-agence-setup/render_caserne.sh` | Rendu/merge déterministe de CASERNE.md depuis des variables `CASERNE_*`. Seule brique testable. |
| `claude-agence-plugin/skills/erom-agence-setup/render_caserne.test.sh` | Tests TDD bash de `render_caserne.sh` (génération, marqueur MANQUANT, merge). |
| `claude-agence-plugin/skills/erom-agence-setup/SKILL.md` | Procédure idempotente (charge → discovery → réconciliation → write → résumé). Frontmatter `agent: erom-builder`. |
| `claude-agence-plugin/agents/erom-builder.md` | **Modifié** : description élargie « projet + agence » + ancre d'idempotence générique. |

---

## Task 1: Modèle embarqué `agency-model.yml`

**Files:**
- Create: `claude-agence-plugin/skills/erom-agence-setup/references/agency-model.yml`

- [ ] **Step 1: Créer le dossier de la skill**

Run :
```bash
mkdir -p claude-agence-plugin/skills/erom-agence-setup
```

- [ ] **Step 2: Écrire `agency-model.yml`**

Create `claude-agence-plugin/skills/erom-agence-setup/references/agency-model.yml` :

```yaml
# agency-model.yml — Modèle d'agence caserne.
# Déclare des RÔLES sémantiques + des noms par défaut. Les IDs réels (résolus à la
# création/découverte) vivent dans ~/.config/CASERNE.md, jamais ici.
# Réutilisé au chantier #3 pour faire résoudre les skills par rôle au lieu d'IDs en dur.
version: 1

agents:
  # Agents IA supportés + owner humain. Emails / Slack ID / Linear ID sont propres à
  # chaque installation → découverts à l'exécution, pas déclarés ici.
  - {key: claude, role: agent}
  - {key: codex,  role: agent}
  - {key: gemini, role: agent}
  - {key: owner,  role: human}

linear:
  workspace:
    default_name: "eRom"
    default_url: "linear.app/erom"
  team:
    role: agency
    default_name: "eRom-Agents"
    default_key: "EAT"
    creatable: false        # pas d'outil MCP de création de team → guide manuel + découverte
  states:
    creatable: false        # workflow states custom non créables via MCP → guide manuel
    items:
      - {role: backlog,        default_name: "Backlog",        type: backlog}
      - {role: todo,           default_name: "Todo",           type: unstarted}
      - {role: specification,  default_name: "Specification",  type: started}
      - {role: implementation, default_name: "Implementation", type: started}
      - {role: done,           default_name: "Done",           type: completed}
      - {role: canceled,       default_name: "Canceled",       type: canceled}
      - {role: duplicate,      default_name: "Duplicate",      type: duplicate}
  labels:
    creatable: true          # créables via MCP create_issue_label
    items:
      - {role: plan-ok, default_name: "PLAN OK"}
      - {role: spec-ok, default_name: "SPEC OK"}
      - {role: handoff, default_name: "handoff"}
      - {role: doc,     default_name: "doc"}
      - {role: feature, default_name: "feature"}
      - {role: bug,     default_name: "bug"}
  projects:
    - {role: handoffs, default_name: "Handoffs", creatable: true, description: "Transferts de contexte cross-agents"}

slack:
  channels:
    - {role: agency, default_name: "caserne", creatable: true, description: "Cross-projet global"}
```

- [ ] **Step 3: Vérifier que le YAML est bien formé**

Run :
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('claude-agence-plugin/skills/erom-agence-setup/references/agency-model.yml')); print('YAML OK')"
```
Expected : `YAML OK` (exit 0). Si `python3` absent, fallback : `bunx js-yaml claude-agence-plugin/skills/erom-agence-setup/references/agency-model.yml >/dev/null && echo "YAML OK"`.

- [ ] **Step 4: Commit**

```bash
git add claude-agence-plugin/skills/erom-agence-setup/agency-model.yml
git commit -m "feat(#2): modele d'agence embarque (agency-model.yml)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `render_caserne.sh` - génération déterministe

Le script lit des variables `CASERNE_*` et écrit le CASERNE.md complet sur stdout. Listes indexées (`AGENT_1`, `AGENT_2`, …) ; la boucle s'arrête au premier index sans `*_LABEL`/`*_NAME`. Variable vide/absente → `⚠️ MANQUANT (créer manuellement)`. Cette task couvre la génération neuve (sans merge) ; le merge arrive en Task 3.

**Files:**
- Create: `claude-agence-plugin/skills/erom-agence-setup/render_caserne.test.sh`
- Create: `claude-agence-plugin/skills/erom-agence-setup/render_caserne.sh`

- [ ] **Step 1: Écrire le test (génération + marqueur MANQUANT)**

Create `claude-agence-plugin/skills/erom-agence-setup/render_caserne.test.sh` :

```bash
#!/usr/bin/env bash
# Tests TDD de render_caserne.sh. Aucun rm (règle projet) : les rares fichiers viennent
# de mktemp et restent dans TMPDIR, nettoyé par l'OS.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$here/render_caserne.sh"
fail=0
check() { # check <nom> <attendu_substring> <reçu>
  if printf '%s' "$3" | grep -qF -- "$2"; then echo "  ok   $1"; else echo "  FAIL $1"; echo "    attendu (substr): $2"; fail=1; fi
}

# Jeu de données compact : AGENT_2 sans LINEAR → doit rendre le marqueur MANQUANT.
run_fixture() (
  export CASERNE_WORKSPACE_NAME="eRom" CASERNE_WORKSPACE_URL="linear.app/erom"
  export CASERNE_TEAM_NAME="eRom-Agents" CASERNE_TEAM_KEY="EAT" CASERNE_TEAM_ID="team-1"
  export CASERNE_WORKFLOW_ISSUES="Backlog -> Todo -> Done" CASERNE_WORKFLOW_PROJECTS="Backlog -> Done"
  export CASERNE_AGENT_1_LABEL="Claude" CASERNE_AGENT_1_SLACK="U1" CASERNE_AGENT_1_LINEAR="L1" CASERNE_AGENT_1_EMAIL="claude@x.io"
  export CASERNE_AGENT_2_LABEL="Codex"  CASERNE_AGENT_2_SLACK="U2" CASERNE_AGENT_2_LINEAR=""   CASERNE_AGENT_2_EMAIL="codex@x.io"
  export CASERNE_STATE_1_NAME="Backlog" CASERNE_STATE_1_ID="s1" CASERNE_STATE_1_TYPE="backlog"
  export CASERNE_STATE_2_NAME="Done"    CASERNE_STATE_2_ID="s2" CASERNE_STATE_2_TYPE="completed"
  export CASERNE_LABEL_1_NAME="handoff" CASERNE_LABEL_1_ID="lab1"
  export CASERNE_PROJECT_1_NAME="Handoffs" CASERNE_PROJECT_1_ID="proj1" CASERNE_PROJECT_1_ROLE="Transferts cross-agents"
  export CASERNE_CHANNEL_1_NAME="caserne" CASERNE_CHANNEL_1_ID="C1" CASERNE_CHANNEL_1_DESC="Cross-projet global"
  bash "$script"
)

out="$(run_fixture)"
echo "[génération]"
check "marqueur BEGIN"        "<!-- CASERNE:BEGIN" "$out"
check "marqueur END"          "<!-- CASERNE:END -->" "$out"
check "titre workspace"       "# CASERNE - Contexte agence eRom" "$out"
check "ligne agent Claude"    "| Claude | U1 | L1 | claude@x.io |" "$out"
check "marqueur MANQUANT"     "| Codex | U2 | ⚠️ MANQUANT (créer manuellement) | codex@x.io |" "$out"
check "titre Linear"          "## Linear - workspace eRom (linear.app/erom)" "$out"
check "ligne Team"            "- Team : eRom-Agents - key \`EAT\` - \`team-1\`" "$out"
check "statut Done"           "| Done | s2 | completed |" "$out"
check "label handoff"         "| handoff | lab1 |" "$out"
check "projet Handoffs"       "| Handoffs | proj1 | Transferts cross-agents |" "$out"
check "canal caserne"         "| #caserne | C1 | Cross-projet global |" "$out"

[ "$fail" -eq 0 ] && echo "PASS" || { echo "FAIL"; exit 1; }
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run :
```bash
bash claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
```
Expected : échec (le script n'existe pas → `bash: ... render_caserne.sh: No such file or directory`, exit ≠ 0).

- [ ] **Step 3: Écrire `render_caserne.sh` (génération seule)**

Create `claude-agence-plugin/skills/erom-agence-setup/render_caserne.sh` :

```bash
#!/usr/bin/env bash
# render_caserne.sh — Rend ~/.config/CASERNE.md de façon déterministe depuis des variables CASERNE_*.
# Listes indexées (AGENT_1, AGENT_2, … ; STATE_1, … ; LABEL_1, … ; PROJECT_1, … ; CHANNEL_1, …).
# La boucle s'arrête au premier index sans *_LABEL/*_NAME. Variable vide/absente → marqueur MANQUANT.
#
# Usage :  [CASERNE_* …] render_caserne.sh [chemin_existant]
#   (le merge avec un fichier existant est ajouté en Task 3 ; ici, génération neuve uniquement)
# Sortie : CASERNE.md complet sur stdout.
set -euo pipefail

BEGIN_MARK='<!-- CASERNE:BEGIN — bloc géré par erom-agence-setup, ne pas éditer à la main -->'
END_MARK='<!-- CASERNE:END -->'
MISSING='⚠️ MANQUANT (créer manuellement)'

# v <NOM_VAR> → la valeur de la variable, ou le marqueur MANQUANT si vide/absente.
v() { local x="${!1:-}"; [ -n "$x" ] && printf '%s' "$x" || printf '%s' "$MISSING"; }

render_managed() {
  printf '%s\n' "$BEGIN_MARK"
  printf '# CASERNE - Contexte agence %s\n\n' "$(v CASERNE_WORKSPACE_NAME)"
  printf "<!-- Référentiel d'IDs stables de l'agence. Injecté en contexte au démarrage.\n"
  printf "     Source de vérité unique. Pas de jetons d'authentification (ils restent en variables d'environnement), pas d'IDs par-projet (= CLAUDE.md du projet). -->\n\n"

  printf '## Agents\n'
  printf '| Agent | Slack ID | Linear ID | Email |\n| --- | --- | --- | --- |\n'
  local i=1 var
  while var="CASERNE_AGENT_${i}_LABEL"; [ -n "${!var:-}" ]; do
    printf '| %s | %s | %s | %s |\n' "${!var}" \
      "$(v "CASERNE_AGENT_${i}_SLACK")" "$(v "CASERNE_AGENT_${i}_LINEAR")" "$(v "CASERNE_AGENT_${i}_EMAIL")"
    i=$((i+1))
  done

  printf '\n## Linear - workspace %s (%s)\n' "$(v CASERNE_WORKSPACE_NAME)" "$(v CASERNE_WORKSPACE_URL)"
  printf -- '- Team : %s - key `%s` - `%s`\n' "$(v CASERNE_TEAM_NAME)" "$(v CASERNE_TEAM_KEY)" "$(v CASERNE_TEAM_ID)"
  printf -- '- Workflow Issues : %s\n' "$(v CASERNE_WORKFLOW_ISSUES)"
  printf -- '- Workflow Projects : %s\n\n' "$(v CASERNE_WORKFLOW_PROJECTS)"

  printf '| Statut | ID | Type |\n| --- | --- | --- |\n'
  i=1
  while var="CASERNE_STATE_${i}_NAME"; [ -n "${!var:-}" ]; do
    printf '| %s | %s | %s |\n' "${!var}" "$(v "CASERNE_STATE_${i}_ID")" "$(v "CASERNE_STATE_${i}_TYPE")"
    i=$((i+1))
  done

  printf '\n| Label | ID |\n| --- | --- |\n'
  i=1
  while var="CASERNE_LABEL_${i}_NAME"; [ -n "${!var:-}" ]; do
    printf '| %s | %s |\n' "${!var}" "$(v "CASERNE_LABEL_${i}_ID")"
    i=$((i+1))
  done

  printf '\n| Projet infra | ID | Rôle |\n| --- | --- | --- |\n'
  i=1
  while var="CASERNE_PROJECT_${i}_NAME"; [ -n "${!var:-}" ]; do
    printf '| %s | %s | %s |\n' "${!var}" "$(v "CASERNE_PROJECT_${i}_ID")" "$(v "CASERNE_PROJECT_${i}_ROLE")"
    i=$((i+1))
  done

  printf '\n## Slack\n| Canal | Slack ID | Description |\n| --- | --- | --- |\n'
  i=1
  while var="CASERNE_CHANNEL_${i}_NAME"; [ -n "${!var:-}" ]; do
    printf '| #%s | %s | %s |\n' "${!var}" "$(v "CASERNE_CHANNEL_${i}_ID")" "$(v "CASERNE_CHANNEL_${i}_DESC")"
    i=$((i+1))
  done

  printf '%s\n' "$END_MARK"
}

render_managed
```

- [ ] **Step 4: Rendre exécutables, relancer le test, vérifier qu'il passe**

Run :
```bash
chmod +x claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.sh claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
bash claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
```
Expected : toutes les lignes `ok …` puis `PASS` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.sh claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
git commit -m "feat(#2): render_caserne.sh - generation deterministe (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `render_caserne.sh` - mode merge (préserve les sections custom)

Si un CASERNE.md existant (passé en `$1`) contient les marqueurs, on remplace le bloc `BEGIN..END` et on **préserve tout le reste** (sections custom ajoutées par l'utilisateur, typiquement après `END`).

**Files:**
- Modify: `claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh`
- Modify: `claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.sh`

- [ ] **Step 1: Ajouter le test de merge**

Dans `render_caserne.test.sh`, insérer ce bloc juste avant la ligne finale `[ "$fail" -eq 0 ] && echo "PASS" …` :

```bash
echo "[merge]"
# Un CASERNE.md existant = sortie générée + une section custom après END.
existing="$(mktemp)"
{ run_fixture; printf '\n## Notes perso\nGardé entre deux runs.\n'; } > "$existing"
merged="$(
  export CASERNE_WORKSPACE_NAME="eRom" CASERNE_WORKSPACE_URL="linear.app/erom"
  export CASERNE_TEAM_NAME="eRom-Agents" CASERNE_TEAM_KEY="EAT" CASERNE_TEAM_ID="team-1"
  export CASERNE_WORKFLOW_ISSUES="Backlog -> Todo -> Done" CASERNE_WORKFLOW_PROJECTS="Backlog -> Done"
  export CASERNE_AGENT_1_LABEL="Claude" CASERNE_AGENT_1_SLACK="U1" CASERNE_AGENT_1_LINEAR="L1" CASERNE_AGENT_1_EMAIL="claude@x.io"
  export CASERNE_STATE_1_NAME="Backlog" CASERNE_STATE_1_ID="s1" CASERNE_STATE_1_TYPE="backlog"
  export CASERNE_LABEL_1_NAME="handoff" CASERNE_LABEL_1_ID="lab1"
  export CASERNE_PROJECT_1_NAME="Handoffs" CASERNE_PROJECT_1_ID="proj1" CASERNE_PROJECT_1_ROLE="Transferts cross-agents"
  export CASERNE_CHANNEL_1_NAME="caserne" CASERNE_CHANNEL_1_ID="C1" CASERNE_CHANNEL_1_DESC="Cross-projet global"
  bash "$script" "$existing"
)"
check "merge préserve la section custom" "## Notes perso" "$merged"
check "merge garde le contenu custom"    "Gardé entre deux runs." "$merged"
check "merge régénère le bloc géré"      "| Claude | U1 | L1 | claude@x.io |" "$merged"
check "merge : un seul bloc BEGIN"        "<!-- CASERNE:BEGIN" "$merged"
# Doit n'y avoir qu'UN bloc géré après merge (pas de duplication).
nb_begin="$(printf '%s\n' "$merged" | grep -cF '<!-- CASERNE:BEGIN')"
[ "$nb_begin" -eq 1 ] && echo "  ok   merge : exactement 1 marqueur BEGIN" || { echo "  FAIL merge : $nb_begin marqueurs BEGIN"; fail=1; }
```

- [ ] **Step 2: Lancer le test, vérifier que le merge échoue**

Run :
```bash
bash claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
```
Expected : la section `[merge]` échoue - le contenu custom n'est pas préservé (le script ignore `$1` et régénère à neuf), donc `## Notes perso` est absent de la sortie → `FAIL`.

- [ ] **Step 3: Ajouter la branche merge**

Dans `render_caserne.sh`, remplacer la dernière ligne `render_managed` par :

```bash
managed="$(render_managed)"
existing="${1:-}"
if [ -n "$existing" ] && [ -f "$existing" ] && grep -qF "$BEGIN_MARK" "$existing"; then
  # Remplace le bloc BEGIN..END par le bloc fraîchement rendu, préserve tout le reste.
  awk -v b="$BEGIN_MARK" -v e="$END_MARK" -v repl="$managed" '
    $0==b { print repl; skip=1; next }
    $0==e { skip=0; next }
    !skip { print }
  ' "$existing"
else
  printf '%s\n' "$managed"
fi
```

- [ ] **Step 4: Relancer le test, vérifier qu'il passe**

Run :
```bash
bash claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
```
Expected : toutes les lignes `ok …` (sections `[génération]` et `[merge]`) puis `PASS` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.sh claude-agence-plugin/skills/erom-agence-setup/scripts/render_caserne.test.sh
git commit -m "feat(#2): render_caserne.sh - merge preservant les sections custom (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `SKILL.md` - la procédure idempotente

**Files:**
- Create: `claude-agence-plugin/skills/erom-agence-setup/SKILL.md`

- [ ] **Step 1: Écrire le SKILL.md**

Create `claude-agence-plugin/skills/erom-agence-setup/SKILL.md` :

````markdown
---
name: erom-agence-setup
description: "Setup de l'agence eRom — provisionne Linear (team/states/labels/projet Handoffs) + Slack (#caserne), découvre les comptes agents, et (re)génère ~/.config/CASERNE.md. Idempotent."
user-invocable: true
disable-model-invocation: true
context: fork
agent: erom-builder
---

# Setup agence — écosystème eRom

Provisionne **l'agence** (le niveau au-dessus d'un projet) et produit le référentiel d'IDs `~/.config/CASERNE.md` injecté à chaque session. Idempotent : on lookup d'abord, on ne crée que ce qui manque, on guide à la main ce qui n'est pas automatisable.

À ne pas confondre avec `erom-agence-onboarding` (qui bootstrappe **un projet** et *consomme* les IDs d'agence). Ici on *produit* ces IDs.

## Pré-requis

- Un serveur MCP **Linear** actif et connecté au workspace cible.
- Un serveur MCP **Slack** actif et connecté au workspace cible.
- Le modèle `references/agency-model.yml` (dans le dossier de cette skill) décrit la structure cible.

## Portabilité cross-agents

Cette skill vit dans Claude Code, Codex et Gemini CLI — chacun nomme ses outils MCP différemment. Les appels sont décrits sous forme **logique** : `<MCP Linear>.list_teams`, `<MCP Slack>.list_channels`, etc. Charge à chaque agent de traduire vers le nom technique exact. Si un outil logique n'a pas d'équivalent, stoppe et signale-le proprement.

## Mode `--dry-run`

Si l'utilisateur dit "dry-run", "simulation", "sans rien créer" ou "à blanc" : déroule charge + discovery + diff, mais **n'appelle aucune API de création** et n'écris pas CASERNE.md. Affiche le résumé final avec `[DRY-RUN] would create/reuse/guide` devant chaque ressource.

## Le modèle (`agency-model.yml`)

Charge le fichier `references/agency-model.yml` du dossier de cette skill. Il déclare, par **rôle** : la team (`creatable: false`), les workflow states (`creatable: false`), les labels (`creatable: true`), le projet Handoffs (`creatable: true`), le channel d'agence (`creatable: true`), et la liste des agents. Le flag `creatable` tranche auto-create vs guide-manuel. Les noms `default_name` servent à matcher (discovery) et à créer (si absent).

## Workflow

### 1. Charge

Lis `agency-model.yml` (structure cible) et, s'il existe, `~/.config/CASERNE.md` (IDs déjà connus → guide d'idempotence). Si CASERNE.md contient déjà des IDs, les lookups distants servent à les **confirmer** (un projet peut avoir été supprimé, un channel archivé).

### 2. Discovery (lookups en parallèle, lecture seule)

Lance en parallèle (un seul message, plusieurs tool calls) :

| Cible | Appel | Critère "existe" |
|-------|-------|------------------|
| Team | `<MCP Linear>.list_teams` | match (case-insensitive) sur `key` = `default_key` ou `name` = `default_name` |
| States | `<MCP Linear>.list_issue_statuses` (team trouvée) | par `name` = `default_name` de chaque state |
| Labels | `<MCP Linear>.list_issue_labels` | par `name` = `default_name` de chaque label |
| Projet | `<MCP Linear>.list_projects` (team) | match exact (case-insensitive) sur `name` = `Handoffs` |
| Channel | `<MCP Slack>.list_channels` (query `caserne`) | match exact sur `name` |
| Agents | `<MCP Slack>.list_users` + `<MCP Linear>.list_users` | cf. §4 |

Note chaque ressource `présente (id)` / `manquante`.

### 3. Réconciliation (selon `creatable`)

Pour chaque ressource **manquante** :

- **`creatable: true`** → crée via MCP, capture l'ID :
  - Projet : `<MCP Linear>.save_project` `{name: "Handoffs", team: <team>, state: backlog, description: "Transferts de contexte cross-agents"}`.
  - Labels : `<MCP Linear>.create_issue_label` `{name: <default_name>, team: <team>}` pour chaque label absent.
  - Channel : `<MCP Slack>.create_channel` `{name: "caserne", is_private: false}` (ou `slack_setup_project_channel` si exposé).
- **`creatable: false`** (team, states) → **ne crée pas**. Ajoute une entrée dans la liste « actions manuelles » du résumé final, avec l'instruction précise (ex. « Créer la team Linear `eRom-Agents` (key EAT) », « Créer les workflow states : Specification, Implementation »). L'ID restera `⚠️ MANQUANT` dans CASERNE.md jusqu'au prochain run.

> **Pas de pause interactive.** L'agent est forké et ne dialogue pas. Le « guide » se matérialise dans le résumé + les marqueurs `⚠️ MANQUANT` ; l'utilisateur fait les actions manuelles puis **relance la skill** (idempotente) qui les découvre alors et complète CASERNE.md.

### 4. Résolution des comptes agents

Pour chaque agent du modèle (`claude`, `codex`, `gemini`, `owner`) :
- Cherche un user Slack et un user Linear dont l'email ou le nom contient la clé d'agent (`claude`/`codex`/`gemini`) ou, pour `owner`, l'humain propriétaire.
- Si un seul candidat plausible → capture `Slack ID`, `Linear ID`, `email`. Sinon → laisse `⚠️ MANQUANT` (sera résolu à un run ultérieur, une fois les comptes créés).
- Le label de ligne est `Claude`/`Codex`/`Gemini` pour les agents IA ; pour `owner`, le nom réel découvert (ex. `Romain`).
- **Ne crée jamais** de compte / email / invitation.

### 5. Write — génération de CASERNE.md

Exporte les IDs résolus dans des variables `CASERNE_*` puis invoque le script de rendu déterministe `render_caserne.sh` (dans le dossier de cette skill) :

```bash
CASERNE_WORKSPACE_NAME=… CASERNE_WORKSPACE_URL=… \
CASERNE_TEAM_NAME=… CASERNE_TEAM_KEY=… CASERNE_TEAM_ID=… \
CASERNE_WORKFLOW_ISSUES=… CASERNE_WORKFLOW_PROJECTS=… \
CASERNE_AGENT_1_LABEL=Claude CASERNE_AGENT_1_SLACK=… CASERNE_AGENT_1_LINEAR=… CASERNE_AGENT_1_EMAIL=… \
… (AGENT_2 Codex, AGENT_3 Gemini, AGENT_4 = owner) \
CASERNE_STATE_1_NAME=Backlog CASERNE_STATE_1_ID=… CASERNE_STATE_1_TYPE=backlog \
… (STATE_2..7) \
CASERNE_LABEL_1_NAME="PLAN OK" CASERNE_LABEL_1_ID=… … (LABEL_2..6) \
CASERNE_PROJECT_1_NAME=Handoffs CASERNE_PROJECT_1_ID=… CASERNE_PROJECT_1_ROLE="Transferts de contexte cross-agents" \
CASERNE_CHANNEL_1_NAME=caserne CASERNE_CHANNEL_1_ID=… CASERNE_CHANNEL_1_DESC="Cross-projet global" \
bash <dossier-skill>/scripts/render_caserne.sh "$HOME/.config/CASERNE.md" > /tmp/caserne.new \
  && mkdir -p "$HOME/.config" && mv /tmp/caserne.new "$HOME/.config/CASERNE.md"
```

**Contrat de variables** (laisser une variable vide → le script écrit `⚠️ MANQUANT (créer manuellement)`) :

| Bloc | Variables |
|------|-----------|
| Workspace | `CASERNE_WORKSPACE_NAME`, `CASERNE_WORKSPACE_URL` |
| Team | `CASERNE_TEAM_NAME`, `CASERNE_TEAM_KEY`, `CASERNE_TEAM_ID` |
| Workflows (lignes descriptives) | `CASERNE_WORKFLOW_ISSUES`, `CASERNE_WORKFLOW_PROJECTS` |
| Agents (i = 1..N) | `CASERNE_AGENT_i_LABEL`, `_SLACK`, `_LINEAR`, `_EMAIL` |
| States (i = 1..N) | `CASERNE_STATE_i_NAME`, `_ID`, `_TYPE` |
| Labels (i = 1..N) | `CASERNE_LABEL_i_NAME`, `_ID` |
| Projets (i = 1..N) | `CASERNE_PROJECT_i_NAME`, `_ID`, `_ROLE` |
| Channels (i = 1..N) | `CASERNE_CHANNEL_i_NAME`, `_ID`, `_DESC` |

Le script préserve toute section custom hors des marqueurs `<!-- CASERNE:BEGIN/END -->`. En `--dry-run`, n'exécute pas cette étape (affiche seulement le diff).

### 6. Résumé final

Affiche ce format (statut par ressource + section « actions manuelles » si des `creatable: false` manquent encore) :

```
Setup agence (workspace <name>) :

linear.team     : MANUEL (à créer)  → eRom-Agents (EAT)
linear.states   : MANUEL (à créer)  → Specification, Implementation
linear.labels   : OK (created)      → 6/6
linear.projet   : OK (reused)       → Handoffs <id>
slack.channel   : OK (created)      → #caserne <id>
agents          : OK (3/4 résolus)  → owner ⚠️ MANQUANT
caserne.md      : OK (merged)       → ~/.config/CASERNE.md

Actions manuelles restantes :
- Créer la team Linear « eRom-Agents » (key EAT), puis relancer cette skill.
- Ajouter les workflow states « Specification », « Implementation » à la team.
```

En `--dry-run`, préfixe chaque ligne par `[DRY-RUN]` (`would create` / `would reuse` / `would guide`).

## Comportement attendu sur ré-exécution

- Tous les lookups trouvent les ressources existantes → `reused` partout.
- Aucune création tentée ; aucune action manuelle restante une fois l'infra complète.
- CASERNE.md touché seulement si un ID a changé ou si un `⚠️ MANQUANT` est désormais résolu.
- Les sections custom de CASERNE.md sont toujours préservées (marqueurs).

## Gestion des erreurs

- **MCP Linear ou Slack indisponible** → indique précisément laquelle est down, stoppe avant toute écriture de CASERNE.md (pas de fichier à moitié écrit). L'idempotence repassera au prochain run.
- **Plusieurs candidats** pour une ressource (deux teams, deux channels homonymes) → ne devine pas : laisse `⚠️ MANQUANT` et mentionne l'ambiguïté dans les actions manuelles.

## Pourquoi cette skill existe

Les IDs d'agence (team, states, labels, projet Handoffs, channel, comptes agents) sont la fondation que toutes les autres skills consomment. Les centraliser dans `~/.config/CASERNE.md` via un setup idempotent permet (a) à Romain de régénérer/maintenir son référentiel sans copier-coller d'IDs, (b) à un nouvel utilisateur open-source de bootstrapper une agence fonctionnelle. Le modèle embarqué garantit que l'agence créée a exactement la structure dont les skills ont besoin.
````

- [ ] **Step 2: Vérifier le frontmatter (cohérence avec erom-agence-onboarding)**

Run :
```bash
head -8 claude-agence-plugin/skills/erom-agence-setup/SKILL.md
```
Expected : un frontmatter YAML avec `name: erom-agence-setup`, `user-invocable: true`, `disable-model-invocation: true`, `context: fork`, `agent: erom-builder`.

- [ ] **Step 3: Commit**

```bash
git add claude-agence-plugin/skills/erom-agence-setup/SKILL.md
git commit -m "feat(#2): SKILL.md erom-agence-setup (procedure idempotente)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Élargir `erom-builder` à « projet + agence »

L'agent `erom-builder` est réutilisé par `erom-agence-setup`. Trois retouches **chirurgicales** pour qu'il ne soit plus strictement « projet ».

**Files:**
- Modify: `claude-agence-plugin/agents/erom-builder.md`

- [ ] **Step 1: Élargir la description (frontmatter, ligne 3)**

Edit — remplacer exactement :
```
description: Orchestrateur d'init projet eRom (onboarding) - écrit fichiers + commits. Ne pas utiliser pour déléguer librement, réservé au champ `agent:` des skills.
```
par :
```
description: Orchestrateur d'init eRom (onboarding projet + setup agence) - écrit fichiers + commits. Ne pas utiliser pour déléguer librement, réservé au champ `agent:` des skills.
```

- [ ] **Step 2: Élargir la phrase d'intro (ligne 8)**

Edit — remplacer exactement :
```
Tu exécutes une tâche d'orchestration eRom (bootstrap projet) passée par une skill forkée.
```
par :
```
Tu exécutes une tâche d'orchestration eRom (bootstrap projet ou setup agence) passée par une skill forkée.
```

- [ ] **Step 3: Généraliser l'ancre d'idempotence (ligne 12)**

Edit — remplacer exactement :
```
Tu hérites de tous les outils : `Bash`, `Read`, `Write`, `Edit` et les MCP Linear / Slack. Tu charges le CLAUDE.md du projet courant — utilise-le comme ancre d'idempotence.
```
par :
```
Tu hérites de tous les outils : `Bash`, `Read`, `Write`, `Edit` et les MCP Linear / Slack. Tu charges le fichier d'ancre indiqué par la skill (CLAUDE.md du projet, ou ~/.config/CASERNE.md pour le setup agence) — utilise-le comme ancre d'idempotence.
```

- [ ] **Step 4: Vérifier que rien d'autre n'a bougé**

Run :
```bash
git diff --stat claude-agence-plugin/agents/erom-builder.md
```
Expected : `1 file changed, 3 insertions(+), 3 deletions(-)` (trois lignes modifiées, rien d'autre).

- [ ] **Step 5: Commit**

```bash
git add claude-agence-plugin/agents/erom-builder.md
git commit -m "feat(#2): erom-builder couvre projet + agence" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Validation différée (hors plan, comme le chantier #1)

La validation end-to-end réelle (lancer `erom-agence-setup` avec les MCP Linear/Slack actifs, vérifier le CASERNE.md produit) nécessite d'**installer le plugin**. Comme pour le hook du #1, elle est **différée** jusqu'à l'installation. Le `render_caserne.test.sh` couvre la seule brique déterministe ; le reste (discovery/create MCP) se valide à l'install via `--dry-run` puis run réel.

## Notes de fin

À la complétion des 5 tasks : `superpowers:finishing-a-development-branch` pour clôturer `feat/agence-setup` (vérifier les tests, présenter les options de merge).
