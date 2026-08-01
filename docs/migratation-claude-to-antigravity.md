# Migration de plugin Claude Code -> Antigravity

## Mapper la structure de fichiers

- **claude code** : 
```
plugin-name/
└── .claude-plugin
    └── plugin.json
└── .mcp.json
└── agents
    └── *.md
└── commands
    └── *.md
└── skills
    └── <name>
        └── reference
        └── scripts
        └── templates
        └── SKILL.md
```

- **Antigravity** : 
```
plugin-name/
└── plugin.json
└── mcp_config.json
└── agents
    └── <name>.md
└── skills
    └── <name>
        └── reference
        └── scripts
        └── templates
        └── SKILL.md
└── workflows/
    └── <name>.md
```

## Mapper les concepts

| Claude Code       | Antigravity        | Notes                               |
| ----------------- | ------------------ | ----------------------------------- |
| /commands/*.md    | workflows/*.md     | Slash commands → workflows          |
| agents/*.md       | agents/*.md        | Même format dev                     |
| skills/*/SKILL.md | skills/*/SKILL.md  | Identique — cross-compatible github |
| CLAUDE.md         | GEMINI.md          | Règles globales persistantes        |
| .mcp.json         | mcp_config.json    | Protocole MCP identique             |


## Modèle — mapping des modèles

| Claude | Antigravity              |
| ------ | ------------------------ |
| opus   | google/gemini-3.1-pro    |
| sonnet | google/gemini-3.5-flash  |
| haiku  | google/gemini-3.5-flash  |


## MCP Defintion

- **Claude Code** :
```json
{
  "mcpServers": {
    "erom-slack-mcp": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "${CASERNE_SLACK_MCP_SERVER}"],
      "env": {
        "SLACK_BOT_TOKEN": "${CLAUDE_SLACK_BOT_TOKEN}"
      }
    },
    "erom-cortex-mcp": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "${CASERNE_VAULT_MCP_SERVER}"]
    }
  }
}

```

- **Antigravity** :
```json
{
  "mcpServers": {
    "erom-slack-mcp": {
      "command": "bun",
      "args": ["run", "${CASERNE_SLACK_MCP_SERVER}"],
      "env": {
        "SLACK_BOT_TOKEN": "${GEMINI_SLACK_BOT_TOKEN}"
      }
    },
    "erom-cortex-mcp": {
      "command": "bun",
      "args": ["run", "${CASERNE_VAULT_MCP_SERVER}"]
    },
  }
}
```

## Mapper les fichiers de règles

| Claude Code   | Antigravity |
| ------------- | ----------- |
| CLAUDE.md     | GEMINI.md   |


## Mapper les agents / Frontmatter YAML

- **Claude Code**
```yaml
---
name: name
description: description
model: sonnet
color: cyan
disallowedTools: Write, Edit, NotebookEdit
---
```

- **Antigravity** :
```yaml
---
description: description
mode: subagent       
model: google/gemini-3.5-flash
color: "#008B8B"     
permission:          
  write_file: deny
  read_file: allow
---
```


## Mapper les permissions

Voici le tableau nettoyé, réaligné et converti dans un format Markdown propre et parfaitement lisible :

| Domaine / Action | Claude Code (Outils / Règles) | Antigravity (Actions) | Portée & Comportement dans Antigravity |
| --- | --- | --- | --- |
| **Lecture seule** | `Read`, `Grep`, `Glob`, `LS` | `read_file` | Autorise ou bloque la lecture des fichiers, l'affichage de l'arborescence et les recherches textuelles (outils `view_file`, `list_dir`, `grep_search`). |
| **Création & Écriture** | `Write` | `write_file` | Permet de créer de nouveaux fichiers et de configurer de nouveaux dossiers (outil `write_to_file`). |
| **Modification de code** | `Edit`, `MultiEdit` | `write_file` | Gère les modifications de fichiers existants, qu'elles soient simples ou multiples (outils `replace_file_content`, `multi_replace_file_content`). |
| **Notebooks** | `NotebookEdit` | `write_file` (partiel) | L'édition des `.ipynb` est généralement couverte par `write_file`, bien que par sécurité, certains outils d'édition classiques d'Antigravity excluent l'édition brute de cette extension. |
| **Commandes Terminal** | `Bash` (ex: `Bash(npm run *)`) | `command` (ou `unsandboxed`) | Exécution de commandes dans le terminal zsh. On peut spécifier des préfixes précis (ex: `git pull`) ou utiliser le joker `*` pour tout réguler. |
| **Intégrations MCP** | `MCP` (ex: `mcp(linear-mcp-server)`) | `mcp` | Contrôle l'utilisation des outils externes. Très granulaire chez Antigravity (ex: `server/tool`, `server/*` ou le joker global `*`). |
| **Accès Web** | N/A (Intégré ou Web) | `read_url` / `execute_url` | Lecture de pages publiques ou navigation interactive et automatisée via le navigateur (moteur Chrome DevTools). |
 
### Comment les utiliser dans la configuration YAML d'un agent ?

Pour tes agents Antigravity, les règles s'écrivent directement dans la section  permission  du YAML de ton agent :

```yaml
permission:
  write_file: deny                # Bloque Write, Edit et NotebookEdit (équivalent à false)
  read_file: allow                # Autorise Read, Grep, LS (équivalent à true)
  command:
    "git pull": allow             # Autorise uniquement cette commande spécifique
    "*": ask		                  # Demande confirmation pour tout le reste (comportement par défaut)
  mcp:
    "linear-mcp-server/*": deny   # Bloque spécifiquement ce serveur MCP
    "*": allow		                # Autorise ou hérite des autres serveurs MCP
```


## Mapper les commandes / workflows
