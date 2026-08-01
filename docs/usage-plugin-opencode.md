# Utiliser Caserne avec OpenCode

## Installation

### Recommandé : plugin npm via git

Ajoute à ton `opencode.json` (global ou projet) :

```json
{
  "plugin": ["caserne@git+https://github.com/eRom/erom-caserne.git"]
}
```

Redémarre OpenCode. Le plugin auto-enregistre les 6 skills et le MCP server.  
Aucune autre config requise — juste `CASERNE_AGENT_ID` dans ton environnement.

### Alternative : clone + symlinks

```bash
git clone https://github.com/eRom/erom-caserne.git .caserne
ln -s .caserne/.opencode .opencode
ln -s .caserne/opencode.json opencode.json
ln -s .caserne/AGENTS.md AGENTS.md
```

## Architecture

```
erom-caserne/
├── package.json                   ← npm entry point (plugin git)
├── opencode.json                  ← MCP + instructions (clone scenario)
├── AGENTS.md                      ← instructions chargees automatiquement
├── .opencode/
│   ├── INSTALL.md                 ← doc installee par l'utilisateur
│   └── plugins/
│       └── caserne.js             ← plugin OpenCode (hook config)
├── skills/                        ← 6 skills (decouverts via le plugin)
├── plugin.json                    ← manifeste descriptif
├── .mcp.json / mcp_config.json    ← MCP (compatibilite)
├── .claude-plugin/                ← Claude marketplace intact
├── .codex-plugin/                 ← Codex intact
└── .cursor-plugin/                ← Cursor intact
```

## Comment ça marche

Le plugin `.opencode/plugins/caserne.js` hooke OpenCode au demarrage :

1. **Hook `config`** : enregistre le chemin `skills/` dans `config.skills.paths` → OpenCode decouvre les 6 SKILL.md
2. **Hook `config`** : injecte la definition MCP `caserne` dans `config.mcp.caserne` → plus besoin d'ecrire la config manuellement
3. **`AGENTS.md`** : charge les instructions de base (identite, skills, conventions)

L'utilisateur n'a qu'une chose a faire : definir `CASERNE_AGENT_ID`.

## Skills

| Skill | Declencheur |
|---|---|
| `control` | operations Linear / Slack / mail |
| `network` | swarm tmux |
| `orchestrate` | deleguer depuis la session principale |
| `inbox` | boite de reception + mentions |
| `relay` | idee en gestation |
| `session-end` | persister la connaissance projet |

Charge un skill :

```
utilise la skill control
```

## Tools MCP

Prefixe `caserne__` dans OpenCode :

```
caserne__whoami
caserne__inbox
caserne__issue_create
caserne__slack_post
...
```

## Identite

`CASERNE_AGENT_ID` est resolue cote serveur. Ne la falsifie jamais.  
Verifie avec `caserne__whoami`.

## Mise a jour

Avec l'install plugin git : redemarre OpenCode.  
Pour piner une version :

```json
{
  "plugin": ["caserne@git+https://github.com/eRom/erom-caserne.git#v3.0.0"]
}
```

## Depannage

```
opencode run --print-logs "hello" 2>&1 | grep -i caserne
```
