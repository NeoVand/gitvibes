/**
 * Challenges — the graded, unhinted counterpart to a PlaygroundScenario.
 *
 * A scenario teaches: it shows a hint and a pool of commands that, clicked in
 * order, walk you to the answer. A challenge tests: no hint, an overcomplete
 * and deliberately salted pool, and a score. One challenge closes each Part.
 *
 * This file is the shared machinery. The nine per-part challenges live in
 * src/lib/playground/challenges/part-NN.ts and are re-exported from here.
 */

import type { GitEngine, RepoSeed } from './git-engine';
import { commandTokensOf, commandWordOf, splitSegments } from './challenge-parsing';

export { commandTokensOf, commandWordOf, splitSegments };
import type { PlaygroundScenario } from './scenarios';

/* ── the pool ──────────────────────────────────────────────────────── */

/**
 * Why a distractor is wrong. The taxonomy is closed on purpose: nine authors
 * picking from the same seven kinds is what makes nine challenges feel like
 * one system.
 */
export type DistractorKind =
	| 'typo' //  git comit, git swich — the terminal's answer is "not supported"
	| 'misconception' //  a real belief a beginner holds (commit scoops up everything)
	| 'wrong-target' //  right command, aimed at the wrong file / branch / commit
	| 'works-but-wrong' //  exits 0, produces the wrong history — the nastiest kind
	| 'destructive' //  succeeds and costs you work you have to redo
	| 'overreach' //  a `git add .` that stages more than intended
	| 'forward-reference'; //  a tool from a later Part: it may even work, but it is not yours yet

/**
 * THE CHIP BUDGET — the pool is a box of parts, not a rack of finished answers.
 *
 * A chip click fills the prompt; it does not run anything. So a chip that
 * holds a whole assembled line is not a hint, it is the answer with a button
 * on it. Three rules keep the pool at the granularity of a Part, and
 * challenges.test.ts enforces all three against every entry of all nine
 * challenges.
 *
 *   1. MAX_POOL_ENTRY_LENGTH characters, hard. At the card's monospace size a
 *      60-character chip still sits on one line at every width the article
 *      uses; past that they wrap, and a pool of two-line chips is unreadable.
 *   2. At most MAX_POOL_ENTRY_ELEMENTS command elements, and never an `&&`.
 *      Joining stages is the learner's work, not a purchase.
 *   3. No entry may equal a multi-element line of `great` or of any
 *      `greatAlternate`. A single-command great line may appear — `git status`
 *      and `git merge <branch>` are atoms, not answers — but an assembled
 *      line never does.
 *
 * None of this licenses softening the distractors. A shorter distractor must
 * still be a mistake a learner would actually make, still carry its `kind`,
 * `trap` and `teaches`, and still spring.
 */
export const MAX_POOL_ENTRY_LENGTH = 60;
export const MAX_POOL_ENTRY_ELEMENTS = 2;

export interface PoolEntry {
	/**
	 * Exactly as it appears on the chip, and exactly as it runs. Subject to
	 * the chip budget above.
	 */
	command: string;
	role: 'solution' | 'distractor';
	/** Required when role === 'distractor'. */
	kind?: DistractorKind;
	/**
	 * Required when role === 'distractor'. One sentence, second person, shown
	 * as a post-mortem after a failed or expensive attempt. It must name what
	 * the command actually did — not just that it was wrong.
	 */
	trap?: string;
	/**
	 * Required when role === 'distractor'. The section id whose prose warns
	 * about this exact mistake, e.g. 'section-2-4'. A distractor the course
	 * never warns about is noise, not instruction — drop it.
	 */
	teaches?: string;
}

/* ── solutions ─────────────────────────────────────────────────────── */

export interface SolutionPath {
	/** One string per Enter press, in order. Runnable verbatim in the sandbox. */
	lines: string[];
	/** One sentence naming the move that makes this path what it is. */
	note: string;
	/**
	 * Author-asserted counts, cross-checked by challenges.test.ts against
	 * scoreHistory(). They are redundant on purpose: a mismatch means the
	 * author's mental model of the scoring diverged from the scoring.
	 */
	expect: { enters: number; elements: number; cost: number };
}

export interface ChallengeScoring {
	/** The economical path. Uses the Part's signature lever. */
	great: SolutionPath;
	/**
	 * Other paths the author judges equally economical — `git checkout -b`
	 * where the canonical route said `git switch -c`, say. greatCost is the
	 * MAX cost across `great` and every alternate, so no equally-good route
	 * is punished. Enumerating these is mandatory thinking, not optional
	 * polish: if you cannot name a second good route, the challenge is
	 * probably too narrow.
	 */
	greatAlternates?: SolutionPath[];
	/** The beginner's honest path: one command per line, no cleverness. */
	acceptable: SolutionPath;
}

/* ── the challenge ─────────────────────────────────────────────────── */

export interface Challenge {
	/** Stable id, kebab-case, prefixed by part: 'ch-4-pick-your-undo'. */
	id: string;
	/** The anchor id of the owning Part: 'part-4'. */
	partId: `part-${number}`;
	/** 1..9, matching partId. */
	part: number;
	title: string;
	/**
	 * The brief. Replaces the hint — this is ALL the learner gets. State the
	 * situation and the goal state precisely enough that success is
	 * unambiguous, and say nothing about which commands to use.
	 */
	description: string;
	/** One line naming the goal state, shown when the check passes. */
	goal: string;
	/**
	 * Overcomplete and salted. Authored order is the display order — do not
	 * randomize, or screenshots and tests stop being reproducible. Interleave
	 * distractors among solution entries; never group them at the end.
	 */
	pool: PoolEntry[];
	/** Exactly one of seed / seedFn, mirroring PlaygroundScenario. */
	seed?: RepoSeed;
	seedFn?: (engine: GitEngine) => Promise<void>;
	/** Mandatory here (it is optional on PlaygroundScenario). */
	check: (engine: GitEngine) => Promise<boolean>;
	scoring: ChallengeScoring;
	/**
	 * Command words from FREE_COMMANDS that this challenge counts anyway,
	 * because they ARE its signature skill. Keep it minimal — git's own
	 * recon/action split is clean enough that most challenges need nothing
	 * here.
	 */
	notFree?: string[];
}

/* ── the free list ─────────────────────────────────────────────────── */

/**
 * Recon is free.
 *
 * The course says it from Part 2 on and never stops: `git status` before you
 * stage, `git diff` before you commit, `git log` before you reset. A score
 * that charged for looking would teach the opposite of the course. So a line
 * that only inspects costs nothing, and economy is measured purely in the
 * commands that CHANGE the repository.
 *
 * A line is free only if BOTH hold:
 *   1. it contains no unquoted redirection operator (`>` — in this sandbox
 *      that always means writing a file), and
 *   2. every segment is a read: its command word is in the effective free
 *      set, AND — for the words that moonlight as actions — its arguments
 *      keep it a read. `git branch` lists and is free; `git branch -d x`
 *      deletes and costs. `git stash list` is free; `git stash` stashes and
 *      costs. `git remote -v` is free; `git remote add` would cost.
 *
 * Anything not on this list counts — including unknown words. Counting the
 * unknown is the safe direction.
 */
export const FREE_COMMANDS: ReadonlySet<string> = new Set([
	'branch', // list form only — see isReconSegment
	'cat',
	'clear',
	'diff',
	'help',
	'log',
	'ls',
	'reflog',
	'remote', // -v / bare only
	'show',
	'stash', // `stash list` only
	'status'
]);

export function effectiveFreeSet(challenge: Challenge): ReadonlySet<string> {
	if (!challenge.notFree?.length) return FREE_COMMANDS;
	const set = new Set(FREE_COMMANDS);
	for (const name of challenge.notFree) set.delete(name);
	return set;
}

/** Flags under which `git branch` is still just a listing. */
const BRANCH_LIST_FLAGS = new Set(['-a', '--all', '-v', '-vv', '--verbose', '-r', '--list']);

/**
 * Is this single segment pure recon? The word must be free, and for the
 * three git words that are reads in one spelling and actions in another,
 * the arguments decide.
 */
export function isReconSegment(segment: string, free: ReadonlySet<string>): boolean {
	const [word, ...args] = commandTokensOf(segment);
	if (!word || !free.has(word)) return false;
	if (word === 'branch') {
		// Any positional argument creates/deletes/renames; only list flags stay a read.
		return args.every((a) => BRANCH_LIST_FLAGS.has(a));
	}
	if (word === 'stash') {
		return args[0] === 'list';
	}
	if (word === 'remote') {
		return args.every((a) => a === '-v' || a === '--verbose');
	}
	return true;
}

/* ── parsing ───────────────────────────────────────────────────────── */

/** Does the line redirect, outside quotes? In this sandbox `>` writes a file. */
export function hasRedirection(line: string): boolean {
	let quote: '' | "'" | '"' = '';
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quote) {
			if (ch === quote) quote = '';
			continue;
		}
		if (ch === "'" || ch === '"') {
			quote = ch;
			continue;
		}
		if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return false;
		if (ch === '>' || ch === '<') return true;
	}
	return false;
}

/* ── scoring ───────────────────────────────────────────────────────── */

export interface AttemptScore {
	/** Counted Enter presses — history lines that were not free. */
	enters: number;
	/** Counted elements — simple commands inside those lines. */
	elements: number;
	/** enters + elements. Lower is better. */
	cost: number;
}

export type ChallengeGrade = 'great' | 'acceptable' | 'failure';

/**
 * Score a history log. This is the ONLY measurement; `engine.historyLog` is
 * the only durable record of an attempt (commands.ts pushes exactly one
 * trimmed entry per executed line, before running it, failures included).
 * Clicking a pool chip merely fills the input box — it is not observable —
 * so "pool elements used" is measured as simple commands in the history,
 * which is the same number for anyone who clicks their way through.
 */
export function scoreHistory(
	history: readonly string[],
	free: ReadonlySet<string> = FREE_COMMANDS
): AttemptScore {
	let enters = 0;
	let elements = 0;
	for (const raw of history) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const segments = splitSegments(line);
		if (!segments.length) continue;
		const isFree = !hasRedirection(line) && segments.every((s) => isReconSegment(s, free));
		if (isFree) continue;
		enters += 1;
		elements += segments.length;
	}
	return { enters, elements, cost: enters + elements };
}

/** The cost a learner must meet or beat to score GREAT. Derived, never typed. */
export function greatCostOf(challenge: Challenge): number {
	const free = effectiveFreeSet(challenge);
	const paths = [challenge.scoring.great, ...(challenge.scoring.greatAlternates ?? [])];
	return Math.max(...paths.map((p) => scoreHistory(p.lines, free).cost));
}

/**
 * The verdict. Call it the FIRST time `check()` returns true and freeze the
 * result — a learner who keeps poking around after succeeding must not be
 * demoted for it. Until check() has ever passed, the grade is 'failure'.
 */
export function gradeAttempt(
	challenge: Challenge,
	history: readonly string[],
	goalReached: boolean
): ChallengeGrade {
	if (!goalReached) return 'failure';
	const cost = scoreHistory(history, effectiveFreeSet(challenge)).cost;
	return cost <= greatCostOf(challenge) ? 'great' : 'acceptable';
}

/* ── adapter ───────────────────────────────────────────────────────── */

/**
 * Render a Challenge through the existing playground UI with zero changes to
 * it: the chips come from the pool, and `hint` — which the UI renders above
 * the terminal — carries the challenge description instead of a hint. That
 * substitution is the whole "no lightbulb" rule, enforced in one place.
 *
 * `description` is deliberately the SAME string, and GitPlayground knows it:
 * for a challenge it does not also echo `description` into the terminal
 * scrollback, because that would print the brief twice a few pixels apart.
 * The brief has exactly one home on the card — the slot above the terminal,
 * with the card's one Puzzle icon beside it.
 */
export function toScenario(challenge: Challenge): PlaygroundScenario {
	return {
		id: challenge.id,
		title: challenge.title,
		description: challenge.description,
		hint: challenge.description,
		suggestedCommands: challenge.pool.map((entry) => entry.command),
		seed: challenge.seed,
		seedFn: challenge.seedFn,
		goal: challenge.goal,
		check: challenge.check
	};
}

/* ── the nine ──────────────────────────────────────────────────────── */

import { challengePart1 } from './challenges/part-01';
import { challengePart2 } from './challenges/part-02';
import { challengePart3 } from './challenges/part-03';
import { challengePart4 } from './challenges/part-04';
import { challengePart5 } from './challenges/part-05';
import { challengePart6 } from './challenges/part-06';
import { challengePart7 } from './challenges/part-07';
import { challengePart8 } from './challenges/part-08';
import { challengePart9 } from './challenges/part-09';

/**
 * One challenge per Part, in course order. The sidebar's challenge rows and
 * the anchor list both mirror this, so the order here IS the order they
 * render in.
 */
export const allChallenges: readonly Challenge[] = [
	challengePart1,
	challengePart2,
	challengePart3,
	challengePart4,
	challengePart5,
	challengePart6,
	challengePart7,
	challengePart8,
	challengePart9
];

/** Anchor ids, for cross-checking against sections.ts. */
export const challengeIds: readonly string[] = allChallenges.map((c) => c.id);

/** The challenge belonging to a Part number (1..9), or undefined. */
export function challengeForPart(part: number): Challenge | undefined {
	return allChallenges.find((c) => c.part === part);
}
