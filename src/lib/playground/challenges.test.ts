import { describe, expect, it } from 'vitest';
import {
	MAX_POOL_ENTRY_ELEMENTS,
	MAX_POOL_ENTRY_LENGTH,
	allChallenges,
	challengeForPart,
	challengeIds,
	effectiveFreeSet,
	gradeAttempt,
	greatCostOf,
	isReconSegment,
	scoreHistory,
	splitSegments,
	toScenario,
	FREE_COMMANDS
} from './challenges';
import { challengeAnchorIds } from '../data/sections';
import { GitEngine } from './git-engine';
import { runGitCommand } from './commands';
import { loadScenarioSeed } from './scenarios';

/**
 * The challenges reach the page through three hand-maintained lists that have
 * to say the same thing: `allChallenges` here, `challengeAnchorIds` in
 * sections.ts (which the deep-link router and the sidebar read), and the
 * `<ChallengeActivity>` tags in the Part components. This file checks the
 * first two against each other.
 */
describe('the nine', () => {
	it('is one per Part, in course order', () => {
		expect(allChallenges).toHaveLength(9);
		expect(allChallenges.map((c) => c.part)).toEqual(Array.from({ length: 9 }, (_, i) => i + 1));
		for (const c of allChallenges) {
			expect(c.partId).toBe(`part-${c.part}`);
			expect(challengeForPart(c.part)).toBe(c);
		}
	});

	it('agrees with the anchor list in sections.ts, order included', () => {
		// Order matters as well as membership: `anchorIds` feeds the deep-link
		// router, and a challenge listed under the wrong Part would deep-link
		// into the wrong chapter.
		expect([...challengeAnchorIds]).toEqual([...challengeIds]);
	});

	it('uses ids the sidebar can classify without importing this module', () => {
		// sidebar-nav's `activityKindOf` recognizes a challenge by its id shape
		// alone, precisely so the nav bundle does not pull in nine sandbox
		// seeds. That shortcut is only safe while every id matches.
		for (const c of allChallenges) expect(c.id).toMatch(/^ch-\d+-[a-z0-9-]+$/);
	});

	it('seeds exactly one way', () => {
		for (const c of allChallenges) {
			expect(Boolean(c.seed) !== Boolean(c.seedFn), `${c.id} needs seed XOR seedFn`).toBe(true);
		}
	});
});

describe('the free list', () => {
	it('is keyed on git subcommands, and looking is what it frees', () => {
		expect(isReconSegment('git status', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git log --oneline --all', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('cat .env', FREE_COMMANDS)).toBe(true);
		// Actions are never free, whatever their word looks like.
		expect(isReconSegment('git add .', FREE_COMMANDS)).toBe(false);
		expect(isReconSegment('git commit -m "x"', FREE_COMMANDS)).toBe(false);
	});

	it('frees git branch only as a listing', () => {
		expect(isReconSegment('git branch', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git branch -a', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git branch -d feature/x', FREE_COMMANDS)).toBe(false);
		expect(isReconSegment('git branch feature/x', FREE_COMMANDS)).toBe(false);
		expect(isReconSegment('git branch -m old new', FREE_COMMANDS)).toBe(false);
	});

	it('frees git stash only as `stash list`, and remote only as -v', () => {
		expect(isReconSegment('git stash list', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git stash', FREE_COMMANDS)).toBe(false);
		expect(isReconSegment('git stash pop', FREE_COMMANDS)).toBe(false);
		expect(isReconSegment('git remote -v', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git remote', FREE_COMMANDS)).toBe(true);
		expect(isReconSegment('git remote add up x', FREE_COMMANDS)).toBe(false);
	});

	it('charges redirection even when the command word is free', () => {
		// `echo` isn't free anyway, but the rule matters for any future free
		// word: writing a file is authoring, not looking.
		expect(scoreHistory(['git log > log.txt'])).toEqual({ enters: 1, elements: 1, cost: 2 });
	});

	it('supports per-challenge notFree overrides', () => {
		const challenge = { ...allChallenges[0], notFree: ['status'] };
		const free = effectiveFreeSet(challenge);
		expect(free.has('status')).toBe(false);
		expect(free.has('log')).toBe(true);
		expect(scoreHistory(['git status'], free)).toEqual({ enters: 1, elements: 1, cost: 2 });
	});
});

describe('scoring', () => {
	it('matches every author-asserted cost', () => {
		// The redundancy is the point: `expect` is what the author believed the
		// path costs, and scoreHistory is what it actually costs. A mismatch
		// means the author's model of the scoring has drifted from the scoring.
		for (const c of allChallenges) {
			const free = effectiveFreeSet(c);
			const paths = [c.scoring.great, ...(c.scoring.greatAlternates ?? []), c.scoring.acceptable];
			for (const path of paths) {
				expect(scoreHistory(path.lines, free), `${c.id}: ${path.lines.join(' ; ')}`).toEqual(
					path.expect
				);
			}
		}
	});

	it('grades the canonical paths the way they are named', () => {
		for (const c of allChallenges) {
			expect(gradeAttempt(c, c.scoring.great.lines, true), c.id).toBe('great');
			for (const alt of c.scoring.greatAlternates ?? []) {
				// greatCost is the MAX across great and its alternates, so no
				// equally-good route may be graded down.
				expect(gradeAttempt(c, alt.lines, true), `${c.id} alternate`).toBe('great');
			}
			// An unsolved attempt is a failure however cheap it was.
			expect(gradeAttempt(c, c.scoring.great.lines, false), c.id).toBe('failure');
		}
	});

	it('leaves the beginner a gap to close', () => {
		// If the honest one-command-at-a-time path already scored 'great', the
		// challenge would not be teaching an economy at all.
		for (const c of allChallenges) {
			expect(
				scoreHistory(c.scoring.acceptable.lines, effectiveFreeSet(c)).cost,
				`${c.id} acceptable`
			).toBeGreaterThan(greatCostOf(c));
			expect(gradeAttempt(c, c.scoring.acceptable.lines, true), c.id).toBe('acceptable');
		}
	});
});

describe('the adapter', () => {
	it('puts the brief where the UI expects a hint, and offers no second hint', () => {
		// The whole "no lightbulb" rule, enforced in one place: the card has one
		// prose slot and the brief is what goes in it.
		for (const c of allChallenges) {
			const s = toScenario(c);
			expect(s.id).toBe(c.id);
			expect(s.hint).toBe(c.description);
			expect(s.suggestedCommands).toEqual(c.pool.map((e) => e.command));
			expect(s.check).toBe(c.check);
		}
	});

	it('ships a pool that is overcomplete and salted', () => {
		for (const c of allChallenges) {
			const distractors = c.pool.filter((e) => e.role === 'distractor');
			expect(distractors.length, `${c.id} has no distractors`).toBeGreaterThan(0);
			for (const d of distractors) {
				// A distractor with no post-mortem, no taxonomy entry and no section
				// that warns about it is noise, not instruction.
				expect(d.kind, `${c.id}: ${d.command}`).toBeTruthy();
				expect(d.trap, `${c.id}: ${d.command}`).toBeTruthy();
				expect(d.teaches, `${c.id}: ${d.command}`).toBeTruthy();
			}
			// Never grouped at the end — a block of wrong answers is a giveaway.
			const lastSolution = c.pool.map((e) => e.role).lastIndexOf('solution');
			expect(lastSolution, `${c.id} groups its distractors`).toBeGreaterThan(0);
		}
	});

	/**
	 * THE CHIP BUDGET. See the note on PoolEntry in challenges.ts for why each
	 * of these exists. Together they are what stops the pool drifting back
	 * into a rack of finished answers: a chip fills the prompt, so a chip
	 * holding a whole assembled line is the solution with a button on it.
	 */
	it('keeps every pool entry inside the chip budget', () => {
		for (const c of allChallenges) {
			for (const entry of c.pool) {
				expect(
					entry.command.length,
					`${c.id}: chip is ${entry.command.length} chars, over the ${MAX_POOL_ENTRY_LENGTH} limit — ${entry.command}`
				).toBeLessThanOrEqual(MAX_POOL_ENTRY_LENGTH);

				expect(
					splitSegments(entry.command).length,
					`${c.id}: chip assembles too many stages — ${entry.command}`
				).toBeLessThanOrEqual(MAX_POOL_ENTRY_ELEMENTS);

				// A chip may never hold an `&&`: chaining collapses Enters, and
				// every collapse has to be typed rather than clicked.
				expect(entry.command, `${c.id}: chip pre-chains commands with &&`).not.toContain('&&');
			}
		}
	});

	it('never puts an assembled great line on a chip', () => {
		// A single-command great line may appear — `git status` and
		// `git merge <branch>` are atoms, not answers. An assembled one may
		// not: that is the economy the challenge exists to teach, and clicking
		// it skips the lesson.
		for (const c of allChallenges) {
			const chips = new Set(c.pool.map((e) => e.command));
			const paths = [c.scoring.great, ...(c.scoring.greatAlternates ?? [])];
			for (const path of paths) {
				for (const line of path.lines) {
					if (splitSegments(line).length < 2) continue;
					expect(chips.has(line), `${c.id}: the great line "${line}" is clickable`).toBe(false);
				}
			}
		}
	});

	it('never lets GREAT be bought by clicking', () => {
		// The rule the two above exist to serve, stated directly. ACCEPTABLE
		// must be reachable by chip alone — that is the beginner's floor, and
		// every challenge's pool note promises it. GREAT must not be: at least
		// one line of every economical route has to be composed, or the
		// economy is a purchase rather than a lesson and the grade means
		// nothing.
		for (const c of allChallenges) {
			const chips = new Set(c.pool.map((e) => e.command));
			const paths = [c.scoring.great, ...(c.scoring.greatAlternates ?? [])];
			for (const path of paths) {
				expect(
					path.lines.some((line) => !chips.has(line)),
					`${c.id}: every line of this great route is a chip — GREAT is clickable:\n${path.lines.join('\n')}`
				).toBe(true);
			}
		}
	});

	it('keeps the acceptable path fully clickable', () => {
		// The beginner's floor: an honest learner must be able to finish by
		// clicking. If an acceptable line is not a chip, the pool broke its
		// own promise.
		for (const c of allChallenges) {
			const chips = new Set(c.pool.map((e) => e.command));
			for (const line of c.scoring.acceptable.lines) {
				expect(chips.has(line), `${c.id}: acceptable line "${line}" is not a chip`).toBe(true);
			}
		}
	});
});

/**
 * The scoring tests above are pure arithmetic over the authored `lines`. This
 * one runs those same lines through the REAL engine against the REAL seed and
 * asks the challenge's own `check()` what it thinks — which is the only thing
 * that proves a revised pool still leaves its solutions reachable, and the
 * only thing that would catch a check tightened past its own great path.
 * Every path of every challenge, both tiers.
 */
describe('the solutions actually work', () => {
	for (const c of allChallenges) {
		const paths: [string, string[]][] = [
			['great', c.scoring.great.lines],
			...(c.scoring.greatAlternates ?? []).map((alt, i): [string, string[]] => [
				`greatAlternate ${i + 1}`,
				alt.lines
			]),
			['acceptable', c.scoring.acceptable.lines]
		];

		for (const [name, lines] of paths) {
			it(`${c.id}: the ${name} path reaches the goal and grades as claimed`, async () => {
				const engine = new GitEngine(`unit-test-challenge-${c.id}`);
				const scenario = toScenario(c);
				await loadScenarioSeed(engine, scenario);

				// The seed must not already satisfy the goal, or the check proves
				// nothing about the path that follows.
				expect(await c.check(engine), `${c.id}: the seed already passes`).toBe(false);

				// Errors are results here, not exceptions: some acceptable paths
				// walk into a veto on purpose (the hooks challenge), and the
				// refused command still lands in historyLog — that is the toll.
				for (const line of lines) {
					await runGitCommand(engine, line);
				}

				expect(
					await c.check(engine),
					`${c.id} ${name}: check() still fails after\n${lines.join('\n')}`
				).toBe(true);
				expect(gradeAttempt(c, engine.historyLog, true), `${c.id} ${name}`).toBe(
					name === 'acceptable' ? 'acceptable' : 'great'
				);
			});
		}
	}
});
