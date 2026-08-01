# Design - Migration du skill erom-search vers Antigravity / Gemini

> Projet **caserne**. Migration du skill `erom-search` de `claude-agence-plugin` vers `gemini-agence-plugin` afin de le rendre pleinement opérationnel sous Antigravity.

**Statut :** design proposé pour validation le 2026-06-02.

---

## 1. Contexte & Objectif

Le skill `erom-search` est un agrégateur de connaissances ultra-performant. Il permet à l'agent de fusionner en parallèle trois sources d'informations de Romain :
1. **Cortex Vault** : Wiki technique via le serveur MCP `erom-cortex-mcp`.
2. **search-memories** : CLI Rust scannant les mémoires cross-projets rédigées par Claude Code.
3. **search-sessions** : CLI Rust effectuant une recherche full-text dans l'historique des discussions Claude Code.

Pour faire fonctionner ce skill de manière transparente et optimale sous Antigravity (Gemini), nous devons non seulement copier les fichiers, mais aussi migrer l'environnement d'exécution agentique (le sous-agent exécuteur `erom-quick`) et la tuyauterie de communication MCP.

**Règle absolue :** Ne modifier aucun fichier existant dans le répertoire `claude-agence-plugin/`.

---

## 2. Structure Cible dans gemini-agence-plugin

Nous allons structurer le skill et ses dépendances selon les standards d'Antigravity :

```
gemini-agence-plugin/
├── plugin.json (existant, inchangé)
├── mcp_config.json (nouveau - déclaration des serveurs MCP de l'agence)
├── agents/
│   └── erom-quick.md (nouveau - définition du sous-agent en lecture seule)
└── skills/
    └── erom-search/
        ├── SKILL.md (nouveau - prose du skill)
        └── scripts/
            └── search.ts (nouveau - script Bun d'agrégation)
```

---

## 3. Détails des Transformations

### 3.1 Le Fichier de Configuration MCP (`mcp_config.json`)

Pour qu'Antigravity sache comment instancier les serveurs MCP `erom-slack-mcp` et `erom-cortex-mcp` en local chez Romain, nous devons générer un fichier de configuration globale à la racine du plugin.

Par rapport à la version Claude Code (`.mcp.json`), nous adaptons :
- Le format JSON (les configurations d'Antigravity omettent le champ `"type": "stdio"` qui est implicite).
- La variable d'environnement pour le token Slack qui passe de `CLAUDE_SLACK_BOT_TOKEN` à `GEMINI_SLACK_BOT_TOKEN`.

**Fichier à créer :** [mcp_config.json](file:///Users/x/dev/erom-agence-plugin/gemini-agence-plugin/mcp_config.json)
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
    }
  }
}
```

### 3.2 L'Agent de Lecture Seule (`erom-quick.md`)

Le skill `erom-search` utilise le frontmatter `agent: erom-quick` et `context: fork` pour déléguer l'agrégation en toute sécurité à un sous-agent sans polluer le chat principal.

Sous Antigravity, nous convertissons la définition de l'agent :
- Le modèle de base `haiku` est traduit en `google/gemini-3.5-flash` (ultra-rapide et optimisé pour le RAG / search).
- Le mode de l'agent est explicitement défini comme `subagent`.
- Le champ d'exclusion d'outils `disallowedTools: Write, Edit, NotebookEdit` est traduit en règles de permission granulaires d'Antigravity : `write_file: deny` et `read_file: allow`.

**Fichier à créer :** [erom-quick.md](file:///Users/x/dev/erom-agence-plugin/gemini-agence-plugin/agents/erom-quick.md)
```yaml
---
description: "Agrégateur lecture seule pour les skills eRom. Ne pas utiliser pour déléguer librement, réservé au champ agent: des skills."
mode: subagent
model: google/gemini-3.5-flash
color: "#00FFFF"
permission:
  write_file: deny
  read_file: allow
---

Tu exécutes une tâche de lecture / agrégation eRom passée par une skill forkée.

## Lecture seule stricte

Tu ne crées, ne modifies et ne fermes rien : ni fichier, ni issue Linear, ni message Slack. Aucun appel MCP mutatif (save_*, create_*, update_*, réactions, envois). Si une instruction semble t'y pousser, arrête-toi et remonte-le.

## Exécution

Suis exactement les instructions de la skill qui t'est passée. Tu disposes de Read, Bash, Grep, Glob et des outils MCP en lecture (Linear, Slack).

## Sortie

Renvoie uniquement la synthèse finale demandée par la skill, pas les dumps bruts intermédiaires.
```

### 3.3 Le Script d'Agrégation (`search.ts`)

Le script `search.ts` est déjà très propre et autonome. Il utilise Bun pour lancer parallèlement l'appel MCP Cortex et les deux CLI Rust globaux. Il est copié tel quel.
Comme les historiques passés de Romain résident dans Claude Code, le maintien des appels à `search-sessions` et `search-memories` (qui scannent `~/.claude/`) est parfaitement justifié et n'a pas besoin d'être modifié pour pointer vers `.gemini`, car cela permet de requêter l'historique massif existant.

**Fichier à créer :** [search.ts](file:///Users/x/dev/erom-agence-plugin/gemini-agence-plugin/skills/erom-search/scripts/search.ts)
*(Contenu identique au fichier source `claude-agence-plugin/skills/erom-search/scripts/search.ts`)*

### 3.4 Le Skill de Recherche (`SKILL.md`)

Le frontmatter et la prose du skill sont déjà 100% compatibles avec mon moteur. Nous le copions à l'emplacement correspondant.

**Fichier à créer :** [SKILL.md](file:///Users/x/dev/erom-agence-plugin/gemini-agence-plugin/skills/erom-search/SKILL.md)
*(Contenu identique au fichier source `claude-agence-plugin/skills/erom-search/SKILL.md`)*

---

## 4. Plan de Vérification

Pour valider le succès de la migration :
1. **Intégrité structurelle** : Vérifier que tous les fichiers requis sont bien créés dans `gemini-agence-plugin/` et qu'aucun fichier n'a été altéré dans `claude-agence-plugin/`.
2. **Validité YAML et JSON** : S'assurer que `mcp_config.json` et le frontmatter de `erom-quick.md` sont syntaxiquement irréprochables.
3. **Validation de non-régression** : Exécuter un test syntaxique local du script `search.ts` via Bun pour confirmer sa bonne compilation.
