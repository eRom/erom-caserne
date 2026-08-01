# Fichiers clés — erom-caserne

> Mise à jour : 2026-08-01

## Manifestes (versions toujours ISO entre les 5)

| Fichier | Rôle |
|---|---|
| `plugin/.claude-plugin/plugin.json` | **Source de vérité des versions.** Déclare `./skills/` et `./.mcp.json`. |
| `plugin/.codex-plugin/plugin.json` | Codex. Bloc `interface` spécifique (displayName, brandColor). |
| `plugin/.cursor-plugin/plugin.json` | Cursor. |
| `plugin/plugin.json` | Antigravity. Pas de `$schema`, pas de clé `skills`. |
| `package.json` (racine) | OpenCode/Pi **et** scripts bun du repo. Champs `main` et `pi.*` pointent dans `plugin/`. |

## Skills (`plugin/skills/*/SKILL.md`)

| Skill | Rôle |
|---|---|
| `control` | Manuel des 18 tools Caserne (Linear, Slack, mail). |
| `inbox` | Boîte de réception du projet courant via `project_status`. |
| `network` | Swarm dans une session tmux, CLI `caserne`. |
| `orchestrate` | Délégation hors pane depuis la session principale. |
| `relay` | Idée en gestation transportée par une issue Linear. |

`plugin/skills/control/references/tools-manual.md` est **généré** par le control-plane, jamais
édité à la main.

## Outillage

| Fichier | Rôle |
|---|---|
| `scripts/sync-tools-manual.ts` | Copie `docs/tools-manual.md` du control-plane vers la référence embarquée. `--check` sort 1 sur dérive. |
| `.claude/commands/release-plugin.md` | Workflow de release en 9 étapes (gitignoré, non distribué). |
| `plugin/.opencode/plugins/caserne.js` | Enregistre le dossier skills auprès d'OpenCode, chemins résolus relativement au fichier. |

## Configs

- `.gitignore` : exclut `.claude/`, `.superpowers/sdd/`, `node_modules/`. **`docs/` est publié**
  depuis 2026-08-01.
- `plugin/.mcp.json` et `plugin/mcp_config.json` : même serveur `caserne-mcp`, formats Claude et
  Antigravity. À modifier ensemble.
