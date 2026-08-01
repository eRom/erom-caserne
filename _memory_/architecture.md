# Architecture — erom-caserne

> Mise à jour : 2026-08-01

## Nature

Plugin d'orchestration cross-projet pour agents IA, distribué à **5 harnais** depuis un seul
arbre de fichiers. Aucune transpilation, aucune variante générée : seuls les **manifestes**
diffèrent. Le plugin branche l'agent sur le **MCP Caserne** (control plane externe, repo
`erom-agence-control-plane`), qui donne à chaque agent son identité propre sur Linear, Slack
et le mail.

## Structure (depuis 2026-08-01)

```
/                     <- outillage mainteneur, jamais distribué
├── package.json      <- manifeste OpenCode/Pi + scripts bun du repo (double rôle)
├── scripts/          <- sync-tools-manual.ts
├── docs/             <- plans + specs de conception (publics, anonymisés)
├── _memory_/         <- cette cartographie
└── plugin/           <- RACINE DU PLUGIN, seul dossier distribué
    ├── .claude-plugin/plugin.json   <- source de vérité des versions
    ├── .codex-plugin/plugin.json
    ├── .cursor-plugin/plugin.json
    ├── plugin.json                  <- Antigravity
    ├── .mcp.json / mcp_config.json  <- même serveur, 2 formats
    ├── opencode.json / .opencode/   <- OpenCode
    ├── AGENTS.md
    └── skills/{control,inbox,network,orchestrate,relay}/SKILL.md
```

La marketplace Claude consomme `plugin/` via **`git-subdir`** (`path: "plugin"`) : l'install ne
clone plus le dépôt entier. Les manifestes vivant tous dans `plugin/`, leurs chemins relatifs
(`./skills/`, `./.mcp.json`) restent valides sans modification.

## Canaux de distribution

| Harnais | Manifeste | Canal | État 2026-08-01 |
|---|---|---|---|
| Claude | `plugin/.claude-plugin/plugin.json` | marketplace `.claude-plugin` | git-subdir, **vérifié sur le distant** |
| Codex | `plugin/.codex-plugin/plugin.json` | marketplace `.agents/plugins` | git-subdir, non testé |
| Cursor | `plugin/.cursor-plugin/plugin.json` | `/add-plugin eRom/erom-marketplace` | non testé |
| Antigravity | `plugin/plugin.json` | `agy plugin install <repo>` | non testé |
| OpenCode/Pi | `package.json` (racine) | `git+https://…` | non testé |

## Dépendances externes

- `caserne-mcp` dans le PATH, `CASERNE_AGENT_ID` en env (identité résolue côté serveur).
- Repo `erom-agence-control-plane` cloné à côté : source du manuel des tools embarqué.
- Repo `erom-marketplace` cloné en `~/dev/erom-marketplace` : 2 marketplaces (Claude + Codex).
- `tmux` + CLI `caserne` pour les skills `network` et `orchestrate`.
