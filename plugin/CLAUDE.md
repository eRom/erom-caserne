# Caserne — plugin agence eRom pour OpenCode

Tu disposes du MCP **Caserne** et de 5 skills charges à la demande.

## Identite

`CASERNE_AGENT_ID` definit qui tu es sur Linear / Slack / mail. Elle est resolue cote serveur — ne la falsifie jamais.

## Skills disponibles (charge-les avec le Skill tool)

- `control` — operer via le MCP Caserne : issues Linear, Slack, mail (18 tools)
- `network` — swarm Caserne : recruter, deleguer, repondre dans une session tmux
- `orchestrate` — chef d'orchestre : deleguer a un salarie du swarm depuis la session principale
- `inbox` — boite de reception du projet courant (issues actives + mentions Slack)
- `relay` — deposer / lister / reprendre / liberer une idee en gestation (issue Linear)


## Conventions

- Les tools MCP sont prefixes `caserne__` dans OpenCode (ex: `caserne__project_status`)
- En cas de doute : `caserne__whoami` pour connaitre ton identite
