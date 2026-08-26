// Puzzle-file validator. Mirrors bracket-puzzle-spec.md §3.5.
// Used by scripts/validate-puzzles.mjs (pre-commit / CI) and can be
// called from anywhere else that wants to sanity-check a puzzle.

import { ONE_WORD, collect, norm, parseSource, substitute } from "./engine";
import type { Puzzle } from "./types";

export type ValidationIssue = { puzzleId: string; message: string };

export function validatePuzzle(p: Puzzle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ puzzleId: p.id, message });

  let tree;
  try {
    tree = parseSource(p.source);
  } catch (e) {
    err(`parse error: ${(e as Error).message}`);
    return issues;
  }
  const clues = collect(tree);

  for (const c of clues) {
    if (!ONE_WORD.test(c.answer)) {
      err(`clue ${c.path} answer "${c.answer}" is not a single unpunctuated word`);
    }
  }

  const built = substitute(tree);
  if (built !== p.solution) {
    err(`substitution does not match solution\n   built: ${built}\n   said : ${p.solution}`);
  }

  const seen = new Map<string, string>();
  for (const c of clues) {
    const k = norm(c.answer);
    if (seen.has(k)) {
      err(`"${c.answer}" answers both ${seen.get(k)} and ${c.path}; reading order decides`);
    } else {
      seen.set(k, c.path);
    }
  }

  if (clues.length && Math.max(...clues.map((c) => c.depth)) < 2) {
    err("no nesting; this is a trivia question, not a bracket puzzle");
  }
  if (!p.note) {
    err("no note, so the date connection is never shown");
  }
  if (p.date !== p.id) {
    err(`id "${p.id}" does not match date "${p.date}"`);
  }

  // A clue's own text should not end with a parenthesized single
  // character — it would collide visually with the appended hint letter.
  for (const c of clues) {
    const ownText = c.parts
      .map((part) => (part.type === "text" ? part.value : ""))
      .join("")
      .trim();
    if (/\([A-Za-z0-9]\)$/.test(ownText)) {
      err(`clue ${c.path} text ends with a parenthesized character, which collides with the hint letter`);
    }
  }

  return issues;
}

export function validateAll(puzzles: Puzzle[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dates = new Map<string, string>();
  for (const p of puzzles) {
    issues.push(...validatePuzzle(p));
    if (dates.has(p.date)) {
      issues.push({
        puzzleId: p.id,
        message: `date ${p.date} is also used by ${dates.get(p.date)}`,
      });
    } else {
      dates.set(p.date, p.id);
    }
  }
  return issues;
}
