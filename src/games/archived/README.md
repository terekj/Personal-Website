# archived

A daily nested-bracket word puzzle, in the style of *The Atlantic*'s
Bracket City, with a browsable archive of every puzzle ever written for
it. Lives at `terekj.me/games/archived/<date>` on the main site, but
everything specific to the game — engine, puzzle data, UI, authoring
tools, and the original design doc — is self-contained in this one
directory. The rest of the site only imports from here; nothing in
here reaches back out.

## How it works

A puzzle is one sentence with some spans replaced by bracketed clues,
and those clues can themselves contain bracketed clues:

```
[[capital of Italy ||Rome]-based empire's language ||Latin] gave us "liber"
```

Innermost clues are readable, and solvable, immediately. An outer
clue is unreadable until its children are solved — once `Rome` is
filled in, the outer bracket reads "Rome-based empire's language",
which resolves to `Latin`. The puzzle is done when every bracket has
collapsed into plain text.

Every clue whose children are all solved is answerable at once — there
is no single focused clue, no auto-advance. Type an answer and it's
checked against every currently-open clue. Each clue also has a
two-step peek: the first tap appends the answer's first letter to the
clue text; the second tap reveals the answer outright and solves it.
A short delay guards against a double-tap accidentally chaining
straight through both steps.

Answers are always a single word or a bare word-fragment, with no
punctuation (`/^[A-Za-z0-9]+$/`) — fragments can sit flush against
literal text on either side, which is how `Com[a dog's least favorite
abode]` collapses into `Compound`. The full rules, the reasoning
behind them, and everything still undecided live in
[`spec/bracket-puzzle-spec.md`](spec/bracket-puzzle-spec.md).

## Adding a puzzle

This is the entire authoring workflow — no code changes needed:

```bash
npm run new-puzzle -- 2026-09-01 "my title"
```

This scaffolds `puzzles/2026-09-01.json` with `published: false`. Fill
in `source`, `solution`, and `note` (see **Puzzle format** below),
flip `published` to `true`, then check your work:

```bash
npm run validate:puzzles
```

This re-runs every check by hand: brackets balance, every answer is a
single unpunctuated word, substituting every answer into its clue
reproduces `solution` exactly, no two clues share an answer, the tree
nests at least two levels deep, and `note` is present. Commit the file
once it's clean — that's the release.

A puzzle only appears once its `date` has arrived; a future-dated file
sits invisible in the repo until then (see **Publishing** below), so
you can commit puzzles well ahead of time.

## Puzzle format

One JSON file per date, named `YYYY-MM-DD.json`, in `puzzles/`:

```json
{
  "schema_version": 3,
  "id": "2026-08-12",
  "date": "2026-08-12",
  "author": "DJ",
  "title": "five one five zero",
  "difficulty": 3,
  "published": true,
  "source": "[Big Blue ||IBM] sold its first [Human being ||person]al computer in [[Hollywood actor turned president ||Reagan]'s first year in office ||1981].",
  "solution": "IBM sold its first personal computer in 1981.",
  "note": "IBM announced the model 5150 on August 12, 1981. A mouse was not among the options.",
  "tags": ["computing"],
  "created_at": "2026-08-19T10:04:00Z"
}
```

`source` is the annotated sentence: `[clue text ||Answer]` for every
bracket, `\[`, `\]`, `\|` as escapes if you need a literal one. There
are no answer alternates — a clue that admits two answers is a broken
clue. `solution` is the fully-collapsed sentence, checked byte-for-byte
against what the parser produces. By convention (not enforced), `note`
ties the puzzle's date to something that actually happened on that
calendar date in another year — that's what makes the archive worth
browsing rather than just a pile of old puzzles.

## Directory layout

```
ArchivedGame.tsx        the game — client component, all game state and interaction
archived.module.css     its styles, scoped so nothing leaks into the rest of the site
engine.ts               pure functions: parser, clue tree, scoring — no DOM, no framework
types.ts                shared TypeScript types
storage.ts              per-puzzle progress, held in the browser's localStorage
validate.ts             the validation rules, as a library (used by the CLI script below)
puzzles.server.ts       server-only: reads puzzles/, gates by publish date
config.json             scoring penalties, guard timing, rank names/thresholds
puzzles/                one JSON file per date — this is where you add puzzles
scripts/
  new-puzzle.mjs        scaffolds a new puzzle file
  validate-puzzles.mjs  the CLI entry point for `npm run validate:puzzles`
  lib.mjs               plain-JS mirror of engine.ts + validate.ts, so the
                         scripts run under plain Node with no build step —
                         keep it in sync if the puzzle grammar ever changes
spec/
  bracket-puzzle-spec.md  the original design doc: rules, rationale, open questions
  collapse.html           the first working prototype (single-file, vanilla JS)
README.md              this file
```

The only files outside this directory that know it exists are three
thin routes under `src/app/games/`:

```
src/app/games/page.tsx                     redirects to /games/archived
src/app/games/archived/page.tsx            redirects to the latest published puzzle
src/app/games/archived/[date]/page.tsx     loads one puzzle and renders <ArchivedGame>
```

## Publishing

`puzzles.server.ts` only returns puzzles that are both `published:
true` and dated today or earlier, using the calendar day in **Pacific
time** specifically (not the server's own zone, and not the visitor's)
— see `DAY_BOUNDARY_TZ` in that file. A future-dated file is invisible
until its date arrives Pacific time, no redeploy required, since the
route is rendered per-request (`export const dynamic =
"force-dynamic"`) rather than statically at build time. This also
means every published puzzle file, answers included, is technically
fetchable by anyone who looks — there's no server-side gate on
*solving*, only on *listing*. Fine for a personal site; see the spec's
Constraints section if that ever needs to change.

### Previewing before the date arrives

Add `?preview=<PREVIEW_TOKEN>` to a puzzle's URL to bypass both the
`published` flag and the date gate — e.g.
`terekj.me/games/archived/2026-09-01?preview=<token>`. A banner marks
the page as a preview so it's never confused with the live view.

`PREVIEW_TOKEN` is an env var, not committed:

- **Local dev:** set in `.env.local` (already gitignored). A value was
  generated for you when this feature was added; check that file or
  generate a new one with `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`.
- **Production:** add the same var under Vercel's Project Settings →
  Environment Variables, then redeploy. Without it set, `?preview=`
  never matches anything and the route behaves exactly as before —
  preview mode is off by default everywhere.

Treat the token like a password: don't post it publicly. Anyone who
has it can see any puzzle (draft or future-dated) before you publish
it; it can't modify anything.

## Progress

Progress (which clues are solved, hint state, wrong-guess count) is
saved to `localStorage` per puzzle id, client-side only. Nothing is
sent anywhere. Clearing browser storage loses history; there is no
account system and no cross-device sync (see the spec's non-goals).

## Local development

```bash
npm run dev                    # from the repo root
npm run validate:puzzles       # check every puzzle file
npm run new-puzzle -- <date> "title"   # scaffold a new one
```
