# Consolidation (résolution des IDs par rôle) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire résoudre par rôle (depuis `CASERNE.md`) les IDs d'agence aujourd'hui gelés en dur dans `erom-handoff`, `erom-inbox`, `erom-agence-onboarding`, et retirer toute référence aux skills perso `erom-linear`/`erom-slack`, pour rendre le plugin autosuffisant chez un utilisateur tiers.

**Architecture:** Chantier 100 % éditorial sur 3 fichiers `SKILL.md` du plugin maître. Résolution en **prose agentique** : chaque skill lit les IDs dans `CASERNE.md` (injecté au SessionStart par le hook du #1 ; à défaut `Read ~/.config/CASERNE.md`). Pour `erom-handoff` (5 rôles), un **bloc « Container - résolu depuis CASERNE.md » en tête** liste les rôles une fois ; le corps réfère ensuite chaque ID par nom parlant. Pour `erom-inbox`, le Slack ID de l'agent courant est déjà servi par le hook dans le bloc `<caserne-self>`. Pour `erom-agence-onboarding`, la team d'agence se résout inline.

**Tech Stack:** Markdown (skills Claude Code). Aucune compilation, aucun test unitaire - vérification par `grep` de non-régression.

**Référence de format CASERNE.md** (produit par le #2, à ne PAS modifier) : sections `## Agents` (table `| Agent | Slack ID | Linear ID | Email |`, 1ʳᵉ colonne = clé d'agent), `## Linear` (ligne team `key + ID`, puis tables Statuts / Labels / Projets, chacune avec colonne ID), `## Slack`.

---

## File Structure

| Fichier | Responsabilité | Nature du changement |
|---|---|---|
| `claude-agence-plugin/skills/erom-handoff/SKILL.md` | Transfert de contexte (issue Linear) | Remplace la table de 5 UUID + note `erom-linear` par un bloc de résolution par rôle ; réécrit les 5 appels MCP |
| `claude-agence-plugin/skills/erom-inbox/SKILL.md` | Vue inbox projet (Linear + Slack) | Retire `erom-linear`/`erom-slack` + le Slack ID gelé + la table des 3 agents ; pointe vers CASERNE.md / bloc `<caserne-self>` |
| `claude-agence-plugin/skills/erom-agence-onboarding/SKILL.md` | Bootstrap d'un projet | Retire le lien wiki `[[erom-linear]]`/`[[erom-slack]]` ; résout la team d'agence depuis CASERNE.md dans les 2 appels Linear |

Chaque tâche est un fichier indépendant → commit par fichier. La tâche 4 est la vérification transverse finale.

---

## Task 1: erom-handoff - résolution par rôle des 5 IDs

**Files:**
- Modify: `claude-agence-plugin/skills/erom-handoff/SKILL.md`

- [ ] **Step 1: Remplacer la section « Container » (note erom-linear + table UUID) par le bloc de résolution**

Remplace ce bloc exact (lignes 13-25)…

````markdown
## Container (immuable, IDs hardcodés)

Source de vérité des IDs : skill `erom-linear`. Recopiés ici pour autonomie (le container ne bouge jamais). S'ils changent un jour, les mettre à jour ici **et** dans `erom-linear`.

| Champ | Nom | ID (à passer au MCP) |
|---|---|---|
| team | eRom-Agents (`EAT`) | `00000000-0000-4000-8000-000000000001` |
| project | Handoffs | `00000000-0000-4000-8000-000000000002` |
| label | handoff | `00000000-0000-4000-8000-000000000003` |
| state initial | Todo | `00000000-0000-4000-8000-000000000004` |
| state final | Done | `00000000-0000-4000-8000-000000000005` |

Toutes les opérations passent par le connecteur Linear du compte Claude.ai, noté `<MCP Linear>.<tool>` (forme logique pour rester portable Claude/Codex/Gemini). Pas de MCP Linear local, pas de plugin.
````

…par ce nouveau bloc :

````markdown
## Container (résolu depuis CASERNE.md)

Les IDs d'agence vivent dans `CASERNE.md`, le référentiel injecté au démarrage de session (à défaut : `Read ~/.config/CASERNE.md`). **Au lancement, résous une fois ces rôles** depuis la section `## Linear` de CASERNE.md, puis réfère-les par nom dans les appels ci-dessous :

| Rôle | Où le lire dans CASERNE.md |
|---|---|
| team d'agence | ligne `team` de `## Linear` (clé + ID) |
| projet Handoffs | table Projets, ligne « Handoffs » (colonne ID) |
| label handoff | table Labels, ligne « handoff » (colonne ID) |
| state Todo (initial) | table Statuts, ligne « Todo » (colonne ID) |
| state Done (final) | table Statuts, ligne « Done » (colonne ID) |

Toutes les opérations passent par le connecteur Linear, noté `<MCP Linear>.<tool>` (forme logique pour rester portable Claude/Codex/Gemini). Pas de MCP Linear local, pas de plugin.
````

- [ ] **Step 2: Réécrire l'appel `save_issue` de création (lignes 65-74)**

Remplace ce bloc exact…

````markdown
4. Sur `o` :
   ```
   <MCP Linear>.save_issue({
     team:    "00000000-0000-4000-8000-000000000001",  // eRom-Agents
     project: "00000000-0000-4000-8000-000000000002",  // Handoffs
     title:   <title>,
     description: <content>,
     labels:  ["00000000-0000-4000-8000-000000000003"], // handoff
     state:   "00000000-0000-4000-8000-000000000004"     // Todo
   })
   ```
````

…par :

````markdown
4. Sur `o` :
   ```
   <MCP Linear>.save_issue({
     team:    <ID team d'agence>,    // résolu depuis CASERNE.md
     project: <ID projet Handoffs>,
     title:   <title>,
     description: <content>,
     labels:  [<ID label handoff>],
     state:   <ID state Todo>
   })
   ```
````

- [ ] **Step 3: Réécrire l'appel `list_issues` de listing (lignes 79-87)**

Remplace ce bloc exact…

````markdown
```
<MCP Linear>.list_issues({
  project: "00000000-0000-4000-8000-000000000002",  // Handoffs
  state:   "00000000-0000-4000-8000-000000000004",  // Todo
  orderBy: "createdAt"
})
```

Par défaut `state: Todo`. « tous » → omettre `state`. « les finis » → state Done (`00000000-0000-4000-8000-000000000005`).
````

…par :

````markdown
```
<MCP Linear>.list_issues({
  project: <ID projet Handoffs>,
  state:   <ID state Todo>,
  orderBy: "createdAt"
})
```

Par défaut `state: Todo`. « tous » → omettre `state`. « les finis » → state Done.
````

- [ ] **Step 4: Réécrire la recherche par titre dans « Reprendre » (ligne 103)**

Remplace cette ligne exacte…

```markdown
- Sinon, recherche par titre : `<MCP Linear>.list_issues({ project: "00000000-0000-4000-8000-000000000002", query: <titre>, limit: 5 })`.
```

…par :

```markdown
- Sinon, recherche par titre : `<MCP Linear>.list_issues({ project: <ID projet Handoffs>, query: <titre>, limit: 5 })`.
```

- [ ] **Step 5: Réécrire l'appel `save_issue` de libération (lignes 119-123)**

Remplace ce bloc exact…

````markdown
```
<MCP Linear>.save_issue({
  id:    "EAT-XXX",
  state: "00000000-0000-4000-8000-000000000005"  // Done
})
```
````

…par :

````markdown
```
<MCP Linear>.save_issue({
  id:    "EAT-XXX",
  state: <ID state Done>
})
```
````

- [ ] **Step 6: Mettre à jour la contrainte qui parle de « container hardcodé » (ligne 131)**

Remplace cette ligne exacte…

```markdown
- Ne dévie **jamais** du container (team/project/label hardcodés ci-dessus).
```

…par :

```markdown
- Ne dévie **jamais** du container (team/projet/label résolus depuis CASERNE.md ci-dessus).
```

- [ ] **Step 7: Vérifier qu'aucun ID gelé ne subsiste dans ce fichier**

Run:
```bash
grep -nE 'erom-linear|erom-slack|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' claude-agence-plugin/skills/erom-handoff/SKILL.md
```
Expected: **aucune ligne** (exit 1). Les seuls `EAT-XXX` restants sont des exemples d'affichage d'identifiers (légitimes, on les garde).

- [ ] **Step 8: Commit**

```bash
git add claude-agence-plugin/skills/erom-handoff/SKILL.md
git commit -m "refactor(handoff): résout les IDs d'agence par rôle depuis CASERNE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: erom-inbox - Slack ID de l'agent courant via le hook, refs CASERNE.md

**Files:**
- Modify: `claude-agence-plugin/skills/erom-inbox/SKILL.md`

- [ ] **Step 1: Remplacer la référence `erom-linear` du référentiel des statuts (ligne 63)**

Remplace cette ligne exacte…

```markdown
  (référentiel des statuts : skill `erom-linear`)
```

…par :

```markdown
  (référentiel des statuts : section `## Linear` de CASERNE.md)
```

- [ ] **Step 2: Réécrire l'appel Slack (nom d'outil logique + user_id résolu) (lignes 83-89)**

Remplace ce bloc exact…

````markdown
```
<MCP erom-slack>.slack_get_inbox({
  user_id:    "U0CLAUDE000",        // agent courant = Claude Agent (réf. skill erom-slack)
  channel_id: <CHANNEL_SLACK_ID>,   // restreint au canal du projet
  limit:      50
})
```
````

…par :

````markdown
```
<MCP Slack>.slack_get_inbox({
  user_id:    <Slack ID de l'agent courant>,  // fourni par le hook (bloc <caserne-self>)
  channel_id: <CHANNEL_SLACK_ID>,             // restreint au canal du projet
  limit:      50
})
```
````

- [ ] **Step 3: Remplacer la table prose des 3 agents par la résolution dynamique (ligne 91)**

Remplace cette ligne exacte…

```markdown
`user_id` = l'agent qui exécute la skill. Ici c'est la variante Claude → `U0CLAUDE000`. Pour les autres agents, voir la table de `erom-slack` (Codex `U0CODEX0000`, Gemini `U0GEMINI000`).
```

…par :

```markdown
`user_id` = l'agent qui exécute la skill. Son Slack ID est servi au démarrage dans le bloc `<caserne-self>` (la ligne de l'agent courant dans la table `## Agents` de CASERNE.md, colonne « Slack ID »). À défaut, lis-le directement dans cette table.
```

- [ ] **Step 4: Vérifier qu'aucun Slack ID gelé ni ref erom-* ne subsiste**

Run:
```bash
grep -nE 'erom-linear|erom-slack|U0[A-Z0-9]{8,}' claude-agence-plugin/skills/erom-inbox/SKILL.md
```
Expected: **aucune ligne** (exit 1).

- [ ] **Step 5: Commit**

```bash
git add claude-agence-plugin/skills/erom-inbox/SKILL.md
git commit -m "refactor(inbox): Slack ID de l'agent courant via le hook, refs vers CASERNE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: erom-agence-onboarding - team d'agence résolue depuis CASERNE.md

**Files:**
- Modify: `claude-agence-plugin/skills/erom-agence-onboarding/SKILL.md`

- [ ] **Step 1: Remplacer le lien wiki `[[erom-linear]]`/`[[erom-slack]]` (ligne 20)**

Remplace cette ligne exacte…

```markdown
- Avant tout appel Linear/Slack : consulter [[erom-linear]] et [[erom-slack]] pour les IDs
```

…par :

```markdown
- Avant tout appel Linear/Slack : les IDs d'agence (team, etc.) se lisent dans `CASERNE.md` (injecté au démarrage ; à défaut `Read ~/.config/CASERNE.md`)
```

- [ ] **Step 2: Résoudre la team dans le lookup Linear de la phase de découverte (ligne 74)**

Remplace cette ligne exacte (cellule du tableau de découverte)…

```markdown
| **Linear** | `<MCP Linear>.list_projects` filtré sur `team: "EAT"` | match exact (case-insensitive) sur `name` = `<slug>` |
```

…par :

```markdown
| **Linear** | `<MCP Linear>.list_projects` filtré sur la team d'agence (clé lue dans `## Linear` de CASERNE.md) | match exact (case-insensitive) sur `name` = `<slug>` |
```

- [ ] **Step 3: Résoudre la team dans la création Linear (lignes 95-100)**

Remplace ce bloc exact…

````markdown
#### Linear (si absent)
Appelle `<MCP Linear>.save_project` (ou `create_project` selon l'outil exposé) avec :
- `name`: `<slug>`
- `team`: `EAT`
- `state`: `backlog`
- `description`: une ligne contextuelle si l'utilisateur l'a fournie
````

…par :

````markdown
#### Linear (si absent)
Appelle `<MCP Linear>.save_project` (ou `create_project` selon l'outil exposé) avec :
- `name`: `<slug>`
- `team`: la team d'agence (clé/ID lus dans `## Linear` de CASERNE.md)
- `state`: `backlog`
- `description`: une ligne contextuelle si l'utilisateur l'a fournie
````

- [ ] **Step 4: Vérifier qu'aucune ref erom-* ne subsiste**

Run:
```bash
grep -nE 'erom-linear|erom-slack' claude-agence-plugin/skills/erom-agence-onboarding/SKILL.md
```
Expected: **aucune ligne** (exit 1). Note : les mentions illustratives « team EAT » dans les pré-requis (l.17), le template de sortie (l.194) et le frontmatter restent comme **exemples** chez Romain, au même titre que les `EAT-XXX` d'affichage de `erom-handoff` ; elles ne sont pas passées à un appel MCP.

- [ ] **Step 5: Commit**

```bash
git add claude-agence-plugin/skills/erom-agence-onboarding/SKILL.md
git commit -m "refactor(onboarding): résout la team d'agence depuis CASERNE.md, retire refs erom-linear/erom-slack

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Vérification transverse de non-régression

**Files:** (aucune modification attendue - vérification seule)

- [ ] **Step 1: Grep global sur tout le plugin**

Run:
```bash
grep -rnE 'erom-linear|erom-slack|U0[A-Z0-9]{8,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' --include='*.md' claude-agence-plugin/skills/
```
Expected: **aucune ligne** (exit 1). Si une ligne sort, c'est un ID/ref oublié → revenir à la tâche du fichier concerné.

- [ ] **Step 2: Relire que chaque rôle référencé existe dans le format CASERNE.md**

Vérification manuelle (lecture) : pour chaque rôle utilisé par les skills - team d'agence, projet Handoffs, label handoff, state Todo, state Done (handoff) ; Slack ID de l'agent courant (inbox) ; team d'agence (onboarding) - confirmer qu'il a un emplacement dans le format produit par le #2, décrit dans `docs/specs/2026-06-01-caserne-setup-agence-design.md` §6 (sections `## Agents` / `## Linear`).
Expected: tous les rôles ont une source. Aucun rôle orphelin.

- [ ] **Step 3: Vérifier l'arbre git propre**

Run:
```bash
git status --short
```
Expected: vide (les 3 commits des tâches 1-3 ont tout capturé).

---

## Self-Review

**Spec coverage** (vs `docs/specs/2026-06-01-caserne-consolidation-design.md`) :
- §4.1 erom-handoff (table UUID + note + 7 réutilisations) → Task 1 (steps 1-6). ✓
- §4.2 erom-inbox (erom-linear l.63, `<MCP erom-slack>` l.84, U0 l.85, table l.91) → Task 2 (steps 1-3). ✓
- §4.3 erom-agence-onboarding (wiki l.20, team l.74 + l.98-100) → Task 3 (steps 1-3). ✓
- §5 vérification (grep non-régression + cohérence rôle↔format) → Task 4. ✓
- §3 contrat de lecture uniforme → injecté dans chaque bloc réécrit (Task 1 step 1, Task 2 steps 2-3, Task 3 step 1). ✓

**Placeholder scan :** aucun « TBD/TODO ». Les `<ID …>` / `<Slack ID …>` ne sont pas des placeholders de plan mais la **forme cible voulue** (notation logique d'un ID résolu à l'exécution, cohérente avec les `<MCP Linear>` et `<CHANNEL_SLACK_ID>` déjà présents dans ces skills). ✓

**Consistency :** la notation `<ID team d'agence>`, `<ID projet Handoffs>`, `<ID label handoff>`, `<ID state Todo>`, `<ID state Done>`, `<Slack ID de l'agent courant>` est identique entre le bloc de résolution (Task 1 step 1) et les appels (steps 2-5). ✓
