"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./archived.module.css";
import {
  collect,
  firstLetter,
  flat,
  isOpen,
  nHint,
  norm,
  parseSource,
  rankFor,
  score,
  tape,
} from "./engine";
import { loadRun, runFinished, runStarted, saveRun } from "./storage";
import type { ClueNode, GameConfig, Part, Puzzle, RunState } from "./types";

export type ArchiveEntry = { id: string; date: string; title: string; difficulty: number };

type Props = {
  puzzle: Puzzle;
  archive: ArchiveEntry[]; // ascending by date, includes this puzzle
  config: GameConfig;
  previewing?: boolean; // true when viewed via ?preview=<token>, bypassing the publish gate
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function dateLabel(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toLowerCase();
}

function ClueSpan({
  node,
  freshId,
  animateId,
  onTouch,
}: {
  node: ClueNode;
  freshId: string | null;
  animateId: string | null;
  onTouch: (id: string) => void;
}) {
  if (node.solved) {
    return (
      <span
        className={cx(
          styles.answer,
          node.path === freshId && styles.fresh,
          node.path === animateId && styles.new
        )}
      >
        {node.answer}
      </span>
    );
  }

  const open = isOpen(node);
  const label = !open
    ? undefined
    : node.hint === "hidden"
    ? `Clue: ${flat(node.parts)}. Activate to peek at its first letter.`
    : `Clue: ${flat(node.parts)}, starts with ${firstLetter(
        node.answer
      )}. Activate again to reveal the answer.`;

  return (
    <span
      className={cx(styles.bracket, open && styles.open)}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      aria-label={label}
      onClick={open ? () => onTouch(node.path) : undefined}
      onKeyDown={
        open
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTouch(node.path);
              }
            }
          : undefined
      }
    >
      {/* Chromium fails to paint this span's gradient background when its
          literal first child is itself a nested clue element, with no
          leading text run of the parent's own before it — e.g.
          suff[[infamous for her bob||Karen]: "..."||rage], where "rage"'s
          content starts immediately with the Karen clue. A leading space
          works around it and reads fine; a zero-width space does not fix
          it, so it has to be a real rendered space. Confirmed by testing:
          moving the exact same DOM node elsewhere still fails, but
          inserting a plain " " before the nested child fixes it in place —
          this looks like a real browser bug in how box-decoration-break
          fragments a box whose first line box fragment is empty. */}
      {node.parts[0]?.type === "clue" && " "}
      {renderParts(node.parts, freshId, animateId, onTouch)}
      {open && node.hint !== "hidden" && (
        <span className={styles.letter}>({firstLetter(node.answer)})</span>
      )}
    </span>
  );
}

function renderParts(
  parts: Part[],
  freshId: string | null,
  animateId: string | null,
  onTouch: (id: string) => void
) {
  return parts.map((p) =>
    p.type === "text" ? (
      p.value
    ) : (
      <ClueSpan
        // The key includes the clue's paint state (closed/open/solved),
        // not just its path. Chromium has a real bug where a .bracket
        // span's gradient background sometimes silently fails to repaint
        // when only its className changes in place (confirmed: identical
        // computed styles between a working and a broken instance, and
        // the same DOM node moved elsewhere on the page paints correctly
        // — it's specific to updating this exact node in place). Keying
        // on paint state forces React to mount a fresh DOM node on each
        // transition instead of patching the old one, which always
        // paints correctly.
        key={`${p.path}:${p.solved ? "solved" : isOpen(p) ? "open" : "closed"}`}
        node={p}
        freshId={freshId}
        animateId={animateId}
        onTouch={onTouch}
      />
    )
  );
}

export default function ArchivedGame({ puzzle, archive, config, previewing }: Props) {
  const router = useRouter();

  // The clue tree is mutated in place, matching the reference engine's
  // model; a tick counter forces a re-render after every mutation. This
  // keeps the interaction logic (guards, cumulative pricing, tie-break
  // order) a close port of the reviewed spec instead of a reinterpretation.
  const treeRef = useRef<Part[] | null>(null);
  if (treeRef.current === null) treeRef.current = parseSource(puzzle.source);
  const cluesRef = useRef<ClueNode[] | null>(null);
  if (cluesRef.current === null) cluesRef.current = collect(treeRef.current);
  const clues = cluesRef.current;

  const runRef = useRef({ wrongs: 0, done: false, gaveUp: false });
  const freshIdRef = useRef<string | null>(null);
  const animateIdRef = useRef<string | null>(null);
  const lastTouchRef = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });

  const [tick, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);
  // The "just landed" animation should only play on the render right
  // after a collapse, never again on a later, unrelated re-render.
  const animateId = animateIdRef.current;
  useEffect(() => {
    animateIdRef.current = null;
  }, [tick]);

  const [guess, setGuess] = useState("");
  const [shake, setShake] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [month, setMonth] = useState(puzzle.date.slice(0, 7));
  const [copyLabel, setCopyLabel] = useState("copy result");
  const inputRef = useRef<HTMLInputElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Restore saved progress after mount. Deferred so the very first
  // client render matches the server's (both start from a fresh parse),
  // avoiding a hydration mismatch.
  useEffect(() => {
    const saved = loadRun(puzzle.id);
    if (saved) {
      for (const c of clues) {
        const s = saved.clues[c.path];
        if (s) Object.assign(c, s);
      }
      runRef.current = { wrongs: saved.wrongs, done: saved.done, gaveUp: saved.gaveUp };
      rerender();
      if (saved.done) setEndOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 300);
    return () => window.clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    if (!calOpen && !endOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCalOpen(false);
        setEndOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [calOpen, endOpen]);

  const idx = archive.findIndex((a) => a.id === puzzle.id);
  const prevEntry = idx > 0 ? archive[idx - 1] : null;
  const nextEntry = idx >= 0 && idx < archive.length - 1 ? archive[idx + 1] : null;

  const open = clues.filter(isOpen);
  const done = runRef.current.done;
  const gaveUp = runRef.current.gaveUp;
  const wrongs = runRef.current.wrongs;
  const s = score(clues, wrongs, config);
  const rank = rankFor(s, config);
  const hasLettered = open.some((c) => c.hint !== "hidden");

  function persist() {
    const snap: RunState = { wrongs: runRef.current.wrongs, done: runRef.current.done, gaveUp: runRef.current.gaveUp, clues: {} };
    for (const c of clues) snap.clues[c.path] = { solved: c.solved, hint: c.hint, solvedBy: c.solvedBy };
    saveRun(puzzle.id, snap);
  }

  function solve(n: ClueNode, how: "guess" | "reveal" | "quit") {
    n.solved = true;
    n.solvedBy = how;
    freshIdRef.current = n.path;
    animateIdRef.current = n.path;
    if (clues.every((c) => c.solved)) {
      runRef.current.done = true;
      persist();
      rerender();
      window.setTimeout(() => setEndOpen(true), 560);
      return;
    }
    persist();
    rerender();
    setGuess("");
    inputRef.current?.focus();
  }

  function touch(id: string) {
    if (runRef.current.done) return;
    const n = clues.find((c) => c.path === id);
    if (!n || !isOpen(n)) return;

    // A deliberate repeat click is never this fast; a double-click always is.
    const now = Date.now();
    if (id === lastTouchRef.current.id && now - lastTouchRef.current.at < config.guardMs) return;
    lastTouchRef.current = { id, at: now };

    if (n.hint === "hidden") {
      n.hint = "lettered";
      persist();
      rerender();
      if (announceRef.current) announceRef.current.textContent = "Starts with " + firstLetter(n.answer);
      inputRef.current?.focus();
      return;
    }
    n.hint = "revealed";
    if (announceRef.current) announceRef.current.textContent = "Answer revealed: " + n.answer;
    solve(n, "reveal");
  }

  function submit() {
    if (runRef.current.done) return;
    if (!norm(guess)) return;
    const hit = open.find((c) => norm(c.answer) === norm(guess));
    if (hit) {
      solve(hit, "guess");
      return;
    }
    runRef.current.wrongs++;
    persist();
    rerender();
    setShake(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
    inputRef.current?.select();
  }

  function quit() {
    if (!window.confirm("reveal the whole sentence and end the run?")) return;
    for (const c of clues) {
      if (!c.solved) {
        c.solved = true;
        c.solvedBy = "quit";
      }
    }
    runRef.current.done = true;
    runRef.current.gaveUp = true;
    freshIdRef.current = null;
    persist();
    rerender();
    setEndOpen(true);
  }

  function goTo(date: string) {
    router.push(`/games/archived/${date}`);
  }

  function copyResult() {
    const text = `archived · ${dateLabel(puzzle.date)}\n${
      gaveUp ? "un·solved" : rank.name + " · " + s
    } · ${wrongs} wrong\n${tape(clues)}`;
    const ok = () => {
      setCopyLabel("copied");
      window.setTimeout(() => setCopyLabel("copy result"), 1500);
    };
    const fallback = () => {
      const t = document.createElement("textarea");
      t.value = text;
      t.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand("copy");
        ok();
      } catch {
        // clipboard unavailable; nothing more we can do
      }
      document.body.removeChild(t);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  // ---------- archive calendar ----------
  const byDate = useMemo(() => Object.fromEntries(archive.map((a) => [a.date, a])), [archive]);
  const firstM = archive[0]?.date.slice(0, 7) ?? puzzle.date.slice(0, 7);
  const lastM = archive[archive.length - 1]?.date.slice(0, 7) ?? puzzle.date.slice(0, 7);

  function shiftMonth(step: number) {
    let [y, m] = month.split("-").map(Number);
    m += step;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  function openCal() {
    setMonth(puzzle.date.slice(0, 7));
    setCalOpen(true);
  }

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toLowerCase();
  const lead = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < lead; i++) cells.push(<div key={"lead" + i} className={styles.cell} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const has = !!byDate[iso];
    const run = has ? loadRun(iso) : null;
    cells.push(
      <div
        key={iso}
        className={cx(
          styles.cell,
          has && styles.has,
          has && runFinished(run) && styles.dot,
          has && !runFinished(run) && runStarted(run) && styles.ring,
          iso === puzzle.date && styles.here
        )}
        onClick={has ? () => { setCalOpen(false); goTo(iso); } : undefined}
      >
        {d}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <main className={styles.page}>
        {previewing && (
          <div className={styles.previewBanner}>
            preview — {puzzle.published ? "this puzzle isn't live for its date yet" : "draft, unpublished"}. only visible via this link.
          </div>
        )}
        <header className={styles.entryhead}>
          <div className={styles.headTop}>
            <div>
              <h1 className={styles.h1}>[archived]</h1>
              <div className={styles.ipa}>/ˈɑːrkaɪvd/</div>
            </div>
            <nav className={styles.nav}>
              <button disabled={!prevEntry} onClick={() => prevEntry && goTo(prevEntry.date)} title="previous">
                ←
              </button>
              <button className={styles.arch} onClick={openCal}>
                archive
              </button>
              <button disabled={!nextEntry} onClick={() => nextEntry && goTo(nextEntry.date)} title="next">
                →
              </button>
            </nav>
          </div>
          <div className={styles.pos}>adjective</div>
          <ol className={styles.defs}>
            <li>kept in a running collection, one puzzle per calendar date</li>
            <li>solvable from the inside out, and playable any day after the one it was written for</li>
          </ol>
        </header>

        <div className={styles.slug}>
          <span className={styles.lbl}>{"no. " + String(idx + 1).padStart(2, "0")}</span>
          <span className={styles.lbl}>{dateLabel(puzzle.date)}</span>
          <span className={styles.slugName}>{puzzle.title}</span>
          <span className={styles.sep} />
          <span className={styles.lbl}>{"level " + puzzle.difficulty}</span>
        </div>

        <div className={styles.board}>{renderParts(treeRef.current, freshIdRef.current, animateId, touch)}</div>
        <div className={styles.sr} ref={announceRef} aria-live="polite" />

        <section>
          <div className={cx(styles.field, shake && styles.bad)}>
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={!open.length}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="answer any highlighted clue"
            />
            <button className={styles.go} disabled={!open.length} onClick={submit}>
              enter ↵
            </button>
          </div>
          <span className={cx(styles.state, hasLettered && styles.armed)}>
            {!open.length
              ? done
                ? "solved."
                : ""
              : hasLettered
              ? "tap a lettered clue again to reveal it"
              : ""}
          </span>
          <div className={styles.row}>
            <button disabled={!open.length} onClick={quit}>
              give up
            </button>
            <span className={styles.grow} />
            <span className={styles.tally}>
              <b>{nHint(clues)}</b> peeks · <b>{wrongs}</b> incorrect guesses
            </span>
          </div>
        </section>

        <div className={styles.colophon}>
          archived, a nested-bracket puzzle based on The Atlantic&apos;s Bracket City
        </div>
      </main>

      {calOpen && (
        <div
          className={cx(styles.veil, styles.veilOn)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCalOpen(false);
          }}
        >
          <div className={styles.sheet}>
            <div className={styles.sheetTop}>
              <span className={styles.lbl}>archive</span>
              <button className={styles.x} onClick={() => setCalOpen(false)}>
                close
              </button>
            </div>
            <div className={styles.mon}>
              <button disabled={month <= firstM} onClick={() => shiftMonth(-1)}>
                ←
              </button>
              <span>{monthLabel}</span>
              <button disabled={month >= lastM} onClick={() => shiftMonth(1)}>
                →
              </button>
            </div>
            <div className={styles.grid}>
              {["s", "m", "t", "w", "t", "f", "s"].map((d, i) => (
                <div key={i} className={styles.dow}>
                  {d}
                </div>
              ))}
            </div>
            <div className={styles.grid} style={{ marginTop: 3 }}>
              {cells}
            </div>
            <div className={styles.key}>
              <span>· solved</span>
              <span>∘ started</span>
            </div>
          </div>
        </div>
      )}

      {endOpen && (
        <div
          className={cx(styles.veil, styles.veilOn)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEndOpen(false);
          }}
        >
          <div className={styles.sheet}>
            <div className={styles.sheetTop}>
              <span className={styles.lbl}>{gaveUp ? "unfiled" : "result"}</span>
              <button className={styles.x} onClick={() => setEndOpen(false)}>
                close
              </button>
            </div>
            <h2 className={styles.rank}>{gaveUp ? "un·solved" : rank.name}</h2>
            <div className={styles.rankNote}>{gaveUp ? "the sentence is below, for what it is worth." : rank.note}</div>
            <div className={styles.final}>{puzzle.solution}</div>
            {puzzle.note && <p className={styles.note}>{puzzle.note}</p>}
            <div className={styles.tape}>{tape(clues)}</div>
            <div className={styles.nums}>
              <span>
                score
                <b>{gaveUp ? "—" : s}</b>
              </span>
              <span>
                wrong
                <b>{wrongs}</b>
              </span>
              <span>
                letters
                <b>{nHint(clues)}</b>
              </span>
              <span>
                revealed
                <b>{clues.filter((c) => c.hint === "revealed").length}</b>
              </span>
            </div>
            <div className={styles.acts}>
              <button className={styles.lead} onClick={copyResult}>
                {copyLabel}
              </button>
              <button
                onClick={() => {
                  setEndOpen(false);
                  openCal();
                }}
              >
                archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
