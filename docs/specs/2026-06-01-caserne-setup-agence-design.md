# Chantier #2 - Setup agence (`erom-agence-setup`) - Design

> ⚠️ **OBSOLÈTE - 2026-06-02.** La skill `erom-agence-setup` a été **retirée** (discovery/réconciliation MCP pilotées par le LLM : non déterministe et coûteux en tokens pour une opération one-shot). Remplacée par une approche **déterministe** : un template `erom-agence-onboarding/references/CASERNE_TEMPLATE.md` copié vers `~/.config/CASERNE.md` et **rempli à la main**, déclenché par l'étape 0 de `erom-agence-onboarding`. `agency-model.yml` et `render_caserne.sh` ont été supprimés avec la skill. Ce document reste comme archive de l'approche initiale.

> Projet **caserne**. Chantier #2 sur 4. Dépend du #1 (référentiel `~/.config/CASERNE.md` + hook SessionStart), prépare le #3 (consolidation des skills par rôle).

**Statut :** design validé le 2026-06-01. Prochaine étape : plan d'implémentation (`writing-plans`).

---

## 1. Problème & positionnement

`erom-agence-onboarding` bootstrappe **un projet** (repo GitHub, projet Linear, channel Slack, structure locale). Il **consomme** des IDs d'agence (team `EAT`, etc.) supposés exister.

`erom-agence-setup` se place **un niveau au-dessus** : il provisionne **l'agence elle-même** (team Linear + workflow states + labels + projet Handoffs, channel Slack d'agence, comptes agents) et **produit** le référentiel `~/.config/CASERNE.md` que le hook du #1 injecte à chaque session. C'est l'inverse d'onboarding : onboarding lit les IDs d'agence, setup-agence les crée et les écrit.

Pour Romain, l'agence existe déjà : le setup ne créera jamais rien chez lui (tout en `reuse`), il sert à (re)générer/maintenir CASERNE.md. La valeur « création » cible un **nouvel utilisateur open-source** qui installe caserne et n'a pas encore d'agence.

## 2. Décisions de cadrage (validées)

| Axe | Décision |
|---|---|
| Scénario | **Idempotent** : discovery → reuse si existe, sinon create, puis (re)génère CASERNE.md. Marche pour Romain (tout reuse) et pour un nouvel utilisateur (création). |
| Frontière auto/manuel | **Guide + découvre** : auto-create ce qui est créable via MCP ; pour le non-créable, instructions manuelles + checkpoint, puis re-discovery. |
| Modèle cible | **Modèle embarqué** : un fichier de référence déclare la structure standard caserne (rôles + noms par défaut). Source unique, partagée plus tard par les skills (#3). |
| Approche | **A - agentique + YAML** : skill descriptif + `agency-model.yml` embarqué + agent exécutant. |
| Agent | **`erom-builder` réutilisé** (il a déjà MCP Linear/Slack + Write + Bash). Sa description « init projet » est élargie à « projet + agence ». |
| Nom du skill | **`erom-agence-setup`**. |

**Contrainte technique structurante :** les outils MCP (Linear, Slack) ne sont accessibles qu'à l'agent, pas à un script bash. Toute discovery/création Linear/Slack passe donc par l'agent. D'après les MCP exposés : créables = **projet Linear**, **labels Linear**, **channel Slack** ; **non** créables = **team Linear**, **workflow states custom**, **comptes agents** (emails + invitations).

## 3. Composants

Tout dans le plugin maître `claude-agence-plugin/` :

| Fichier | Responsabilité |
|---|---|
| `skills/erom-agence-setup/SKILL.md` | Procédure idempotente décrite en forme logique (tableaux discovery/réconciliation, comme onboarding). Frontmatter avec `agent: erom-builder`. |
| `skills/erom-agence-setup/references/agency-model.yml` | Modèle embarqué : structure cible par **rôle sémantique** + noms par défaut + flag `creatable`. |
| `skills/erom-agence-setup/scripts/render_caserne.sh` *(+ `.test.sh`)* | Brique **déterministe** testée : prend des IDs résolus (clé=valeur sur stdin/env) + le CASERNE.md existant, rend/merge le fichier final. Isole la partie testable du flux agentique. |
| `agents/erom-builder.md` | **Modifié** : description élargie « projet + agence ». Aucun changement de toolset. |

> Note : `render_caserne.sh` n'est pas un retour à l'approche B (script qui ferait les appels MCP). L'agent fait toute la collecte MCP ; le script ne fait que le **rendu/merge** du fichier - la seule partie 100 % déterministe et donc la seule qu'on peut tester en bash, cohérent avec le hook testé du #1.

## 4. Le modèle embarqué (`agency-model.yml`)

Déclare des **rôles** (stables, référencés par les skills au #3) + des **noms par défaut** (matérialisés à la création, matchés à la découverte) + `creatable` (encode la frontière auto/manuel). Les **IDs réels n'y figurent pas** : ils sont résolus à l'exécution et écrits dans CASERNE.md.

```yaml
# agency-model.yml — Modèle d'agence caserne.
# Rôles sémantiques + noms par défaut. Les IDs réels vivent dans ~/.config/CASERNE.md, jamais ici.
version: 1

agents:
  # Agents IA supportés + owner humain. Emails / Slack ID / Linear ID sont propres à
  # chaque installation → découverts à l'exécution, pas déclarés ici.
  - {key: claude, role: agent}
  - {key: codex,  role: agent}
  - {key: gemini, role: agent}
  - {key: owner,  role: human}

linear:
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
      - {role: duplicate,      default_name: "Duplicate",      type: canceled}
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
    - {role: handoffs, default_name: "Handoffs", creatable: true}

slack:
  channels:
    - {role: agency, default_name: "caserne", creatable: true}
```

Les rôles couvrent les dépendances connues des skills : `erom-handoff` (team `agency`, projet `handoffs`, label `handoff`, states `todo`→`done`) et `erom-inbox` (states pour le tri `implementation` > `specification` > `todo` > `backlog`, agents pour les mentions).

## 5. Flux idempotent (4 phases)

1. **Charge** : lit `agency-model.yml` + le CASERNE.md existant (s'il existe) comme guide d'idempotence (IDs déjà connus → à confirmer).
2. **Discovery** (lecture seule, parallèle quand possible) :
   - Linear : `list_teams`, `list_projects`, `list_issue_labels`, `list_issue_statuses`.
   - Slack : `list_channels`, `list_users`.
   - Matching par nom (case-insensitive) — ou par ID s'il est déjà dans CASERNE.md (lookup de confirmation). Pour chaque entrée du modèle : `présent (id)` / `manquant`.
3. **Réconciliation** selon `creatable` :

   | Ressource | manquant + `creatable: true` | manquant + `creatable: false` |
   |---|---|---|
   | projet Handoffs, labels, channel #caserne | **auto-create** via MCP, capture l'ID | — |
   | team, workflow states, comptes agents | — | **guide + checkpoint** : instructions précises, pause (« crée-les puis dis-moi quand »), puis **re-discovery** de cette ressource |

   **Résolution des comptes agents :** les emails sont propres à l'installation (par exemple `agent-<key>@example.com`). Le setup tente de découvrir chaque compte par recherche Slack/Linear (user dont le nom/email contient la clé d'agent), demande confirmation, et capture les IDs. Il ne crée jamais de compte.
4. **Write** : appelle `render_caserne.sh` avec les IDs résolus → génère/merge `~/.config/CASERNE.md`, puis affiche le **résumé final** (statuts par ressource : `created` / `reused` / `manual-pending`).

À la **ré-exécution** : tout est découvert → `reused` partout, aucune création, CASERNE.md touché seulement si un ID a changé ou si un `manual-pending` est désormais résolu.

## 6. Génération / merge de CASERNE.md

`render_caserne.sh` (déterministe, testé) :

- **Format de sortie** : sections `## Agents` (table `Agent | Slack ID | Linear ID | Email` — colonne agent en 1ère position, **contrat imposé par le hook du #1** qui grep la ligne self), `## Linear - workspace <team>` (team + tables statuts/labels/projet), `## Slack` (channel).
- **Merge** : si CASERNE.md existe, régénère les sections gérées et **préserve toute section custom** ajoutée par l'utilisateur (même règle qu'onboarding sur CLAUDE.md).
- **Ressource manuelle encore absente** : la cellule ID porte un marqueur `⚠️ MANQUANT (créer manuellement)` au lieu de faire échouer le run. Relancer après création manuelle complète le référentiel.

## 7. Erreurs · dry-run · tests

- **MCP indisponible** (Linear ou Slack) → stop net avec message explicite, **aucune** écriture partielle de CASERNE.md.
- **`--dry-run`** (comme onboarding) : déroule charge + discovery + diff, affiche `[DRY-RUN] would create/reuse/guide` par ressource, **zéro** create/write/MCP-mutation.
- **Tests** (`render_caserne.test.sh`, bash, TDD) :
  1. IDs mockés complets → CASERNE.md attendu (sections + colonne agent en 1ère position).
  2. Merge : CASERNE.md existant avec une section custom `## Notes` → sections gérées régénérées, `## Notes` préservée.
  3. Ressource manquante → marqueur `⚠️ MANQUANT` présent, run en succès.
  La partie agentique (MCP discovery/create, checkpoints) n'est pas testable unitairement — couverte par le `--dry-run` et la revue.

## 8. Critères de succès

- **Romain** : `erom-agence-setup` (re)produit un CASERNE.md complet et correct depuis l'infra existante, **sans rien créer** (tout `reused`), idempotent, parsable par le hook du #1.
- **Nouvel utilisateur** : après le run + les étapes manuelles guidées, il a une agence **fonctionnelle** (`erom-handoff` et `erom-inbox` opèrent) et un CASERNE.md résolu.
- `--dry-run` n'écrit/crée rien.
- Le merge préserve les sections custom de CASERNE.md.

## 9. Hors scope

- Création de comptes / emails / invitations (manuel, jamais tenté).
- Création de team Linear et de workflow states (guidée manuellement, pas automatisée).
- Faire résoudre les skills par rôle au lieu d'IDs en dur → **chantier #3** (consolidation). Ce chantier se contente de *produire* `agency-model.yml` + CASERNE.md ; il ne touche pas `erom-handoff`/`erom-inbox`.
- Génération des variantes Codex/Gemini → **chantier #4**.

## 10. Dépendances

- **#1 (fait)** : le format de CASERNE.md produit ici doit rester compatible avec le parsing du hook `caserne_session_start.sh` (table `## Agents`, clé d'agent en 1ère colonne).
- **#3 (à venir)** : réutilisera `agency-model.yml` comme source des rôles pour dé-hardcoder les IDs dans les skills.
