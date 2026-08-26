#!/usr/bin/env node
// Scaffolds a new puzzle file. This — plus editing the JSON it writes —
// is the entire authoring workflow; no code changes needed to publish.
//
//   npm run new-puzzle -- 2026-09-01
//   npm run new-puzzle -- 2026-09-01 "my title"

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUZZLES_DIR = path.join(__dirname, "..", "puzzles");

const [, , date, title] = process.argv;

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("usage: npm run new-puzzle -- YYYY-MM-DD [title]");
  process.exit(1);
}

const dest = path.join(PUZZLES_DIR, `${date}.json`);
if (fs.existsSync(dest)) {
  console.error(`${dest} already exists`);
  process.exit(1);
}

const template = {
  schema_version: 3,
  id: date,
  date,
  author: "DJ",
  title: title || "untitled",
  difficulty: 3,
  published: false,
  source: "[Clue text ||Answer] goes here.",
  solution: "Answer goes here.",
  note: "What happened on this date, and in what year.",
  tags: [],
  created_at: new Date().toISOString(),
};

fs.mkdirSync(PUZZLES_DIR, { recursive: true });
fs.writeFileSync(dest, JSON.stringify(template, null, 2) + "\n");
console.log(`wrote ${path.relative(process.cwd(), dest)}`);
console.log(`set "published": true when it's ready, and run: npm run validate:puzzles`);
