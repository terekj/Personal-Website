// Server-only puzzle loading. Reads every file in ./puzzles/, one
// puzzle per JSON file, named by date — dropping a new file in is the
// entire authoring workflow. See scripts/new-puzzle.mjs to scaffold
// one and scripts/validate-puzzles.mjs to check it before committing.
import fs from "fs";
import path from "path";
import type { GameConfig, Puzzle } from "./types";

const PUZZLES_DIR = path.join(process.cwd(), "src/games/archived/puzzles");
const CONFIG_PATH = path.join(process.cwd(), "src/games/archived/config.json");

// Pinned to Pacific time rather than the server's own local zone — a
// puzzle file's "today" gate (below) has to mean the same wall-clock
// day regardless of which region the app happens to be deployed in
// (Vercel functions typically run in UTC), so this settles the
// "day boundary" open question in bracket-puzzle-spec.md §5/§6 as
// Pacific midnight, not UTC midnight and not the visitor's own zone.
// Intl handles the PST/PDT switch automatically.
const DAY_BOUNDARY_TZ = "America/Los_Angeles";

function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAY_BOUNDARY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
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

/** True if `token` matches the PREVIEW_TOKEN env var. Empty/unset env var
 *  never matches anything, so preview mode is off by default everywhere
 *  (local dev included) until you set one. */
export function isValidPreviewToken(token: string | undefined | null): boolean {
  const secret = process.env.PREVIEW_TOKEN;
  return !!secret && !!token && token === secret;
}

/** Same as getPuzzleByDate, but ignores both the `published` flag and the
 *  date gate — for checking a puzzle before its day arrives via
 *  `?preview=<PREVIEW_TOKEN>`. Callers are responsible for checking
 *  isValidPreviewToken first; this function doesn't re-check it, so it
 *  must never be reachable without that check. */
export function getPuzzleByDateForPreview(date: string): Puzzle | undefined {
  return getRawPuzzles().find((p) => p.date === date);
}

export function getConfig(): GameConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}
