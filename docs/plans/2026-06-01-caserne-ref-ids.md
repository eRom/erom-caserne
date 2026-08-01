# Référentiel d'IDs CASERNE.md - Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centraliser les IDs stables de l'agence eRom dans un fichier neutre `~/.config/CASERNE.md`, injecté en contexte à chaque démarrage de session via un hook fourni par le plugin caserne, avec l'identité de l'agent courant résolue à l'injection.

**Architecture:** Un fichier de données local (`~/.config/CASERNE.md`) + un hook SessionStart du plugin (`hooks/hooks.json`) qui lance un script (`hooks/caserne_session_start.sh`). Le script réutilise le détecteur d'agent existant (`hooks/erom_agence.sh`), extrait la ligne self depuis le fichier (DRY), et écrit en-tête + contenu sur stdout (injecté tel quel par Claude Code).

**Tech Stack:** Bash (hook + script), JSON (déclaration hook). Mécanisme des hooks de plugin vérifié contre la doc Claude Code du 2026-05-30 : déclaration dans `hooks/hooks.json`, variable `${CLAUDE_PLUGIN_ROOT}` disponible, stdout d'un hook SessionStart injecté comme contexte (echo/cat suffit, pas de JSON requis).

**Référence spec:** `docs/specs/2026-06-01-caserne-ref-ids-design.md`

---

## Pré-requis & contraintes

- **Pas de versioning git** : ni la racine `erom-agence-plugin/` ni `claude-agence-plugin/` ne sont des repos. Les étapes de commit sont donc remplacées par des **checkpoints de vérification**. Le chantier sera committé d'un bloc quand la décision repo (monorepo vs 3 repos) sera prise, hors de ce plan.
- **Source des valeurs** : les IDs ci-dessous sont repris du global `~/.claude/skills/erom-linear` + `erom-slack` (source canonique tant que le setup agence n'automatise pas la génération).
- **Ne pas toucher** `~/.claude/skills/` (instruction Romain).

## File Structure

- Create: `~/.config/CASERNE.md` - le référentiel d'IDs (données, local, non distribué).
- Create: `claude-agence-plugin/hooks/hooks.json` - déclaration du hook SessionStart du plugin.
- Create: `claude-agence-plugin/hooks/caserne_session_start.sh` - script d'injection (identité + contenu).
- Create: `claude-agence-plugin/hooks/caserne_session_start.test.sh` - test du script.
- Reuse (inchangé): `claude-agence-plugin/hooks/erom_agence.sh` - détecteur d'agent existant.
- Remove: le hook SessionStart dans `erom-agence-plugin/.claude/settings.json` (redondant une fois le hook plugin actif).

---

### Task 1: Créer le référentiel `~/.config/CASERNE.md`

**Files:**
- Create: `~/.config/CASERNE.md`

- [ ] **Step 1: Écrire le fichier avec le contenu complet**

Écrire `~/.config/CASERNE.md` (créer `~/.config/` si absent) avec exactement :

```markdown
# CASERNE - Contexte agence eRom

<!-- Référentiel d'IDs stables de l'agence. Injecté en contexte au démarrage.
     Source de vérité unique. Ni secrets (= variables d'env), ni IDs par-projet (= CLAUDE.md du projet). -->

## Agents
| Agent  | Slack ID    | Linear ID                            | Email                           |
|--------|-------------|--------------------------------------|---------------------------------|
| Claude | U0CLAUDE000 | 00000000-0000-4000-8000-000000000006 | agent-claude@example.com |
| Codex  | U0CODEX0000 | 00000000-0000-4000-8000-000000000007 | agent-codex@example.com  |
| Gemini | U0GEMINI000 | 00000000-0000-4000-8000-000000000008 | agent-avy@example.com    |
| Romain | U0HUMAN0000 | 00000000-0000-4000-8000-000000000009 | owner@example.com        |

## Linear - workspace eRom (linear.app/erom)
- Team : eRom-Agents - key `EAT` - `00000000-0000-4000-8000-000000000001`
- Workflow Issues : Backlog -> Todo -> Specification -> Implementation -> Done
- Workflow Projects : Backlog -> Planned -> In Progress -> Completed

| Statut         | ID                                   | Type      |
|----------------|--------------------------------------|-----------|
| Backlog        | 00000000-0000-4000-8000-000000000010 | backlog   |
| Todo           | 00000000-0000-4000-8000-000000000004 | unstarted |
| Specification  | 00000000-0000-4000-8000-000000000011 | started   |
| Implementation | 00000000-0000-4000-8000-000000000012 | started   |
| Done           | 00000000-0000-4000-8000-000000000005 | completed |
| Canceled       | 00000000-0000-4000-8000-000000000013 | canceled  |
| Duplicate      | 00000000-0000-4000-8000-000000000014 | duplicate |

| Label   | ID                                   |
|---------|--------------------------------------|
| PLAN OK | 00000000-0000-4000-8000-000000000015 |
| SPEC OK | 00000000-0000-4000-8000-000000000016 |
| handoff | 00000000-0000-4000-8000-000000000003 |
| doc     | 00000000-0000-4000-8000-000000000017 |
| feature | 00000000-0000-4000-8000-000000000018 |
| bug     | 00000000-0000-4000-8000-000000000019 |

| Projet infra | ID                                   | Rôle                                   |
|--------------|--------------------------------------|----------------------------------------|
| Handoffs     | 00000000-0000-4000-8000-000000000002 | Transferts de contexte cross-agents    |


## Slack
| Canal     | Slack ID    | Description        |
|-----------|-------------|--------------------|
| #caserne  | C0CASERNE00 | Cross-projet global |

<!-- sections futures (hors scope ce chantier) : paths, préférences, persona partagée -->
```

- [ ] **Step 2: Vérifier le fichier**

Run:
```bash
test -f ~/.config/CASERNE.md && grep -c 'U0CLAUDE000\|00000000-0000-4000-8000-000000000001\|C0CASERNE00' ~/.config/CASERNE.md
```
Expected: sortie `3` (les 3 IDs sentinelles présents), exit 0.

- [ ] **Step 3: Garde-fou anti-secret**

Run:
```bash
grep -iE 'token|secret|api[_-]?key|xoxb' ~/.config/CASERNE.md && echo "FUITE" || echo "OK propre"
```
Expected: `OK propre` (aucun secret dans un fichier injecté en contexte).

---

### Task 2: Script d'injection `caserne_session_start.sh` (TDD)

**Files:**
- Create: `claude-agence-plugin/hooks/caserne_session_start.sh`
- Test: `claude-agence-plugin/hooks/caserne_session_start.test.sh`

- [ ] **Step 1: Écrire le test (échoue car script absent)**

Créer `claude-agence-plugin/hooks/caserne_session_start.test.sh` :

```bash
#!/usr/bin/env bash
# Test de caserne_session_start.sh : identité résolue + contenu injecté.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

tmp_home="$(mktemp -d)"
trap 'rm -rf "$tmp_home"' EXIT
mkdir -p "$tmp_home/.config"
cat > "$tmp_home/.config/CASERNE.md" <<'EOF'
# CASERNE - test
## Agents
| Agent  | Slack ID    | Linear ID | Email |
| Claude | U0CLAUDE000 | 8500cb1a  | agent-claude@example.com |
EOF

# Simule une session Claude Code (CLAUDECODE=1) ; le plugin root = le dossier parent (hooks/..).
out="$(HOME="$tmp_home" CLAUDECODE=1 CLAUDE_PLUGIN_ROOT="$here/.." bash "$here/caserne_session_start.sh")"

fail() { echo "FAIL: $1"; exit 1; }
echo "$out" | grep -q '<caserne-self>'                 || fail "pas d'en-tête self"
echo "$out" | grep -qiE 'agent courant *: *claude'     || fail "agent non résolu"
echo "$out" | grep -q 'U0CLAUDE000'                     || fail "ligne self absente"
echo "$out" | grep -q '# CASERNE - test'                || fail "contenu non injecté"

# Cas fichier absent : sortie vide, exit 0.
empty_home="$(mktemp -d)"; trap 'rm -rf "$tmp_home" "$empty_home"' EXIT
out2="$(HOME="$empty_home" CLAUDECODE=1 CLAUDE_PLUGIN_ROOT="$here/.." bash "$here/caserne_session_start.sh")"
[ -z "$out2" ] || fail "devrait être silencieux sans CASERNE.md"

echo "PASS"
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `bash claude-agence-plugin/hooks/caserne_session_start.test.sh`
Expected: FAIL (le script `caserne_session_start.sh` n'existe pas encore -> erreur bash "No such file").

- [ ] **Step 3: Écrire le script**

Créer `claude-agence-plugin/hooks/caserne_session_start.sh` :

```bash
#!/usr/bin/env bash
# caserne_session_start.sh - Hook SessionStart du plugin caserne.
# Injecte l'identité de l'agent courant + le référentiel ~/.config/CASERNE.md.
# Tout le stdout est injecté comme contexte de session par Claude Code.
set -euo pipefail

CASERNE_FILE="$HOME/.config/CASERNE.md"

# Rien à injecter si le référentiel n'existe pas : sortie propre.
[ -f "$CASERNE_FILE" ] || exit 0

# Détection de l'agent courant : on exécute le détecteur (il imprime le home sur stdout).
agent_home="$(bash "${CLAUDE_PLUGIN_ROOT}/hooks/erom_agence.sh" 2>/dev/null || true)"
agent_dir="$(basename "${agent_home:-$HOME}")"   # .claude / .codex / .gemini / <home>
agent_key="${agent_dir#.}"                        # claude / codex / gemini / <home>

# Ligne self extraite de la table ## Agents (DRY : la source reste CASERNE.md).
self_line="$(grep -iE "^\|[[:space:]]*${agent_key}[[:space:]]*\|" "$CASERNE_FILE" 2>/dev/null || true)"

echo "<caserne-self>"
if [ -n "$self_line" ]; then
  echo "Agent courant : ${agent_key}. Ta ligne dans la table Agents :"
  echo "$self_line"
else
  echo "Agent courant : ${agent_key} (aucune ligne self trouvée dans CASERNE.md)."
fi
echo "</caserne-self>"
echo ""
cat "$CASERNE_FILE"
```

Puis rendre exécutables :
```bash
chmod +x claude-agence-plugin/hooks/caserne_session_start.sh claude-agence-plugin/hooks/caserne_session_start.test.sh
```

- [ ] **Step 4: Lancer le test pour le voir passer**

Run: `bash claude-agence-plugin/hooks/caserne_session_start.test.sh`
Expected: `PASS`

- [ ] **Step 5: Checkpoint** (pas de commit - voir Pré-requis)

Run: `ls -l claude-agence-plugin/hooks/`
Expected: `erom_agence.sh`, `caserne_session_start.sh` (exécutable), `caserne_session_start.test.sh` présents.

---

### Task 3: Déclarer le hook `hooks/hooks.json`

**Files:**
- Create: `claude-agence-plugin/hooks/hooks.json`

- [ ] **Step 1: Écrire la déclaration**

Créer `claude-agence-plugin/hooks/hooks.json` (matcher omis = se déclenche sur tous les SessionStart : startup, resume, clear ; comportement voulu pour avoir les IDs en permanence) :

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/caserne_session_start.sh"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Valider le JSON et la structure**

Run:
```bash
jq -e '.hooks.SessionStart[].hooks[] | select(.type=="command") | .command' claude-agence-plugin/hooks/hooks.json
```
Expected: imprime `"${CLAUDE_PLUGIN_ROOT}/hooks/caserne_session_start.sh"`, exit 0.

---

### Task 4: Retirer le hook projet redondant

**Files:**
- Modify/Remove: `erom-agence-plugin/.claude/settings.json` (hook SessionStart du matin, qui faisait `cat ~/.config/CASERNE.md` sans identité)

- [ ] **Step 1: Confirmer le contenu actuel**

Run: `cat .claude/settings.json`
Expected: un objet ne contenant que le hook SessionStart (`cat "$HOME/.config/CASERNE.md" ...`).

- [ ] **Step 2: Retirer le hook**

Le fichier ne contenant que ce hook, le ramener à un objet vide pour neutraliser la double injection (le hook plugin prend le relais, avec l'identité en plus). Écrire `.claude/settings.json` :

```json
{}
```

- [ ] **Step 3: Vérifier**

Run: `jq -e '.hooks.SessionStart // empty' .claude/settings.json; echo "exit=$?"`
Expected: aucune sortie + `exit=1` (plus de hook SessionStart au scope projet).

---

### Task 5: Vérification end-to-end (manuelle)

> Le déclenchement réel du hook se fait hors de cette session (au démarrage d'une session Claude avec le plugin chargé). Étapes manuelles pour Romain.

- [ ] **Step 1: Lancer une session avec le plugin chargé**

Run: `claude --plugin-dir /Users/x/dev/erom-agence-plugin/claude-agence-plugin`

- [ ] **Step 2: Confirmer l'injection**

Au démarrage, vérifier dans le contexte de session la présence de `<caserne-self>` avec `Agent courant : claude` + la ligne Claude, suivi du contenu de `CASERNE.md`. Et via `/hooks` : un `SessionStart` pointant sur `caserne_session_start.sh`.

- [ ] **Step 3: Confirmer l'absence de double injection**

Dans le dossier `erom-agence-plugin/`, vérifier que `CASERNE.md` n'apparaît qu'**une** fois (le hook projet est neutralisé).

---

## Self-Review

**Spec coverage** (vs `docs/specs/2026-06-01-caserne-ref-ids-design.md`) :
- Fichier `~/.config/CASERNE.md`, multi-sections, IDs infra, zéro secret/par-projet -> Task 1 (+ garde-fou anti-secret step 3).
- Injection au démarrage via hook plugin + `${CLAUDE_PLUGIN_ROOT}` -> Task 3.
- Self résolu à l'injection, sans deviner -> Task 2 (extraction de la ligne self).
- `erom_agence.sh` réutilisé tel quel (responsabilité unique) -> Task 2 step 3 (exécution, pas de modif).
- Génération v1 manuelle depuis le global -> Task 1.
- Retrait du hook projet (anti double-injection) -> Task 4.
- Critères de succès (en-tête self correct + contenu, pas de double injection, op sans skill référentiel) -> Task 5.

**Placeholder scan** : aucun TBD/TODO ; tout le contenu (CASERNE.md, script, test, JSON) est explicite.

**Type/nom consistency** : `caserne_session_start.sh` (script), `caserne_session_start.test.sh` (test), `EROM_AGENCE_HOME`/`agent_key` cohérents entre tasks ; `${CLAUDE_PLUGIN_ROOT}/hooks/...` identique en Task 2 et Task 3.

**Hors scope assumé** (autres chantiers) : hooks Codex/Gemini, automatisation de la génération du fichier, retrait des références prose à erom-linear/erom-slack, recasage du formatting Slack.
