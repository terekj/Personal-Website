// Plain-JS mirror of ../engine.ts + ../validate.ts, for the authoring
// scripts (new-puzzle.mjs, validate-puzzles.mjs) to run under plain
// Node with no build step. Keep in sync with the TS engine if the
// puzzle grammar ever changes.

export function parseSource(src) {
  let i = 0;

  function parts_(depth, path) {
    const out = [];
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

  function clue_(depth, path) {
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
    return { type: "clue", depth, path, parts, answer, solved: false, hint: "hidden", solvedBy: null };
  }

  const root = parts_(0, "");
  if (i < src.length) throw new Error("unexpected ] at " + i);
  return root;
}

export function collect(parts, out = []) {
  for (const p of parts) {
    if (p.type === "clue") {
      collect(p.parts, out);
      out.push(p);
    }
  }
  return out;
}

export const ONE_WORD = /^[A-Za-z0-9]+$/;

export const norm = (s) =>
  (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");

export function substitute(parts) {
  return parts.map((p) => (p.type === "text" ? p.value : p.answer)).join("");
}

export function validatePuzzle(p) {
  const issues = [];
  const err = (message) => issues.push({ puzzleId: p.id, message });

  let tree;
  try {
    tree = parseSource(p.source);
  } catch (e) {
    err(`parse error: ${e.message}`);
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

  const seen = new Map();
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

export function validateAll(puzzles) {
  const issues = [];
  const dates = new Map();
  for (const p of puzzles) {
    issues.push(...validatePuzzle(p));
    if (dates.has(p.date)) {
      issues.push({ puzzleId: p.id, message: `date ${p.date} is also used by ${dates.get(p.date)}` });
    } else {
      dates.set(p.date, p.id);
    }
  }
  return issues;
}
