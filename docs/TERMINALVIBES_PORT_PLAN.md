# TerminalVibes → GitVibes Port Plan (July 2026)

**Goal:** bring GitVibes to feature parity with TerminalVibes as of `fce61a8` (2026-07-21).
The last port (2026-07-18, PRs #3–#6) captured TV up to ~2026-07-14. Everything TV shipped
2026-07-19 → 2026-07-21 is in scope here — headlined by the **header timeline (ThreadRail)**,
**per-part challenges**, the **morphing sidebar with reading heat**, and the
**exercise-focused cheat sheet** — plus per-part shareable pages, CourseLink/CourseMap,
and CI/security hygiene.

Plan only. No code has been written.

---

## 0. Feature inventory — TV vs GitVibes today

| Feature                                                                                                                  | TV commits                                            | GitVibes today                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Header timeline "ThreadRail" (fisheye rail, hover cards w/ banner thumbs, keyboard nav, dwell heat, search-hit lighting) | `2f98256`, `7fd4a20`                                  | **Absent.** No `src/lib/timeline/`, header has no rail, no progress in header                                            |
| Challenges (graded, hint-less, salted pool, cost scoring, one per part)                                                  | `2f98256` + `challenges/part-*.ts`                    | **Absent.** Only the 23 `LessonActivity` walkthrough scenarios (one of which is the capstone, `capstone` in section 9-3) |
| Manifest build scripts (`build-timeline.mjs`, `build-timeline-thumbs.mjs`, `measure-offsets.mjs`)                        | `2f98256`, fixes `2134705`/`feae38d`/`fd38cbe`        | **Absent**                                                                                                               |
| Morphing sidebar (52px rail ⇄ full width, one DOM tree), flyout, mobile mini-timeline, quieting pass                     | `cedf83f`, `6832d8f`, `675ca1b`, `6f31c81`, `009d7c3` | Two separate `{#if}` subtrees (expanded aside + collapsed icon rail w/ flyout); no morph, no heat, no mini-timeline      |
| Dwell-time reading heat (velocity ramp, OKLCh LUT)                                                                       | `cedf83f` (`dwell.ts`, `heat.ts`)                     | **Absent**                                                                                                               |
| Header buttons wear panel state (`is-active` + `aria-pressed`)                                                           | `f94a0f3`                                             | Buttons stateless                                                                                                        |
| Cheat sheet: reading-mode panel ("read beside it", 21rem)                                                                | `44a3a71`                                             | Overlay panel only; reading mode covers playground/agent only                                                            |
| Cheat sheet: exercise focus (filter to the exercise at hand; challenge pool never reveals solution)                      | `44a3a71` (`exercise-commands.ts`)                    | **Absent** (panel is context-blind)                                                                                      |
| Duplicate-key guards (`keys.test.ts`)                                                                                    | `cf13b9f`                                             | **Absent** (same keyed-`{#each}` crash risk exists)                                                                      |
| Per-part shareable pages (`/parts/[slug]`, OG/Twitter per page, prev/next, footer index, sitemap)                        | `bfd0709`                                             | Single page only; sitemap has 1 URL; OG meta static in `app.html`                                                        |
| CourseLink (route-aware named cross-links) + CourseMap (dependency graph widget)                                         | `d3b57fe`                                             | Numbered "Part N" prose references; no map                                                                               |
| CI on PR (`ci.yml` incl. BASE_PATH build check), CodeQL weekly, Dependabot grouped-minor/isolated-major                  | `46680fa`, `1745a96`, `345c996`                       | Only `deploy.yml` on push to main                                                                                        |
| lucide-svelte 1.0 + local brand icons (Github/Linkedin)                                                                  | `0bf2eca`                                             | lucide-svelte 0.577 with brand icons (removed upstream in 1.0)                                                           |
| Deps current (tailwind 4.3.3, playwright 1.61, vitest 4.1.10, …)                                                         | `88b5192`                                             | Older across the board                                                                                                   |
| Trio color tokens (`--color-btn-playground/-agent/-cheatsheet`) + "three companions" hero framing                        | `afc5d73`, `75f0e51`                                  | Only `--color-btn-agent` token; hero framing predates the tutor                                                          |
| Cheat-sheet `chipText` backtick chips + build-script backtick stripping                                                  | `1f88437`                                             | Inline `Code.svelte` exists in prose, but cheat-sheet descriptions and build scripts predate the convention              |
| Dark as default theme                                                                                                    | `7fd4a20`                                             | Default is `system`                                                                                                      |
| Content-gaps audit discipline (`docs/CONTENT_GAPS.md`, tiered, in-place fixes so anchors don't move)                     | `ad2d099`, `260aa50`                                  | Process not yet applied to git content                                                                                   |

Not in scope (bash-specific content): Power Tools parts 7–10, sed/awk engine support,
the 14 authored bash challenges' content, TV's curriculum reorder, the "quiet assumptions"
content pass (`3d21141` — bash editorial; GitVibes' equivalent belongs in Workstream G),
and dwell calibration values.

---

## 1. Architecture facts that shape the port (verified in both repos)

1. **Anchor-id ⇄ scenario-id invariant holds in GitVibes.** `LessonActivity` call sites use the
   same string for `scenarioId` and `id` (e.g. `core-loop`), and the DOM anchor is the heading
   above the activity — same convention TV's `exerciseFocusOf()` depends on. Cheat-sheet focus
   and the timeline manifest can rely on it. A unit test should pin `scenarioId === id` at every
   call site (TV enforces the equivalent via its manifest gate).
2. **Command history lives in the wrong place for scoring.** TV's `scoreHistory` reads
   `engine.historyLog` (a real `ShellEngine` field). GitVibes keeps the replay log (used by
   share/undo) as `commandLog` inside `GitPlayground.svelte`, not in `GitEngine`.
   **Adaptation:** either lift the executed-command
   log into `GitEngine` (mirrors TV, cleaner for `scoreHistory(engine)`), or change the scoring
   API to `scoreHistory(commands: string[])` fed from the component. Recommend lifting into the
   engine: challenges' `check(engine)` already receives the engine, and share/undo can read the
   same log.
3. **Banners are hard-coded `<img>` in Part components, not declared in `sections.ts`** —
   same as TV, whose `build-timeline.mjs` harvests them by scanning component source. But
   GitVibes wraps many banners in `ExpandableImage` and `VsCodeScreenshot`; the scanner must
   recognize those wrappers (TV's scanner is a character-scanner tuned to TV idioms). GitVibes
   has ~39 banner references across its 52 `sectionIds` → TV's **banner inheritance** (part
   borrows first section's image; playground/challenge borrows its containing section's)
   covers the gaps, exactly as TV's 56-of-107 situation.
4. **GitVibes has an Introduction group** (`section-intro-*` anchors) that doesn't follow
   `section-N-M`. TV special-cases only `hero` → "Introduction". The mapping/partIdOf logic and
   `summarizeParts` must treat GitVibes' intro sections as part of the hero/intro group.
5. **`sections.ts` needs two new exports:** `challengeAnchorIds` and (if we port the prompt-
   designer-style tool anchors pattern) `toolAnchorIds`. Today it has only `sectionIds` (52:
   hero + 4 intro + 9 part ids + the section-N-M anchors), `playgroundAnchorIds` (23),
   `anchorIds`.
6. **Progress store needs upgrades before the timeline/sidebar land:** an `attempts` map
   (untouched/attempted/completed states), `resetAllLearningState()` (progress + checklist +
   dwell), an explicit `CURRENT_VERSION` + migration chain, and dwell mirroring. GitVibes'
   store key stays `gitvibes-progress-v1`; new dwell key `gitvibes-dwell-v1` (never `tv-*` —
   though note model-download `tv-*` keys are deliberately shared across the two sites).
7. **Denominator constants are course-specific.** TV's `summary.ts` hard-derives
   TOTAL_SECTIONS=57 / TOTAL_PLAYGROUNDS=35 from its manifest. GitVibes must derive its own
   from the generated manifest (readable sections from the 52 `sectionIds` minus part/hero
   container ids, 23 playgrounds, + challenges as their own lane) — never copy TV's numbers,
   and e2e mark counts (`.tt-seg`/`.tt-pg`) follow.
8. **The manifest build script gates hard** (throws on: duplicate ids, declared-but-unrendered
   anchors, untitled activities, challenge missing a sidebar row, first anchor ≠ hero).
   The challenge-presence check is already derived from `challengeAnchorIds` (not a literal
   count), so the timeline could land before all challenges are authored — but the plan's
   B-before-C ordering makes that moot. The only literal in the script is its Part-file scan
   list (Hero + Part1..N), which must name GitVibes' components.
9. **Breakpoint contract:** `RAIL_MEDIA_QUERY = '(min-width: 720px)'` has exactly two
   consumers (header mounts ThreadRail; sidebar mounts mini-timeline + mobile reset). Port the
   single-constant discipline; GitVibes' header shed-ladder (drop labels → GitHub link → search
   → wordmark to keep the rail ≥ its sweep floor) must be re-derived for GitVibes' header,
   which also carries the About/logo cell.
10. **Reduced-motion is resolved in script, not `@media`** (inline `--morph-ms` outranks
    stylesheets). Port this as-is; it's a subtle accessibility fix TV already paid for.

---

## 2. Workstream A — Toolchain + CI foundation (PR 1, independent, land first)

Small, mechanical, and it de-risks everything after it.

- **`.github/workflows/ci.yml`** (from TV `46680fa`): on `pull_request` + `workflow_dispatch`;
  lint → svelte-check → unit → Playwright e2e → **BASE_PATH build check**
  (`BASE_PATH=/gitvibes`); concurrency-cancel; upload Playwright artifacts on failure.
- **`.github/workflows/codeql.yml`** (from `1745a96`): javascript-typescript,
  security-extended, push/PR to main + weekly cron, no build step.
- **`.github/dependabot.yml`** (from `1745a96` + `345c996`): npm + github-actions weekly;
  `dev-tooling` and `runtime-minor-patch` groups restricted to minor+patch so every major gets
  its own PR; ignore `svelte` and `tailwindcss` majors; `open-pull-requests-limit: 10`.
- **lucide-svelte → 1.0.1** with local `GithubIcon.svelte` / `LinkedinIcon.svelte` copied from
  TV (ISC-attributed; keep import names so call sites don't change). GitVibes uses both in the
  Header/About modal. Note lucide 1.0 adds `aria-hidden` by default — check any icon the e2e
  finds by role.
- **Dep bumps to TV's verified set** (`88b5192`): tailwindcss 4.3.3, @tailwindcss/typography
  0.5.20, prettier 3.9.5 (+ tailwind plugin 0.8.1), @playwright/test 1.61.1, vitest 4.1.10,
  svelte-check 4.7.3, typescript-eslint 8.64.0, eslint-plugin-svelte 3.22.0, mdsvex 0.12.8.
  Deliberately skip eslint 10 and vite-plugin-svelte 7 majors (TV did). Expect prettier 3.9.5
  to reformat single-line union types — commit the churn separately from logic.

**Gate:** full local suite + one throwaway PR to prove ci.yml triggers. (Remember the standing
lesson: read Playwright's full summary — failed/skipped/did-not-run — never just the pass line.)

---

## 3. Workstream B — Challenges (PR 2)

Port the machinery verbatim, author git-native challenge content.

### Machinery (content-agnostic, ports nearly as-is)

- `src/lib/playground/challenges.ts`: types (`Challenge`, `PoolEntry`, `DistractorKind` 7-kind
  taxonomy, `SolutionPath`, `ChallengeScoring`), chip budget (≤60 chars, ≤2 elements),
  `scoreHistory`, `greatCostOf`, `gradeAttempt` (great/acceptable/failure, frozen at first
  pass), `toScenario` adapter (brief rides in the `hint` slot), `allChallenges`,
  `challengeForPart`.
- `src/lib/playground/challenge-parsing.ts`: **rewrite for git.** TV's `commandWordOf` returns
  the first word per pipeline segment with `sudo`-unwrapping. For a git course the command word
  must be the **subcommand** (`git commit -m …` → `commit`; bare `git` and non-git commands
  like `echo`/`cat`/`ls` keep their first word). Pipeline splitting (`| && || ;`) matters less
  but keep it — scenarios use `&&` occasionally. This function feeds both challenge dedup rules
  and cheat-sheet focus, so get it right once, with unit tests.
- `FREE_COMMANDS` (recon costs nothing): git-native set — `git status`, `git log`, `git diff`,
  `git branch`, `git show`, `git reflog`, `git stash list`, `git remote -v`, `git help`, `ls`,
  `cat`. (Decide exact list while authoring; the principle is "looking is free, acting costs".)
- `GitEngine` gains `historyLog` (see §1.2) so `scoreHistory(engine)` works and share/undo read
  the same source.
- `src/lib/components/ui/ChallengeActivity.svelte`: earth-red→**GitVibes challenge accent**
  chrome, verdict card (grade + cost vs par + economical-route reveal), IntersectionObserver
  lazy import of `challenges.ts` + `GitPlayground` (so challenge N's seed isn't in challenge
  1's bundle). `GitPlayground` gains the `kind` prop (icon `Puzzle` vs `Gamepad2`, accent,
  "Your kit" label, suppress echoed brief) and the `onProgress` history/solved channel.
- `LessonActivity` gains `kind`/`accent`/`data-activity-kind`.
- Progress: challenges reuse `markScenarioComplete`; add the `attempts` map + three-state
  `activityStateOf`.
- `sections.ts`: `challengeAnchorIds` (`ch-<part>-<slug>` convention); `sidebar-nav.ts`:
  `ActivityKind`, `activityKindOf()`, one challenge row as last child of each part (`Puzzle`
  icon).
- Tests: port `challenges.test.ts` shape wholesale — in-order registry, anchor agreement,
  author-asserted cost == `scoreHistory`, canonical paths graded, pool overcomplete + salted +
  not-end-grouped, chip budget, **GREAT never buyable by clicking**, and every solution path
  **executed through the real GitEngine + seed to a passing `check()`**. Also extend the
  existing click-solutions invariant: challenge pools are exempt (they're deliberately
  overcomplete), lesson scenarios keep the old rule.

### Content (the real work — author 9 git challenges)

One per part, `ch-N-<slug>`, each with seed, salted pool, scoring, check:

| Part              | Challenge sketch (recommendation)                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Setup           | Identity + first repo: config name/email, init, first commit — distractors: `git config --global` vs local traps                                                                                                            |
| 2 Core loop       | Stage/commit discipline with a .gitignore twist (secret file must never be committed)                                                                                                                                       |
| 3 Branching & PRs | Branch, commit, merge, delete — distractors: `checkout -b` vs `switch -c`, wrong-direction merge                                                                                                                            |
| 4 Undo            | A staged+committed+pushed mess; pick the _right_ undo per layer (restore/reset/revert) — the signature challenge                                                                                                            |
| 5 Advanced        | Stash + rebase + conflict resolution economy run                                                                                                                                                                            |
| 6 AI agents       | Audit an "agent's" repo: hooks marker, worktree bookkeeping, AGENTS.md — reuse Part 6 sims                                                                                                                                  |
| 7 VS Code         | "Cockpit without the cockpit": do what the VS Code UI does, via CLI (status → stage hunk-ish → commit → push); keeps Part 7 honest without new engine work                                                                  |
| 8 Ship It         | Bot-PR merge + tagged release (reuse `bot-pr`/`release-robot` seeds as a graded combo)                                                                                                                                      |
| 9 Conclusion      | **Convert the existing capstone** ("Three Messes, One Repo") to challenge form — it already has seed + check; add pool + scoring. Keep the old `capstone` scenario id as an alias so saved progress and share links survive |

Open content decisions for the user (defaults chosen so work can proceed):

- **Challenge accent color.** TV uses earth-red against brown. GitVibes chrome is indigo/navy
  and the playground accent is `--color-important`. Default proposal: a warm terracotta/amber
  family distinct from both the indigo chrome and the playground/agent accents, defined as
  `--color-challenge` + `--color-challenge-bright` (+ `--color-earned-bright`) in all four
  theme blocks, honoring TV's deuteranopia rule (completion = brightness/fill change, never a
  hue-only or shape-swap signal).
- Whether Part 7 gets a challenge at all (default: yes, per the sketch above).

**Gate:** unit (incl. new challenges + parsing tests), scenario-checks, click-solutions,
full e2e, lint/check/build.

---

## 4. Workstream C — Timeline (PR 3)

The flagship. Port `src/lib/timeline/` and the scripts; regenerate everything from GitVibes
content.

- **Pure geometry ports as-is:** `mapping.ts` (fisheye density, `solveP`, lanes, marks,
  hit-test, labels), `measure.ts`, `heat.ts`, `state.svelte.ts`, `search-hits.svelte.ts`,
  `breakpoint.ts`, `summary.ts` (recompute denominators from the GitVibes manifest),
  `dwell.ts` (all knobs as-is; **regenerate `dwell-calibration.json` for git anchors** — TV's
  per-anchor modelled seconds are bash-course values and heat is meaningless without redoing
  this).
- **`ThreadRail.svelte`** ports with palette re-lighting only (green reading head → GitVibes'
  primary indigo family; caramel playground squares → `--color-important`; earth-red challenge
  rhomboids → new `--color-challenge`; heat ramp re-tuned to indigo-compatible OKLCh — the LUT
  builder takes theme colors, so this is token work, not code work). Keep: imperative
  per-pointermove mark mutation, cached rail rect, hover card with thumb + prefetch
  (`warmNeighbours`), keyboard nav + `aria-activedescendant`, click-navigates-only guard,
  heat never lens-corrected.
- **Scripts:**
  - `scripts/build-timeline.mjs` — adapt the component scanner to GitVibes idioms:
    `ExpandableImage`/`VsCodeScreenshot` wrappers around `<img>`, the legacy
    `P1.Section1-git-config.webp` filename, `section-intro-*` anchors under the hero/intro
    group, `LessonActivity` id-blanking vs `ChallengeActivity` id-keeping, banner inheritance,
    and the invariant gate parameterized on `challengeAnchorIds` (§1.8). Keep the CWE-116
    hardening (`decode` order, depth-counting `stripBracketed`, total manifest-parser
    stripping) from TV's three fix commits — don't port the pre-fix version.
  - `scripts/build-timeline-thumbs.mjs` — sharp 480×270 q62 webp per non-borrowing anchor →
    `static/images/thumbs/` (~40 files for GitVibes).
  - `scripts/measure-offsets.mjs` — Playwright-measure GitVibes offsets →
    `measured-offsets.fixture.json` (the mapping tests' ground truth).
  - `package.json` `build:timeline`; **JSON artifacts committed, CI never rebuilds** (same
    contract as course-index.json — and the same standing caution: don't casually regenerate).
- **Header mount:** ThreadRail in a `.thread-cell` at ≥720px with GitVibes' own shed-ladder;
  desktop progress-reset moves to the header beside the rail (two-click arm), sidebar keeps
  the mobile reset.
- **Search integration:** `Search.svelte` publishes hits to the `searchHits` singleton; rail
  lights hits (recolor from TV's terminal-cyan to a GitVibes token).
- **Sidebar (minimal touch now):** mount the mobile mini-timeline via
  `summarizeParts`/breakpoint in the _existing_ sidebar; the full morph rewrite comes in PR 4.
- **Dark default** (TV `7fd4a20`): flip `system` → `dark` resolution + pre-paint script in
  `app.html`. Surface to user as a one-line decision; default = match TV (the banner art and
  fabric background are dark-first on both sites).
- **Tests:** port `mapping.test.ts` (sweep property, round-trip, endpoints, lanes),
  `summary.test.ts`, `timeline.e2e.ts` (recount marks for GitVibes; keep the 744px/719px
  boundary specs), plus `sidebar-nav.test.ts` (nav order == manifest order).

**Gate:** all of PR 2's gates + timeline e2e + a manual visual pass (Playwright screenshots —
the embedded browser pane lies about IntersectionObserver, per standing note).

---

## 5. Workstream D — Sidebar morph + heat + header states (PR 4)

- Rewrite `Sidebar.svelte` on TV's model: **one persistent DOM tree**, width-only morph
  (`--morph-ms` 200ms single clock, matching the main-content margin transition),
  `.rail-inner` laid out at full width in both states, labels/carets fade with delayed
  `visibility`, children reveal via `grid-template-rows 0fr→1fr`, flyout preview only while
  collapsed (0 tab stops, `aria-hidden`), reduced-motion resolved in script (§1.10).
- **Recompute the icon-column invariant** for GitVibes' header geometry (TV's 26px derives
  from its logo cell; GitVibes' logo/About cell differs — derive, don't copy).
- Heat in the sidebar mini-timeline (per-part) + rail ownership handoff at 720px (exactly one
  of rail/mini-timeline exists; both consume `watchRailBreakpoint`).
- Quieting pass: no full-height spine, hover pill suppressed while collapsed, chevrons hidden
  until hover/focus (always visible under `(hover:none)`), part ink at `--color-text-secondary`,
  symmetric nav padding, `--sidebar-width` trimmed to kill the dead right edge (re-derive the
  exact value for GitVibes' type).
- Part-collapse semantics: click navigates AND toggles; `userIntent` map outranks scroll-spy
  auto-expand; intent retires when the reader moves to another part (this is the `009d7c3`
  won't-close fix — port the semantics, not just the look).
- Completion marks: bright-fill + 1px ring in family color (`--color-earned-bright` /
  `--color-challenge-bright`), no shape swap.
- **Header buttons wear panel state** (`f94a0f3`): `class:is-active` + `aria-pressed` on
  Playground/Agent/CheatSheet buttons, 16% accent wash placed after hover rules; wire
  `*Open` props from `+page.svelte`. Keep aria-labels byte-identical (e2e pins them).
- Tests: port `sidebar-morph.e2e.ts` (mid-flight invariant sampling, persistent-node proof,
  no hidden-but-focusable, flyout a11y, reduced-motion sub-5ms assertions) with GitVibes
  geometry constants.

**Gate:** the audit flagged these e2e as fragile to this PR — "opens from the header",
"playground link in header", "header gear settings popover", reading-mode reshape, sidebar
open/close specs. Budget time to update them deliberately, not reactively.

---

## 6. Workstream E — Cheat sheet: read-beside + exercise focus (PR 5)

- **Reading mode:** cheat sheet becomes the fourth reading-mode panel at its own narrow width
  (`--cheatsheet-width`; TV chose 21rem = "every command on one line" — re-derive for git
  commands, which run longer: `git commit --amend --no-edit` etc.; likely 23–24rem).
  `enterReadingMode`/`maybeLeaveReadingMode` guards extended to include `cheatSheetOpen`;
  `cheat-mode` class on `<main>`; `sidebarBeforePanel` restores once all panels close.
- **Exercise focus:** port `exercise-commands.ts` (`exerciseFocusOf` — challenge → whole
  salted pool including distractors, _never_ revealing which entries solve it; playground →
  `suggestedCommands`), backed by the new git-aware command-word helpers from Workstream B
  (in TV the `sudo`-unwrap lives in `commandWordsOf`, one layer above `commandWordOf`). Reads
  `readingContext.scenarioId ?? readingContext.sectionId`. GitVibes has
  `reading-context.svelte.ts` with both fields, but **nothing sets `scenarioId` today** —
  only `+page.svelte` sets `sectionId`. Wire the playground panel to set/clear `scenarioId`
  (TV does this in `PlaygroundPanel.svelte`); without it, focus never sees the active
  exercise.
- Focus UI: `ListFilter` toggle (rendered only when a non-empty focus exists), tinted focus
  strip naming the exercise, focus expands-never-collapses categories, legend suppressed while
  focused. **Cheat-sheet row matching depends on rows' first git subcommand** — verify every
  cheat row's `command` parses under the git `commandWordOf` (rows like `git log --oneline`
  → `log`).
- **`chipText` snippet** (from `1f88437`): backticked mentions in `description`/`detail`
  render as syntax-highlighted chips via `tokenizeGitCommand`; adopt backticks in cheat data
  where missing.
- **`keys.test.ts`** (from `cf13b9f`): uniqueness of category labels, commands-within-category
  (they're `{#each}` keys — a duplicate takes down the whole page render), search-index ids,
  sidebar ids, anchor ids; nav-target ↔ real-anchor consistency. Cheap insurance, port fully.
- Regenerate the cheat-sheet PDF afterward (`make-cheatsheet-pdf.mjs` — manual step, stale
  data ships silently if skipped) and rebuild `course-index.json` **only** with the standing
  caution about pinned retrieval tests.

**Gate:** new `exercise-commands.test.ts`, keys.test, e2e for panel reading mode + focus
toggle, PDF regenerated.

---

## 7. Workstream F — Part pages, CourseLink/CourseMap, cohesion (PR 6)

- **`/parts/[slug]`** (from `bfd0709`): `part-pages.ts` (slug/title/~150-char SEO description
  per part — 9 + intro decision below), `+page.ts` with `prerender = true` + `entries`
  generator + the **literal dynamic-import map** (so each part page ships only its own
  component), `+page.svelte` slim header clone (logo, breadcrumb w/ part icon, "Full course",
  GitHub), per-page `<svelte:head>` OG/Twitter/canonical, prev/next cards, footer CTA.
  `partImage(id)` pulls the social-card image from the timeline manifest (dependency on PR 3).
- **Move OG/Twitter meta out of `app.html`** (crawlers honor the first `og:*` they meet);
  main page gets its own head block. JSON-LD Course schema stays on `/` only — update
  `teaches[]` and the exercise count (22 lessons + 9 challenges once the capstone converts
  to challenge form — don't double-count it).
- `sitemap.xml`: `/` + 9 part URLs. Footer part index grid on the main page (the internal-link
  front door).
- **CourseLink**: resolves label + icon from `sidebar-nav` (`courseEntry`/`partIdOf`);
  route-aware href via `page.route.id === '/parts/[slug]'` (not pathname — TV learned pathname
  breaks under prerender). Codemod GitVibes' numbered "Part N" prose references (GitVibes has
  a handful — Part 3's forge cross-ref etc.; grep and convert all).
- **CourseMap** + `course-map.ts`: git dependency graph. Proposed tracks: **The path**
  (Parts 1–4), **Power moves** (5, 8), **Working with machines** (6, 7), each node
  `{gives, needs}` with transitive honest prerequisites; tests assert prerequisites point
  backward and every node resolves to a real anchor + sidebar row.
- **Trio tokens + framing** (`afc5d73`, `75f0e51`): promote `--color-btn-playground` /
  `--color-btn-agent` / `--color-btn-cheatsheet` to shared tokens used by header AND hero
  callouts; brightness-match; hero frames the three companions (playground / tutor / cheat
  sheet) — GitVibes' hero currently predates the tutor.
- Decision for user: does the Introduction get a part page, or does `/parts/setup` start at
  Part 1? (Default: parts 1–9 only; intro content lives on `/`.)

**Gate:** BASE_PATH build check (part pages under `/gitvibes/parts/...` on Pages), a crawl of
all part URLs in preview, OG tags verified per page, sitemap valid.

---

## 8. Workstream G — content-gaps audit (optional, separate track)

Port the _process_, not the content: write `docs/CONTENT_GAPS.md` for git (tiered: real gaps /
callout-sized / deliberate exclusions reaffirmed), verify each claim against section sources,
then close Tier 1/2 **in place so no anchors move** (URLs and the timeline manifest survive),
then propagate to cheat sheet + search + references. This is an editorial session of its own;
recommend scheduling after the UI parity lands.

---

## 9. Sequencing, dependencies, and risk register

**Order: PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6** (G anytime after 5).

Dependency spine: challenges (B) feed the manifest gate + timeline lanes (C) + cheat-sheet
focus (E) + sidebar challenge rows (D). Timeline module (C) feeds sidebar heat/mini-timeline
(D) and part-page social images (F). Doing B before C also means the timeline never needs a
"no challenges yet" degraded mode in production.

Each PR lands green through the full local gate (lint incl. eslint, check, unit, build,
`PORT=43xx npm run test:e2e` reading the **full** Playwright summary) before push — both repos
have a history of deploy-freezing lint/e2e nits.

| Risk                                                                                                            | Mitigation                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `build-timeline.mjs` scanner misses GitVibes component idioms (ExpandableImage/VsCodeScreenshot, intro anchors) | The script's own invariant gate throws loudly; add a manifest snapshot test; hand-verify the generated manifest's 100+ rows once          |
| Git `commandWordOf` subtleties (subcommand extraction, `git -C`, global flags)                                  | Small pure function; exhaustive unit tests before anything consumes it                                                                    |
| Challenge scoring feels wrong (par too tight/loose)                                                             | TV's test contract: author-asserted cost must equal `scoreHistory` of the canonical path — pars are proven, not guessed                   |
| Sidebar rewrite breaks pinned e2e aria-labels                                                                   | Keep aria-labels byte-identical; run the fragile-spec list from the audit after every D commit                                            |
| Dwell heat meaningless without calibration                                                                      | Regenerate `dwell-calibration.json` from GitVibes content before shipping D; until then heat ships behind the same seed/back-fill TV uses |
| lucide 1.0 icon a11y changes break role-based selectors                                                         | Grep e2e for `getByRole` on icons during PR 1                                                                                             |
| Regenerating `course-index.json` breaks pinned retrieval tests                                                  | Only rebuild deliberately (PR 5), re-probe routing before pinning, same as the 07-18 port                                                 |
| Prettier 3.9.5 reformat noise pollutes diffs                                                                    | Isolate the format-only churn in its own commit in PR 1                                                                                   |
| Capstone → challenge conversion breaks saved progress/share links                                               | Keep `capstone` id as scenario alias; migration maps old completion records                                                               |

**Decisions surfaced to the user** (each has a default so nothing blocks):

1. Dark as default theme (default: yes, match TV).
2. Challenge accent hue for the indigo palette (default: warm terracotta/amber family).
3. Part 7 (VS Code) challenge: include CLI-flavored challenge or skip (default: include).
4. Part 9: convert capstone to challenge form (default: convert, alias preserved).
5. Intro part page or not (default: no; parts 1–9 only).
6. Cheat-sheet reading width for git commands (default: ~23rem, verified visually).

---

## 10. Definition of done

- All four headline features live in GitVibes with GitVibes-native content: header ThreadRail
  with hover banner cards + dwell heat; 9 graded challenges; morphing sidebar with heat +
  mini-timeline; exercise-focused cheat sheet reading beside the content.
- Per-part pages crawlable + linked; CI/CodeQL/Dependabot active; deps at TV's verified set.
- Test suite grows to cover each port at TV's level (mapping sweep property, morph invariants,
  challenge solution-path execution, keys uniqueness) — target roughly TV's ratio (~394 unit /
  ~34 e2e scaled to GitVibes' surface).
- Committed artifacts regenerated: timeline manifest + thumbs, measured-offsets fixture,
  dwell calibration, cheat-sheet PDF, course-index (deliberately), sitemap.
- No TV-branded strings, storage keys, or bash-specific tokens anywhere in the diff
  (`terminalvibes-*` keys, bash `FREE_COMMANDS`, TV denominators 57/35, TV's 26px header
  constant, earth-red hexes).
