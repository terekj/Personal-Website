// Pure puzzle-engine functions: parsing, tree traversal, scoring.
// Ported from the original collapse.html prototype (see spec/), rev 5.
// No DOM, no framework — safe to use
// on the server (for validation) or the client (for gameplay).
//
// Grammar:  [ clue parts || Answer ]   with \[ \] \| escapes
// One answer per clue. Text outside brackets is literal and may sit
// flush against a bracket, which is what makes fragment clues work
// (`Com[A dog's least favorite abode]` -> `Compound`).

import type { ClueNode, GameConfig, Part } from "./types";

export function parseSource(src: string): Part[] {
  let i = 0;

  function parts_(depth: number, path: string): Part[] {
    const out: Part[] = [];
    let buf = "";
    let child = 0;
    const flush = () => {
      if (buf) {
        out.push({ type: "text", value: buf });
        buf = "";
      }
    };
    while (i < src.length) {
      const c = src[i];
      if (c === "\\" && i + 1 < src.length) {
        buf += src[i + 1];
        i += 2;
        continue;
      }
      if (c === "[") {
        flush();
        i++;
        out.push(clue_(depth + 1, path ? path + "." + child : String(child)));
        child++;
        continue;
      }
      if (c === "]") break;
      if (c === "|" && src[i + 1] === "|") break;
      buf += c;
      i++;
    }
    flush();
    return out;
  }

  function clue_(depth: number, path: string): ClueNode {
    const parts = parts_(depth, path);
    if (!(src[i] === "|" && src[i + 1] === "|")) {
      throw new Error("clue " + path + " missing ||");
    }
    i += 2;
    let raw = "";
    while (i < src.length) {
      const c = src[i];
      if (c === "\\" && i + 1 < src.length) {
        raw += src[i + 1];
        i += 2;
        continue;
      }
      if (c === "]") break;
      raw += c;
      i++;
    }
    if (src[i] !== "]") throw new Error("unclosed clue " + path);
    i++;
    const answer = raw.trim();
    if (!answer) throw new Error("clue " + path + " has no answer");
    return {
      type: "clue",
      depth,
      path,
      parts,
      answer,
      solved: false,
      hint: "hidden",
      solvedBy: null,
    };
  }

  const root = parts_(0, "");
  if (i < src.length) throw new Error("unexpected ] at " + i);
  return root;
}

export function collect(parts: Part[], out: ClueNode[] = []): ClueNode[] {
  for (const p of parts) {
    if (p.type === "clue") {
      collect(p.parts, out);
      out.push(p);
    }
  }
  return out;
}

export const kids = (n: ClueNode): ClueNode[] =>
  n.parts.filter((p): p is ClueNode => p.type === "clue");

export const isOpen = (n: ClueNode): boolean =>
  !n.solved && kids(n).every((c) => c.solved);

export const norm = (s: string): string =>
  (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");

// The letter keeps the answer's own case: (W) for Wood, (p) for person.
export const firstLetter = (a: string): string => a[0] || "?";

export const flat = (parts: Part[]): string =>
  parts
    .map((p) => (p.type === "text" ? p.value : p.solved ? p.answer : "[…]"))
    .join("")
    .trim();

export const ONE_WORD = /^[A-Za-z0-9]+$/;

export const hintCost = (c: ClueNode, config: GameConfig): number =>
  (c.hint !== "hidden" ? config.penalties.letter : 0) +
  (c.hint === "revealed" ? config.penalties.reveal : 0);

export const score = (
  clues: ClueNode[],
  wrongs: number,
  config: GameConfig
): number =>
  wrongs * config.penalties.wrong +
  clues.reduce((s, c) => s + hintCost(c, config), 0);

export const rankFor = (s: number, config: GameConfig) =>
  config.ranks.find((r) => s <= r.max) ?? config.ranks[config.ranks.length - 1];

export const nHint = (clues: ClueNode[]): number =>
  clues.filter((c) => c.hint !== "hidden").length;

export const nReveal = (clues: ClueNode[]): number =>
  clues.filter((c) => c.hint === "revealed").length;

// ◻ clean · ◫ took the letter · ◼ revealed
export const tape = (clues: ClueNode[]): string =>
  clues
    .map((c) =>
      c.solvedBy === "quit" || c.hint === "revealed"
        ? "◼"
        : c.hint === "lettered"
        ? "◫"
        : "◻"
    )
    .join("");

/** Rebuild the plain-text sentence by substituting every answer, ignoring
 *  runtime solved-state. Used by the validator to check the source
 *  actually collapses to the stated `solution`. */
export function substitute(parts: Part[]): string {
  return parts
    .map((p) => (p.type === "text" ? p.value : p.answer))
    .join("");
}
