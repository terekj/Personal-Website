#!/usr/bin/env node
// Validates every puzzle file in ../puzzles/. Run before committing a
// new puzzle, or wire into CI / a pre-commit hook.
//
//   npm run validate:puzzles

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateAll } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUZZLES_DIR = path.join(__dirname, "..", "puzzles");

const files = fs.readdirSync(PUZZLES_DIR).filter((f) => f.endsWith(".json"));
const puzzles = files.map((f) => {
  const full = path.join(PUZZLES_DIR, f);
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (e) {
    console.error(`[${f}] invalid JSON: ${e.message}`);
    process.exitCode = 1;
    return null;
  }
}).filter(Boolean);

const issues = validateAll(puzzles);
for (const issue of issues) {
  console.error(`[${issue.puzzleId}] ${issue.message}`);
}

if (issues.length) {
  console.error(`\nvalidate: ${issues.length} problem(s) across ${puzzles.length} puzzle file(s)`);
  process.exit(1);
} else {
  console.log(`validate: ${puzzles.length} puzzle(s) clean`);
}
