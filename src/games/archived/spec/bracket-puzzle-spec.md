# Collapse

A daily nested-bracket word puzzle for my personal site, in the style of The Atlantic's *Bracket City*, with a browsable archive of every puzzle I have written.

Status: draft spec, pre-implementation
Owner: DJ
Last updated: 2026-08-25 (rev 5)

> **Rev 2 changed the rules.** One-word answers only, the hint is now a single first letter, and it is driven entirely by clicking the clue. Answer length is no longer shown.
>
> **Rev 3 opened up answering.** Every clue whose children are solved is answerable at once, so there is no focused clue and no auto-advance. All interaction happens in the sentence itself.
>
> **Rev 4 added authoring conventions.** Clues are written crossword-style, and the solved sentence points at something that happened on that calendar date in another year.
>
> **Rev 5 let clues hide fragments.** A bracket can cover part of a word, so `Com[A dog's least favorite abode]` collapses to `Compound`. Answers lost their punctuation and their alternates, and the solved sentence must now state the day plainly. See §2.1 and the changelog at the bottom.

---

## 1. Problem

I want a puzzle on my site that people come back to. The nested-bracket format is a good fit: it is text only, it renders anywhere, it takes two to five minutes to solve, and the "solve inward-out" mechanic is satisfying in a way a plain crossword clue is not.

The problems I am actually solving:

1. **There is no open implementation of this format.** The Atlantic's version is closed. I need my own engine, my own puzzles, and my own scoring.
2. **A single hardcoded puzzle is a dead end.** If the puzzle lives in the page markup, adding a second one means editing code. I need authoring to be data entry, not development.
3. **The archive is the point.** A one-off puzzle is a novelty. A traversable calendar of puzzles is a thing people bookmark. Someone who finds the site in November should be able to play the one I wrote in August.
4. **I do not want to migrate twice.** Right now flat files are correct: no backend, no hosting cost, everything in git. But if this grows I want to move to Postgres without rewriting the puzzle format. The storage format has to be flat-file-friendly today and normalizable tomorrow.

### Non-goals (v1)

- User accounts, login, cross-device sync
- Leaderboards or social features beyond a copyable share string
- A public puzzle submission pipeline
- Any kind of monetization

---

## 2. How the puzzle works

Defining this precisely up front, because the whole data model falls out of it.

A puzzle is one English sentence in which some spans have been replaced by bracketed clues, and those clues can themselves contain bracketed clues.

```
[[capital of Italy ||Rome]-based empire's language ||Latin] gave us "liber"
```

- The innermost clues are solvable immediately, because they read as plain English.
- An outer clue is unreadable until its children are solved. Once `Rome` is filled in, the outer bracket reads "Rome-based empire's language", which resolves to `Latin`.
- The puzzle is complete when every bracket has collapsed and the sentence reads plainly.

So a puzzle is a **tree**. Leaves are solvable at the start. An interior node becomes solvable when all of its children are solved. The root is the sentence itself.

### 2.1 What an answer can be

An answer is **one word, or part of one, with no punctuation at all**. It must match `/^[A-Za-z0-9]+$/`. No spaces, no hyphens, no apostrophes.

| Legal | Illegal | Why |
|---|---|---|
| `Armstrong` | `Neil Armstrong` | space |
| `sixties` | `the sixties` | space, and the article belongs to the sentence |
| `Louvre` | `well-being` | hyphen |
| `1969` | `o'clock` | apostrophe |

Hyphenated and open compounds are both out. If the word you want carries punctuation, reword the clue rather than smuggling it in.

**A clue can hide part of a word.** The bracket does not have to stand alone in the sentence; text can sit flush against it on either side, and the answer joins that text when it collapses.

```
Com[A dog's least favorite abode]           ->  Compound
In[Shark dish, in some Asian cuisines]ity   ->  Infinity
[Human being ||person]al computer           ->  personal computer
[Lumber ||Wood][Shares of a company ||stock] ->  Woodstock
```

This needs no grammar change. Text outside a bracket was always literal sentence text and nothing ever required whitespace around a bracket, so the parser handles it already. What changes is the authoring vocabulary: any run of letters inside a word is now cluable, and two brackets can sit back to back to build one word out of two clues.

Three consequences worth holding onto:

- **The answer is not always a word.** `person`, `gold`, and `stock` are, but `pound` in `Com[...]` is being used as a fragment, not as a noun. The clue still clues the fragment on its own terms.
- **Case is load bearing.** A fragment carries its own capitalization into the sentence, so `Wood` and `stock` are stored exactly as they must appear.
- **Fragments are harder than words.** There is no length shown and no sentence context around a bare fragment, so the first-letter hint is worth more here than anywhere else. Use fragments sparingly and put them where the surrounding letters do some of the work.

The final `solution` sentence is exempt from all of this. The rule governs bracket answers only.

### 2.2 The hint

There is **one** hint affordance, and it is the clue text itself. Clicking it advances a three-state machine:

```
   hidden                    lettered                     revealed
"capital of Italy"  ──▶  "capital of Italy (R)"  ──▶  bracket solves
        click                     click
```

- **First click** appends the answer's first letter, in parentheses, to the end of the clue text. That is the entire hint. There is no second letter, ever.
- The letter keeps the answer's **own case**: `(W)` for `Wood`, `(p)` for `person`, `(1)` for `1969`. This does leak whether the answer is capitalized, and that is deliberate. With fragments in play, knowing that a fragment starts a word is information the player has earned by paying for the hint.
- **Second click** solves the bracket outright and moves on.
- The clue text is the only control. There are no peek or reveal buttons anywhere in the UI.

The letter is appended rather than shown separately so the clue reads as one continuous string, the way a crossword clue carries its enumeration. It also means the hint state is visible in the board itself, not parked in a side panel.

Two consequences worth naming now:

**Reveal is always reachable in two clicks on the same target.** A double-click, an impatient tap, or a fat-fingered mobile tap can skip a player straight from "I want a nudge" to "the answer is gone." That is a real hazard for the most expensive action in the game. Mitigations in §3.6.

**Reveal can only be reached through the letter, and it is priced cumulatively on purpose.** You cannot reveal without first paying for the hint, so a revealed clue always costs both penalties: 2 for the letter, then 5 more, for 7 total. This is intentional, not an artifact of the click sequence.

The reasoning is that the two actions are not alternatives, they are a path. A player who reveals has used the letter and then used the answer, and should pay for both. Pricing reveal as a flat 5 would make it *cheaper* to give up on a clue after taking the letter than the letter plus a few wrong guesses, which would reward abandoning a clue the moment it gets hard. Cumulative pricing keeps the incentive pointed the right way: every step down the assistance path costs strictly more than the step before it.

The practical effect is that `letter` and `reveal` are not independent knobs. Raising the letter penalty raises the reveal penalty by the same amount, since reveal is always `letter + reveal`. Config should express this plainly (`reveal` is an increment, not a total) so nobody later "fixes" it into two independent numbers.

### 2.3 Answer length is not shown

No letter mask, no blank count, no enumeration. The player sees the clue and nothing else. Combined with one-word answers and a first-letter hint, the information a player has is: what it means, how it fits the sentence, and optionally what it starts with.

This is a deliberate difficulty increase over rev 1, which showed a dotted mask. It also removes a whole component from the console.

### 2.4 Full mechanics

| Mechanic | Behavior |
|---|---|
| Open clues | Every clue whose children are all solved is answerable, all at once. There is no single focused clue. |
| Answering | A typed answer is checked against every open clue. The one it matches collapses. |
| No match | Rejected with a shake. Increments the run's wrong-guess counter. |
| Ambiguity | If an answer matches two open clues, the first in reading order collapses. Validation should flag the case. |
| Hint, click 1 | Appends the first letter in parentheses to the clue. Once per clue. |
| Hint, click 2 | Solves the active bracket. Only reachable after click 1. |
| Give up | Reveals the whole puzzle. Ends the run with no rank. Kept as a separate control. |
| Score | Starts at 0 and goes up. Lower is better. |
| Rank | Score thresholds map to named tiers on completion. |
| Share | Text summary of the run, copyable, no spoilers. |

Penalty values and tier names live in config, not code. See open questions.

### 2.5 Authoring conventions

Two rules about content rather than mechanics. Neither is machine-checkable, so they live here and in review rather than in `validate.js`.

**Clues are written as crossword clues.** Terse, definitional, substitutable for the answer. No question phrasing, no "what is", no explanatory sentences.

| Write | Not |
|---|---|
| `Element 47` | `the metal with atomic number 47` |
| `Big Blue` | `the company nicknamed Big Blue` |
| `Fire's gray leavings` | `what is left after something burns` |
| `Pair` | `the number that comes after one` |

This matters more here than in a crossword, because a clue has to survive being read twice: once on its own, and again as a fragment inside its parent. `Naples' looming peak` collapses into `Vesuvius's victim of 79`, and both halves have to read like clues. Wordy clue text makes the collapsed parent unreadable.

**The solved sentence plainly states what happened on the date.** A puzzle dated the 21st resolves to a flat, declarative sentence about something that happened on an August 21st in another year. `A worker carried the Mona Lisa out of the Louvre in 1911.` No wordplay, no riddle, no cleverness left to unpack.

This is the one place in the puzzle where nothing is hidden. All the difficulty lives in the clues; the payoff is a sentence you understand the instant it finishes assembling. A final sentence that still needs decoding is a bug, not a flourish. The `note` field, shown on the results card, adds the surrounding detail.

This is the reason the archive is worth browsing rather than just a pile of old puzzles, and it is a real authoring constraint: the date comes first and the sentence has to be built backward from it. Not every date offers something, and forcing it produces worse puzzles than skipping the day. Gaps in the calendar are already expected, and this is another reason for them.

`note` was optional in rev 1. It is now effectively required for any puzzle following this convention, though the schema still allows it to be absent.

---

## 3. Proposed solution

### 3.1 Shape

A static site. No server in v1.

```
/content/puzzles/2026-08-25.json     one file per puzzle
/content/config.json                 scoring, ranks, copy
/src/parser/                         source string -> clue tree
/src/engine/                         game state, scoring, validation
/src/ui/                             board, calendar, share sheet
/tools/validate.js                   CI check on every puzzle file
/tools/new-puzzle.js                 scaffold a puzzle file
```

Puzzle files are committed to the repo and served as static JSON. The client fetches the one puzzle it needs, parses it, and runs the whole game locally. Progress lives in `localStorage`.

### 3.2 Puzzle storage format

One JSON file per puzzle, named by date. The canonical content is a **single annotated source string** rather than a hand-written tree, because writing nested JSON by hand is miserable and the string is close to how I think when I am composing.

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

**Source string grammar:**

- `[` and `]` delimit a clue.
- `||` separates clue text from its answer. Everything between `||` and the closing `]` is the answer.
- `\[`, `\]`, and `\|` are literal characters.
- Text outside any bracket is literal sentence text. It may sit flush against a bracket with no space, which is what makes fragment clues work.
- **One answer per clue. There are no alternates.** If a clue admits two answers, the clue is wrong; fix the clue.
- **Every answer must match `/^[A-Za-z0-9]+$/`.** Enforced at validation, not at parse time, so a bad file fails CI with a useful message rather than blowing up in a player's browser.

**Answer matching** is normalized before comparison: uppercase, strip diacritics, strip anything that is not a letter or digit. So `rome`, `Rome`, and `Rome!` all match `Rome`. Case never has to be typed correctly even though the stored answer is case-exact for rendering.

Normalization is now doing very little work, since a legal answer contains nothing but letters and digits to begin with. It survives as a courtesy to the player's typing, not as a matching strategy. Nothing looser than this exists: no fuzzy matching, no edit distance, and since rev 5, no alternates either.

**Derived at parse time, never stored:** the clue tree, node ids, depth, and solve order. Rev 1 also derived letter counts for the mask; that is gone.

**Per-clue runtime state** is a small record the engine owns and the persistence layer serializes:

```
{ solved: bool, hint: "hidden" | "lettered" | "revealed" }
```

`hint` replaces rev 1's `revealed: int` counter. It is a state machine with three values and one transition, not a tally, which is a meaningful simplification: there is no arithmetic anywhere in the hint path.

Wrong guesses are **not** per-clue. Since rev 3, a guess is thrown at the whole board rather than aimed at one bracket, so a miss cannot be attributed to any single clue. The count lives on the run:

```
{ wrongs: int, done: bool, gaveUp: bool, clues: { [path]: ClueState } }
```

### 3.3 Why this migrates cleanly to a database

Every field above is a scalar. The file maps to one row:

```sql
CREATE TABLE puzzles (
  id             TEXT PRIMARY KEY,
  date           DATE UNIQUE NOT NULL,
  author         TEXT,
  title          TEXT,
  difficulty     SMALLINT,
  published      BOOLEAN NOT NULL DEFAULT FALSE,
  source         TEXT NOT NULL,
  solution       TEXT NOT NULL,
  note           TEXT,
  tags           TEXT[],
  schema_version SMALLINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL
);
```

The migration is a loop over the directory. If I later want per-clue analytics (which brackets get hinted most, which get revealed), I add a `clues` table populated by running the same parser server-side:

```sql
CREATE TABLE clues (
  id         BIGSERIAL PRIMARY KEY,
  puzzle_id  TEXT REFERENCES puzzles(id),
  parent_id  BIGINT REFERENCES clues(id),
  path       TEXT NOT NULL,   -- e.g. "0.1.0", stable across reparses
  depth      SMALLINT NOT NULL,
  clue_text  TEXT NOT NULL,
  answer     TEXT NOT NULL
);
```

The `source` column stays authoritative. `clues` is a derived index that can be rebuilt at any time. `schema_version` bumps to 2 with this revision, so any v1 file that predates the one-word rule is identifiable and can be migrated or retired rather than silently failing.

### 3.4 The calendar

- `/` redirects to today's puzzle.
- `/puzzle/2026-08-19` loads a specific date.
- `/archive` is a month grid. Each cell shows: no puzzle, unplayed, in progress, or solved. Arrows move between months. Months before the first puzzle and after today are not reachable.
- Dates with no puzzle file render as empty cells, not errors. Gaps in the archive are expected and fine.
- Per-puzzle state in `localStorage` under one key per puzzle id, holding solved node paths, hint states, the wrong-guess count, and completion status. Reopening a partly solved puzzle restores it.

### 3.5 Authoring and validation

`tools/new-puzzle.js <date>` scaffolds a file. `tools/validate.js` runs in CI and on pre-commit, checking:

- Brackets balance, and every clue has exactly one `||`
- `date` matches the filename and is unique across the corpus
- Every leaf clue is plain text with no unresolved bracket
- Substituting every answer into its parent produces the stated `solution` exactly
- No answer is empty; no clue text is empty
- **Every answer matches `/^[A-Za-z0-9]+$/`**, with a message naming the offending clue path
- **No two clues in a puzzle share a normalized answer.** Both could be open at once, and the player would collapse a clue they were not thinking about
- **No clue text ends with a parenthesized single character**, which would collide visually with the appended hint letter
- The tree has at least two levels, otherwise it is a trivia question, not a bracket puzzle
- `note` is present, otherwise the date connection never reaches the player

The substitution check is the important one. It catches the failure mode where I write a clever nested clue whose collapsed form is not actually the sentence I claimed. The one-word check is the one that will fire most often in practice, because the natural instinct when writing these is to reach for a proper name.

### 3.6 Guarding the second click

Reveal is now one accidental tap away from a hint request. Two cheap mitigations, both worth building rather than picking one:

1. **Swallow a fast second click.** Ignore clicks on the clue within roughly 400ms of the transition to `lettered`. A deliberate reveal is never that fast; a double-click always is.
2. **Make the next action explicit.** Once the state is `lettered`, the clue's accessible name and a small line beneath it change to say that clicking again reveals the answer. The player should never be able to say they did not know what the second click did.

Accessibility falls out of this too. The clue is a real `<button>`, not a clickable div. It needs a distinct accessible name per state, and the appended letter should be announced through a polite live region rather than only appearing visually.

---

## 4. Users

**Me, as author.** The primary user by volume of interaction. Writes a puzzle in a text editor, runs validate, commits. Never touches application code to publish. The one-word rule lands hardest here: it is a real constraint on what I can clue, and if it makes writing puzzles feel like fighting the format, the archive stops growing and the project dies.

**A visitor who found the site today.** Arrives at `/`, gets today's puzzle, has never seen the format. Needs the rules understood in under fifteen seconds without reading instructions. Mostly mobile. With the mask gone, the board is the only teaching surface left, so the nesting has to be legible on its own.

**A returning player.** Comes back most days. Wants today's puzzle in one click, wants the share string. This is the user most likely to get burned by an accidental reveal, because they move fast.

**An archive browser.** Found the site through a link or a search and wants to binge. This is the user the calendar exists for. Cares that old puzzles are permalinked and that their progress is remembered.

**A recruiter or collaborator reading the repo.** Not playing, reading the code. The parser and the schema are the interesting parts of this project, and they should read well.

---

## 5. Constraints

**Technical**

- Static hosting, no backend, no database in v1. Everything the game needs must be fetchable JSON plus client-side logic.
- Because it is static, every published puzzle file is publicly fetchable, answers included. The game is not cheat-proof and will not be. The mitigation is that only puzzles up to today are published; future-dated files stay unpublished until the build that ships them. This is a real limitation, not a solved problem.
- Progress is device-local. Clearing browser storage loses history. Acceptable in v1, and the fix is accounts, which is a v2 decision.
- The parser is the load-bearing component. A bug there corrupts every puzzle at once. It needs real unit tests, including escaped delimiters, deep nesting, brackets flush against text on both sides, and two brackets adjacent with nothing between them.

**Content**

- I write the puzzles myself. This project reimplements a game mechanic, which is fine, but I do not copy The Atlantic's puzzle content, clue text, rank names, or branding. Game mechanics are not the protected part; specific puzzle text is.
- **One-word answers materially shrink the space of writable puzzles.** No full names, no compound nouns, no titles. Idiom-based clues, which are the most fun to nest, usually resolve to phrases and are now mostly off the table. Expect to throw away more drafts.
- A good puzzle takes real time to write, and this makes it take longer. Realistic cadence is a handful per week, not one per day. The archive is designed to tolerate gaps for exactly this reason.

**Product**

- Mobile first. Nested brackets are a layout problem on a 360px screen. Deep nesting needs to wrap and indent without becoming unreadable, which practically caps useful nesting depth around three or four levels.
- The clue is now both a readable label and an interactive control. On mobile it has to be tappable without being so obviously a button that players tap it by reflex before trying to solve.
- The day boundary is pinned to Pacific time (§6, settled), not the visitor's own zone and not the deploy host's zone.

---

## 6. Open questions

**The hint**

1. The penalty *values* are placeholders. Cumulative pricing is settled by design (§2.2), so the only open part is the numbers: is 2 for a letter and 5 more for the answer the right ratio, and is 7 for a revealed clue steep enough to be a last resort without being punitive? Needs playtesting.
2. Is one letter enough with no length shown, now that some answers are bare fragments? A fragment gets less help from sentence context than a whole word does, so the hint may be carrying more weight than it can bear on exactly the clues that need it most.
3. What happens when a clue text already ends in a parenthetical? Validation currently rejects it, which may be too blunt if a clue genuinely needs one.

**Answers**

4. How far can fragment clues be pushed before they stop being fair? `Com[...]` gives the player three letters of scaffolding; a fragment in the middle of a long word with nothing memorable around it gives almost none. There is probably a rule of thumb here about how much of the host word must be visible, and it is not written yet.
5. Do numerals read badly as answers? `1969` is legal and the hint renders `(1)`, which works but looks odd next to a letter.
6. Now that alternates are gone, does anything break on singular versus plural? The old escape hatch was an alternate; the new answer is to write a clue that admits only one form. That is stricter authoring, and it will occasionally be annoying.

**Scoring and ranks**

8. Do rank thresholds scale with puzzle size? Now more pressing than in rev 1: the maximum hint cost is a fixed multiple of the clue count, so a twelve-clue puzzle and a four-clue puzzle cannot share an absolute score scale without one of them being unfair.
9. What are the rank names? Needs to be my own set.
10. Does changing penalty values invalidate previously earned ranks in the archive? Probably store the raw counters and compute rank at display time, so re-tuning is retroactive rather than destructive.

**Format**

11. Is `||` the right delimiter, or does it collide with clue text often enough to be annoying? Alternatives: `::`, `->`, or moving answers into a parallel array keyed by tree path.
12. Should a clue carry optional per-clue metadata like a category? Adding it later means another `schema_version` bump.

**Product**

14. What does the share string look like? It has to communicate performance without leaking the clue count in a way that helps.
15. Should partial progress expire? If someone opens a puzzle, solves two brackets, and returns in March, do they resume or restart?
16. What happens on a date with no usable historical anchor? Skipping is the honest answer and gaps are already tolerated, but if the calendar starts looking moth-eaten the convention may need a release valve, such as allowing a birth or a first rather than an event.
17. Does the date anchor ever spoil the puzzle? A player who knows the archive convention and checks the date has a head start on the final sentence. That is arguably a feature, but it is worth watching on dates with one overwhelming association.

**Scope**

18. When is the database actually worth it? Probably at the point where I want cross-device progress or per-clue analytics, neither of which is a v1 need.
19. Is there a v2 where other people write puzzles? If yes, the authoring tooling has to become a web form with the same validation rules, and `author` stops being decorative.

**Settled, kept here so the reasoning is not lost:** whether to show answer length (no). How many letters a hint reveals (one, the first). Where the hint controls live (nowhere, the clue is the control). Whether reveal absorbs or adds to the letter penalty (adds, deliberately). What case the hint letter uses (the answer's own). Whether hyphenated and punctuated compounds are legal answers (no). Whether alternates exist (no, one answer per clue). How to break a tie when two open clues share an answer (first in reading order, and validation rejects the puzzle anyway). What the day boundary rule is (Pacific time, explicitly — not the visitor's zone, and not whatever zone the deploy host happens to run in, so a puzzle goes live at the same wall-clock moment regardless of where it's hosted).

---

## 7. Rough sequencing

1. Parser plus test suite. Nothing works without it.
2. Engine: state machine, solvability rules, the three-state hint, scoring. Headless, unit tested.
3. Single-puzzle UI: board, input, open-clue marking, clue-as-hint-control with both repeat-click guards.
4. Calendar and archive, `localStorage` persistence.
5. Share string, ranks, completion screen.
6. Authoring and validation tooling, wired into CI. The one-word check earns its keep immediately.
7. Accessibility pass and mobile layout pass. Explicitly scheduled, not left as cleanup.
8. Write ten puzzles under the one-word rule and the date anchor before launch, so the archive is not empty on day one and so I find out early whether both rules are livable together.

---

## Changelog

**rev 5 (2026-08-25)** Schema bumped to 3. Every rev 2 file needs its alternates stripped.

| Change | Effect |
|---|---|
| A clue may hide part of a word | `Com[A dog's least favorite abode]` collapses to `Compound`. No grammar change needed; the parser already treated out-of-bracket text as literal. Opens up any run of letters inside a word as a clue target, and lets two brackets build one word. |
| Answers are unpunctuated | `/^[A-Za-z0-9]+$/`. Hyphenated and open compounds both rejected. Closes the `o'clock` and `well-being` question. |
| Alternates removed | One answer per clue. A clue that admits two answers is a broken clue. Drops `alternates` from the clue record and the `clues` table. |
| Hint letter matches the answer's case | `(W)` for `Wood`, `(p)` for `person`. Leaks capitalization on purpose, which matters more now that fragments exist. |
| Solved sentence must be plain | The payoff is declarative and instantly readable. A final sentence that still needs decoding is a bug. |
| Duplicate answers rejected outright | Reading order stays the runtime tiebreak, but validation now refuses the puzzle rather than shipping the ambiguity. |

**rev 4 (2026-08-25)** No schema or mechanics change; conventions only.

| Change | Effect |
|---|---|
| Clues written as crossword clues | Terse and substitutable, because every clue is read twice: alone, and as a fragment inside its parent. Wordy clue text makes the collapsed parent unreadable. |
| Solved sentence anchored to the calendar date | The date is now the starting constraint, not the filename. Sentences are built backward from an event. Raises the authoring cost and gives the archive a reason to be browsed. |
| `note` carries the payoff | Optional in schema, effectively required in practice. Shown on the results card once the sentence is solved. |

**rev 3 (2026-08-25)** No schema change; puzzle files are unaffected.

| Change | Effect |
|---|---|
| Every open clue is answerable at once | Focus, auto-advance, and clue selection all removed. The input is aimed at the board, not at one bracket. |
| Wrong guesses counted per run, not per clue | A miss cannot be attributed to a bracket the player never named. Moves `wrongs` from the clue record to the run record, and out of the share tape into its header line. |
| Duplicate answers among simultaneously open clues | New ambiguity case. First in reading order wins; validation should warn. |
| All interaction lives in the board | The console is an input, a status line, and the tally. No second copy of the clue anywhere. |
| One text color for the whole puzzle | Locked and open brackets are no longer distinguished by color. Two highlighter marks carry the state instead: yellow for answerable, green for the word that just collapsed. |

**rev 2 (2026-08-25)** Schema bumped to 2.

| Change | Effect |
|---|---|
| One-word answers only | New validation rule. Rules out full names, compound nouns, and articles in answers. Shrinks the writable puzzle space considerably. |
| Hint is the first letter only, appended as `(R)` | `revealed: int` becomes `hint: "hidden" \| "lettered" \| "revealed"`. No arithmetic in the hint path. |
| Hint driven by clicking the clue | Peek and reveal buttons removed from the UI. Introduces the accidental-reveal hazard and §3.6 to guard it. |
| Answer length not shown | Letter mask component removed. Difficulty rises; the clue is now the only information surface. |
| Reveal priced on top of the letter, not instead of it | A revealed clue costs 7, always. `reveal` is an increment in config, not a total. Keeps each step down the assistance path strictly more expensive than the last. |

**rev 1 (2026-08-25)** Initial spec.
