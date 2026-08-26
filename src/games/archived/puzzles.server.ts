// Server-only puzzle loading. Reads every file in ./puzzles/, one
// puzzle per JSON file, named by date — dropping a new file in is the
// entire authoring workflow. See scripts/new-puzzle.mjs to scaffold
// one and scripts/validate-puzzles.mjs to check it before committing.
import fs from "fs";
import path from "path";
import type { GameConfig, Puzzle } from "./types";

const PUZZLES_DIR = path.join(process.cwd(), "src/games/archived/puzzles");
const CONFIG_PATH = path.join(process.cwd(), "src/games/archived/config.json");

function todayISO(): string {
  // Local calendar date, per the "local midnight" day-boundary decision
  // in bracket-puzzle-spec.md §5/§6.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Every puzzle file on disk, unfiltered, sorted by date. */
export function getRawPuzzles(): Puzzle[] {
  if (!fs.existsSync(PUZZLES_DIR)) return [];
  const files = fs.readdirSync(PUZZLES_DIR).filter((f) => f.endsWith(".json"));
  const puzzles = files.map(
    (f) => JSON.parse(fs.readFileSync(path.join(PUZZLES_DIR, f), "utf8")) as Puzzle
  );
  return puzzles.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Published puzzles dated today or earlier — what the site actually
 *  shows. A future-dated file stays invisible until its date arrives,
 *  same as the static-hosting constraint in the spec. */
export function getAllPuzzles(): Puzzle[] {
  const today = todayISO();
  return getRawPuzzles().filter((p) => p.published && p.date <= today);
}

export function getPuzzleByDate(date: string): Puzzle | undefined {
  return getAllPuzzles().find((p) => p.date === date);
}

export function getLatestPuzzle(): Puzzle | undefined {
  const all = getAllPuzzles();
  return all[all.length - 1];
}

export function getConfig(): GameConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}
