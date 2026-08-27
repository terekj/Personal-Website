// Types for the archived puzzle format.
// See bracket-puzzle-spec.md for the full spec this mirrors.

export type Puzzle = {
  schema_version: number;
  id: string; // == date, "YYYY-MM-DD"
  date: string;
  author: string;
  title: string;
  difficulty: number;
  published: boolean;
  source: string;
  solution: string;
  note?: string;
  tags?: string[];
  created_at?: string;
};

export type HintState = "hidden" | "lettered" | "revealed";

export type TextPart = {
  type: "text";
  value: string;
};

export type ClueNode = {
  type: "clue";
  depth: number;
  path: string;
  parts: Part[];
  answer: string;
  solved: boolean;
  hint: HintState;
  solvedBy: "guess" | "reveal" | "quit" | null;
};

export type Part = TextPart | ClueNode;

export type ClueRuntimeState = {
  solved: boolean;
  hint: HintState;
  solvedBy: ClueNode["solvedBy"];
};

export type RunState = {
  wrongs: number;
  done: boolean;
  gaveUp: boolean;
  clues: Record<string, ClueRuntimeState>;
  // Normalized words the player has already guessed wrong this run, so a
  // repeat miss doesn't charge a second penalty. Optional for backward
  // compatibility with runs saved before this field existed.
  guessed?: string[];
};

export type RankConfig = {
  max: number;
  name: string;
  note: string;
};

export type GameConfig = {
  penalties: { wrong: number; letter: number; reveal: number };
  guardMs: number;
  ranks: RankConfig[];
};
