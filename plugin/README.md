# erom-caserne — le plugin agence eRom

Plugin d'orchestration cross-projet pour agents IA. Il branche l'agent sur le
**MCP Caserne**, le control plane qui donne à chaque salarié IA sa **propre
identité** sur Linear, Slack et le mail : issues créées, commentées et
déléguées sous son propre nom, sans compte ni token partagé.

## Skills

| Skill | Rôle |
|---|---|
| `control` | Manuel des 18 tools Caserne : issues Linear, Slack, mail, réactions, liens thread ↔ issue. |
| `inbox` | Boîte de réception du projet courant : issues actives + mentions Slack, via `project_status`. |
| `network` | Swarm caserne : monter une équipe de salariés IA dans une session tmux et les faire collaborer (CLI `caserne`). |
| `orchestrate` | Chef d'orchestre hors pane : déléguer une task à un salarié du swarm depuis la session principale, suivre et synthétiser. |
| `relay` | Déposer / lister / reprendre / libérer une idée en gestation via une issue Linear (projet Handoffs), reprise sur n'importe quel harness. |

## Prérequis

- `caserne-mcp` dans le `PATH` (serveur MCP du control plane).
- `CASERNE_AGENT_ID` exportée : elle définit qui tu es sur Linear / Slack /
  mail. Elle est résolue côté serveur, jamais falsifiable côté client.
- `tmux` et le CLI `caserne` pour les skills `network` et `orchestrate`.

## Installation

Via la marketplace eRom : `/plugin install erom-caserne@erom-marketplace`.
Les autres harnais (Codex, Cursor, Antigravity, OpenCode/Pi) sont couverts par
le README à la racine du dépôt.

## Structure

Ce dossier est la racine du plugin : la marketplace le consomme via
`git-subdir` (`path: "plugin"`), sans cloner le reste du dépôt. Les manifestes
des cinq harnais cohabitent ici et gardent toujours la même version.
