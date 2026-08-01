# Chantier #3 - Consolidation (résolution des IDs par rôle) - Design

> Projet **caserne**. Chantier #3 sur 4. Dépend du #1 (référentiel `~/.config/CASERNE.md` + hook SessionStart) et du #2 (`erom-agence-setup` qui produit CASERNE.md). Précède le #4 (transpileur cross-agents).

**Statut :** design validé le 2026-06-01. Prochaine étape : plan d'implémentation (`writing-plans`).

---

## 1. Problème & positionnement

Les skills du plugin qui touchent Linear/Slack portent encore leurs IDs d'agence **en dur** ou via des **références à des skills perso** (`erom-linear`, `erom-slack`) qui vivent dans `~/.claude/skills/` et **ne sont pas distribuées**. Tant que c'est le cas, le plugin open-source est **cassé pour un utilisateur tiers** : les UUID pointent vers l'agence de Romain, et les renvois vers `erom-linear`/`erom-slack` tombent dans le vide.

Le #1 a produit le conteneur d'IDs (`~/.config/CASERNE.md`, injecté à chaque session). Le #2 a produit le mécanisme qui le remplit (`erom-agence-setup`). Le #3 **ferme la boucle** : il fait *consommer* ce référentiel par les skills, par **rôle sémantique**, au lieu d'IDs gelés. Critère de succès réel : **autosuffisance du plugin** - sa seule source d'IDs d'agence devient `CASERNE.md`.

## 2. Décisions de cadrage (validées)

| Axe | Décision |
|---|---|
| Mécanisme de résolution | **Prose agentique pure.** Le SKILL.md instruit l'agent de lire les IDs dans `CASERNE.md` (déjà injecté au SessionStart par le hook du #1 ; à défaut `Read ~/.config/CASERNE.md`). Pas de script, pas de helper - cohérent avec Simplicity First et le fait que le référentiel est déjà dans le contexte. |
| Structure dans chaque skill | **Bloc « Résolution des IDs » en tête** (option B). Un seul point de résolution liste les rôles à récupérer ; le corps du skill référence ensuite les rôles par **nom parlant** (`state Done`, `projet Handoffs`) au lieu d'UUID. |
| Périmètre | **3 skills exactement** : `erom-handoff`, `erom-inbox`, `erom-agence-onboarding`. Confirmé par grep exhaustif : aucune autre fuite d'UUID / `U0…` / `erom-linear` / `erom-slack` dans le plugin. |
| Formatting Slack | **Hors scope** (reporté - décision Romain). Aucun bloc de convention mrkdwn n'existe dans ces 3 skills de toute façon. |
| Modif du #2 / CASERNE.md | **Aucune.** Le format produit par le #2 couvre déjà tous les rôles requis. |

## 3. Le contrat de lecture (uniforme partout)

Formulation injectée dans chaque skill concernée :

> Les IDs d'agence se lisent dans `CASERNE.md` (injecté au démarrage de session ; à défaut `Read ~/.config/CASERNE.md`). Résous **par rôle** :
> - team d'agence → section `## Linear` (clé + ID) ;
> - workflow states / labels / projet → leurs tables respectives (colonne ID) ;
> - Slack ID de l'agent courant → table `## Agents` (ligne de l'agent que le hook a identifié).

Correspondance rôle → emplacement dans CASERNE.md (format figé au #2) :

| Rôle requis | Skill(s) consommatrice(s) | Emplacement CASERNE.md |
|---|---|---|
| team d'agence (clé + ID) | handoff, agence-onboarding | `## Linear` (ligne team) |
| projet Handoffs (ID) | handoff | table Projets |
| label handoff (ID) | handoff | table Labels |
| state Todo (ID) | handoff | table Statuts |
| state Done (ID) | handoff | table Statuts |
| Slack ID de l'agent courant | inbox | table `## Agents` |

Tous ces rôles existent déjà dans le format CASERNE.md du #2 - **aucune extension de format**.

## 4. Changements par skill

### 4.1 `erom-handoff`

C'est le cœur du chantier (5 UUID gelés + note « maintenir aussi dans `erom-linear` »).

- **Supprimer** la table d'UUID (l.19-23) et la note de source `erom-linear` (l.15).
- **Ajouter** un bloc *« Résolution des IDs »* en tête listant les rôles à récupérer depuis CASERNE.md : team d'agence, projet Handoffs, label handoff, state Todo (initial), state Done (final).
- **Réécrire** les appels MCP pour référencer les rôles par nom au lieu d'UUID :
  - `save_issue` de création (l.67-72) : team, projet Handoffs, label handoff, state Todo.
  - `list_issues` de listing (l.81-82) : projet Handoffs, state Todo.
  - mention textuelle « les finis » (l.87) : state Done.
  - `list_issues` recherche par titre (l.103) : projet Handoffs.
  - `save_issue` de libération (l.122) : state Done.

### 4.2 `erom-inbox`

Mélange déjà-dynamique (projet/channel lus du CLAUDE.md projet, **inchangés**) et hardcoding résiduel.

> **Maj 2026-06-02** : le « projet/channel lus du CLAUDE.md » a depuis migré vers `<repo>/_memory_/ONBOARD.md`, injecté par le hook sous `<caserne-project>` (étage projet, agnostique). Voir l'addendum de `docs/specs/2026-06-01-caserne-ref-ids-design.md` (commit `5fa8980`).

- `erom-linear` (l.63, référentiel des statuts) → renvoi vers `CASERNE.md`.
- `<MCP erom-slack>` (l.84) → `<MCP Slack>` (cohérence avec la convention d'outil logique du reste du plugin).
- `U0CLAUDE000` en dur (l.85) + table prose des 3 agents (l.91) → *« Slack ID de l'agent courant, lu dans la table `## Agents` de CASERNE.md »*. L'identité de l'agent courant est **déjà résolue par le hook du #1** (`erom_agence.sh`) ; la skill prend simplement la ligne correspondante. Cela supprime à la fois l'ID gelé et la table des variantes (le bon agent est déterminé, plus énuméré).

### 4.3 `erom-agence-onboarding`

- Lien wiki `[[erom-linear]]`/`[[erom-slack]]` (l.20) → *« consulter `CASERNE.md` pour les IDs d'agence »*.
- team `"EAT"` en dur (l.74 lookup, l.98-100 création) → *« team d'agence (clé/ID lus dans CASERNE.md) »*. `"EAT"` est le `default_name` chez Romain ; un utilisateur tiers a sa propre clé, d'où la résolution dynamique.

## 5. Vérification

Chantier **100 % éditorial** sur des fichiers `.md` : pas de code exécutable → pas de TDD bash, pas de nouvel eval. Garde-fous de complétude :

1. **Grep de non-régression** : après modifs, `grep -rEn 'erom-linear|erom-slack|U0[A-Z0-9]{8,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'` sur `claude-agence-plugin/` doit retourner **zéro** occurrence dans les 3 skills (hors éventuels exemples de format volontaires).
2. **Cohérence rôle ↔ format** : relire que chaque rôle référencé (§3) existe bien dans le format CASERNE.md produit par le #2.
3. **Lisibilité** : chaque skill modifiée reste compréhensible seule - le bloc de résolution + les noms parlants suffisent à comprendre quel ID va où.

## 6. Critères de succès

- **Aucun** UUID d'agence, Slack ID ou renvoi `erom-linear`/`erom-slack` ne subsiste dans le plugin.
- Chaque skill résout ses IDs par rôle depuis `CASERNE.md`.
- Pour Romain : `erom-handoff`/`erom-inbox`/`erom-agence-onboarding` continuent de fonctionner à l'identique (mêmes IDs, désormais lus au lieu d'être gelés).
- Pour un utilisateur tiers ayant lancé `erom-agence-setup` : ces skills opèrent sur **sa** propre agence sans édition manuelle.

## 7. Hors scope

- Formatting / convention mrkdwn Slack → reporté (décision Romain).
- Toute modification du #2 ou du format de CASERNE.md → le format couvre déjà tous les rôles.
- Génération des variantes Codex/Gemini → **chantier #4** (transpilées depuis ce maître).
- Suppression des skills perso `erom-linear`/`erom-slack` de `~/.claude/skills/` → hors plugin, jamais touchées.

## 8. Dépendances

- **#1 (fait)** : fournit CASERNE.md + son injection SessionStart + la résolution de l'agent courant (`erom_agence.sh`).
- **#2 (fait)** : fournit le format de CASERNE.md dont les rôles sont consommés ici.
- **#4 (à venir)** : transpilera ces skills consolidées vers les variantes - d'où l'importance que le maître soit propre d'abord.
