# Générateur Automatique Caserne Claude -> Gemini / Antigravity - Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le script de génération automatique `scripts/gemini-generator.ts` (exécutable en Bun) qui transpile l'intégralité du plugin `claude-agence-plugin/` vers `gemini-agence-plugin/` pour le rendre pleinement opérationnel sous Antigravity, puis l'exécuter et le valider.

**Architecture:** Un script autonome en TypeScript lit récursivement `claude-agence-plugin/`. Il projette la structure dans `gemini-agence-plugin/`, parse et adapte les frontmatters YAML des agents (modèles, permissions), convertit `.mcp.json` en `mcp_config.json`, adapte les hooks, et substitue sémantiquement les variables d'environnement (`CLAUDE_SLACK_BOT_TOKEN` -> `GEMINI_SLACK_BOT_TOKEN`, `${CLAUDE_PLUGIN_ROOT}` -> `${GEMINI_PLUGIN_ROOT}`).

**Tech Stack:** Bun runtime, TypeScript, YAML parsing, fs/promises (Node.js API intégrée à Bun).

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `scripts/gemini-generator.ts` | [NEW] Script de transpilation automatique structurel et textuel Claude Code -> Antigravity. |
| `package.json` | [MODIFY] Ajout d'une commande `bun run gemini-gen` pour faciliter la ré-exécution par Romain. |
| `gemini-agence-plugin/mcp_config.json` | [NEW] Configuration MCP générée pour Antigravity. |
| `gemini-agence-plugin/agents/*.md` | [NEW] Agents migrés avec frontmatter converti (permissions, modèles, mode). |
| `gemini-agence-plugin/hooks/*` | [NEW] Hooks et scripts utilitaires migrés. |
| `gemini-agence-plugin/scripts/*` | [NEW] Scripts utilitaires transpilés. |
| `gemini-agence-plugin/skills/**/*` | [NEW] Skills et scripts de skills migrés. |

---

## Tasks

### Task 1: Créer le script `scripts/gemini-generator.ts`

**Files:**
- Create: `scripts/gemini-generator.ts`

- [ ] **Step 1: Créer le dossier scripts si nécessaire et écrire le générateur**

Create `scripts/gemini-generator.ts` :
```typescript
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from "fs/promises";
import { join, dirname, basename, extname } from "path";

const CLAUDE_DIR = join(process.cwd(), "claude-agence-plugin");
const GEMINI_DIR = join(process.cwd(), "gemini-agence-plugin");

// Mappings des modèles
const MODEL_MAPPING: Record<string, string> = {
  haiku: "google/gemini-3.5-flash",
  sonnet: "google/gemini-3.5-flash",
  opus: "google/gemini-3.1-pro",
};

// Mappings des couleurs CSS simples en Hexa
const COLOR_MAPPING: Record<string, string> = {
  cyan: "#00FFFF",
  purple: "#800080",
  blue: "#0000FF",
  red: "#FF0000",
  green: "#008000",
  yellow: "#FFFF00",
};

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function copyRecursive(src: string, dest: string, transform: (content: string, filePath: string) => string | Promise<string>) {
  const stats = await stat(src);
  if (stats.isDirectory()) {
    await ensureDir(dest);
    const files = await readdir(src);
    for (const file of files) {
      if (file === ".DS_Store" || file === ".claude-plugin") continue;
      await copyRecursive(join(src, file), join(dest, file), transform);
    }
  } else {
    await ensureDir(dirname(dest));
    const ext = extname(src);
    if ([".md", ".json", ".ts", ".sh"].includes(ext)) {
      const content = await readFile(src, "utf-8");
      const transformed = await transform(content, src);
      await writeFile(dest, transformed, "utf-8");
    } else {
      // Copie binaire brute
      await copyFile(src, dest);
    }
  }
}

// Analyse et conversion d'un agent Markdown
function transformAgent(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return transformText(content);

  const frontmatterRaw = match[1];
  const body = content.substring(match[0].length);

  // Parsing basique et robuste du YAML frontmatter
  const lines = frontmatterRaw.split("\n");
  const fmData: Record<string, string> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      fmData[key] = val;
    }
  }

  // Construction du nouveau frontmatter
  const newFmLines: string[] = [];
  
  if (fmData.description) {
    newFmLines.push(`description: ${fmData.description}`);
  }
  
  newFmLines.push("mode: subagent");

  // Mapping du modèle
  const rawModel = fmData.model?.replace(/['"]/g, "");
  const mappedModel = rawModel ? (MODEL_MAPPING[rawModel] || rawModel) : "google/gemini-3.5-flash";
  newFmLines.push(`model: ${mappedModel}`);

  // Mapping de la couleur
  const rawColor = fmData.color?.replace(/['"]/g, "");
  const mappedColor = rawColor ? (COLOR_MAPPING[rawColor] || rawColor) : "#008B8B";
  newFmLines.push(`color: "${mappedColor}"`);

  // Mapping des permissions à partir de disallowedTools
  const disallowed = fmData.disallowedTools || "";
  if (disallowed.includes("Write") || disallowed.includes("Edit")) {
    newFmLines.push("permission:");
    newFmLines.push("  write_file: deny");
    newFmLines.push("  read_file: allow");
  } else {
    newFmLines.push("permission:");
    newFmLines.push("  write_file: allow");
    newFmLines.push("  read_file: allow");
  }

  const newFrontmatter = `---\n${newFmLines.join("\n")}\n---`;
  return newFrontmatter + transformText(body);
}

// Transformation globale de texte
function transformText(text: string): string {
  let res = text;
  // Variables d'environnement
  res = res.replace(/CLAUDE_SLACK_BOT_TOKEN/g, "GEMINI_SLACK_BOT_TOKEN");
  res = res.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, "${GEMINI_PLUGIN_ROOT}");
  res = res.replace(/CLAUDE_PLUGIN_ROOT/g, "GEMINI_PLUGIN_ROOT");
  
  // Remplacements de marqueurs de session si applicable
  res = res.replace(/CLAUDECODE=1/g, "ANTIGRAVITY_AGENT=1");
  res = res.replace(/CLAUDE_CODE_ENTRYPOINT/g, "ANTIGRAVITY_AGENT");
  
  // Remplacement du tiret cadratin en tiret simple (Rule 1)
  res = res.replace(/—/g, "-");
  
  return res;
}

// Conversion du fichier MCP
function transformMcp(content: string): string {
  const data = JSON.parse(content);
  if (data.mcpServers) {
    for (const key of Object.keys(data.mcpServers)) {
      const server = data.mcpServers[key];
      // Supprimer le type stdio non requis chez Antigravity
      delete server.type;
      // Remplacer dans l'env
      if (server.env) {
        for (const envKey of Object.keys(server.env)) {
          server.env[envKey] = transformText(server.env[envKey]);
        }
      }
      if (server.args) {
        server.args = server.args.map((arg: string) => transformText(arg));
      }
    }
  }
  return JSON.stringify(data, null, 2);
}

async function main() {
  console.log("🚀 Lancement de la génération automatique pour Gemini / Antigravity...");
  await ensureDir(GEMINI_DIR);

  // 1. Générer mcp_config.json à partir de .mcp.json
  const mcpSrcPath = join(CLAUDE_DIR, ".mcp.json");
  const mcpDestPath = join(GEMINI_DIR, "mcp_config.json");
  try {
    const mcpRaw = await readFile(mcpSrcPath, "utf-8");
    const mcpTransformed = transformMcp(mcpRaw);
    await writeFile(mcpDestPath, mcpTransformed, "utf-8");
    console.log("✅ mcp_config.json généré avec succès.");
  } catch (err) {
    console.error("⚠️ Impossible de générer mcp_config.json:", err);
  }

  // 2. Transpiler les agents
  const agentsSrcDir = join(CLAUDE_DIR, "agents");
  const agentsDestDir = join(GEMINI_DIR, "agents");
  await ensureDir(agentsDestDir);
  const agentFiles = await readdir(agentsSrcDir);
  for (const file of agentFiles) {
    if (extname(file) === ".md") {
      const content = await readFile(join(agentsSrcDir, file), "utf-8");
      const transformed = transformAgent(content);
      await writeFile(join(agentsDestDir, file), transformed, "utf-8");
      console.log(`✅ Agent transpilié : ${file}`);
    }
  }

  // 3. Transpiler les hooks récursivement
  const hooksSrcDir = join(CLAUDE_DIR, "hooks");
  const hooksDestDir = join(GEMINI_DIR, "hooks");
  await copyRecursive(hooksSrcDir, hooksDestDir, (content) => transformText(content));
  console.log("✅ Hooks transpilés.");

  // 4. Transpiler les scripts
  const scriptsSrcDir = join(CLAUDE_DIR, "scripts");
  const scriptsDestDir = join(GEMINI_DIR, "scripts");
  await copyRecursive(scriptsSrcDir, scriptsDestDir, (content) => transformText(content));
  console.log("✅ Scripts utilitaires transpilés.");

  // 5. Transpiler les skills récursivement
  const skillsSrcDir = join(CLAUDE_DIR, "skills");
  const skillsDestDir = join(GEMINI_DIR, "skills");
  await copyRecursive(skillsSrcDir, skillsDestDir, (content) => transformText(content));
  console.log("✅ Skills transpilés.");

  console.log("🎉 Génération complétée avec succès !");
}

main().catch((err) => {
  console.error("🚨 Erreur critique de génération :", err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit du générateur**

```bash
git add scripts/gemini-generator.ts
git commit -m "feat: add scripts/gemini-generator.ts automatic plugin transpiler"
```

---

### Task 2: Ajouter la commande au `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Lire le package.json racine**

Run: `cat package.json`

- [ ] **Step 2: Modifier package.json pour y ajouter le script de build/gen**

Nous ajoutons le script `"gemini-gen": "bun run scripts/gemini-generator.ts"` dans la section `"scripts"`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add gemini-gen command to package.json"
```

---

### Task 3: Exécuter le générateur et peupler `gemini-agence-plugin/`

**Files:**
- Create: `gemini-agence-plugin/mcp_config.json`
- Create: `gemini-agence-plugin/agents/*.md`
- Create: `gemini-agence-plugin/hooks/*`
- Create: `gemini-agence-plugin/scripts/*`
- Create: `gemini-agence-plugin/skills/**/*`

- [ ] **Step 1: Lancer le générateur**

Run: `bun run gemini-gen`
Expected: Log affichant la génération réussie de toutes les ressources sans aucune erreur.

- [ ] **Step 2: Vérifier la création physique des fichiers**

Run: `git status`
Expected: Affichage de tous les nouveaux fichiers créés sous `gemini-agence-plugin/`.

- [ ] **Step 3: Commit de toutes les ressources générées**

```bash
git add gemini-agence-plugin
git commit -m "feat: compile and generate gemini-agence-plugin resources"
```

---

### Task 4: Valider le bon fonctionnement et l'intégration

- [ ] **Step 1: Vérifier la validité de mcp_config.json**

Run: `cat gemini-agence-plugin/mcp_config.json`
Expected: JSON valide avec la bonne variable `GEMINI_SLACK_BOT_TOKEN`, et `"type": "stdio"` supprimé.

- [ ] **Step 2: Vérifier l'agent erom-quick.md généré**

Run: `cat gemini-agence-plugin/agents/erom-quick.md`
Expected: Frontmatter YAML converti avec `mode: subagent`, `model: google/gemini-3.5-flash`, `permission` configurée en lecture seule.

- [ ] **Step 3: Lancer le test d'intégration des hooks pour valider la transpilation**

Run: `GEMINI_PLUGIN_ROOT=./gemini-agence-plugin bash gemini-agence-plugin/hooks/caserne_session_start.test.sh`
Expected: `PASS` (exit 0).

- [ ] **Step 4: Effectuer un git status final pour s'assurer que rien n'a débordé**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

## Verification Plan

### Automated Tests
- Lancer le test unitaire du hook transfilé : `GEMINI_PLUGIN_ROOT=./gemini-agence-plugin bash gemini-agence-plugin/hooks/caserne_session_start.test.sh`. Il doit renvoyer `PASS`.
- Vérifier la structure globale générée.

### Manual Verification
- S'assurer que le répertoire `claude-agence-plugin/` est rigoureusement identique (aucun changement renvoyé par `git diff claude-agence-plugin/`).
