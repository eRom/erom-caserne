#!/usr/bin/env bun
// Synchronise le manuel des tools généré par le control-plane
// (docs/tools-manual.md, source de vérité : src/server.ts) vers la référence
// embarquée du skill control. Ne jamais éditer la copie à la main.
//
// Usage :
//   bun scripts/sync-tools-manual.ts [chemin-du-repo-control-plane]
//   bun scripts/sync-tools-manual.ts --check   # vérifie sans écrire, exit 1 si dérive

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PLUGIN_ROOT = resolve(import.meta.dir, "..");
const DEST = resolve(PLUGIN_ROOT, "skills/control/references/tools-manual.md");

const args = process.argv.slice(2);
const check = args.includes("--check");
const cpDir = args.find((a) => !a.startsWith("--")) ?? resolve(PLUGIN_ROOT, "../erom-agence-control-plane");
const SRC = resolve(cpDir, "docs/tools-manual.md");

if (!existsSync(SRC)) {
  console.error(`Source introuvable : ${SRC}`);
  console.error("Passe le chemin du repo control-plane en argument :");
  console.error("  bun scripts/sync-tools-manual.ts /path/vers/erom-agence-control-plane");
  process.exit(2);
}

const src = await Bun.file(SRC).text();
const dest = existsSync(DEST) ? await Bun.file(DEST).text() : null;

if (src === dest) {
  console.log("OK : la référence embarquée est à jour (aucune dérive).");
  process.exit(0);
}

if (check) {
  console.error(`DÉRIVE : ${DEST}`);
  console.error("ne correspond plus au manuel généré du control-plane.");
  console.error("Côté control-plane : bun run generate:tools-manual (si les tools ont changé),");
  console.error("puis ici : bun scripts/sync-tools-manual.ts");
  process.exit(1);
}

await Bun.write(DEST, src);
console.log(`Synchronisé : ${DEST}`);
console.log(`Depuis : ${SRC} (${src.length} octets)`);
