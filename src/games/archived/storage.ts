// Per-puzzle progress, held in this browser's localStorage. Client-only.
// One key per puzzle id, per bracket-puzzle-spec.md §3.4.
import type { RunState } from "./types";

const PREFIX = "archived:v1:";

export function loadRun(id: string): RunState | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as RunState) : null;
  } catch {
    return null;
  }
}

export function saveRun(id: string, run: RunState): void {
  try {
    window.localStorage.setItem(PREFIX + id, JSON.stringify(run));
  } catch {
    // storage unavailable (private mode, quota, etc.) — progress just
    // won't persist across visits. Not fatal.
  }
}

export function runStarted(run: RunState | null): boolean {
  return !!run && Object.values(run.clues).some((c) => c.solved);
}

export function runFinished(run: RunState | null): boolean {
  return !!run?.done;
}
