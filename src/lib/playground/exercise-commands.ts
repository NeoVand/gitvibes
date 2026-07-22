/**
 * Which commands does the exercise under the learner's cursor reach for?
 *
 * The cheat sheet's focus filter reads this. The scroll-spy anchor of every
 * inline activity IS its scenario id (LessonActivity passes the same string
 * to both props), and a challenge's anchor IS its challenge id — so one
 * lookup against both registries resolves "where the learner is" into an
 * exercise. Playgrounds contribute their `suggestedCommands` walkthrough;
 * challenges contribute the whole kit, distractors included — the cheat
 * sheet explains what each command does, which is exactly the audit a salted
 * pool invites, and it never reveals which pool entries are the solution.
 */
import { playgroundScenarios } from './scenarios';
import { allChallenges } from './challenges';
import { commandWordOf, splitSegments } from './challenge-parsing';

export interface ExerciseFocus {
	/** Anchor/scenario id ('core-loop', 'ch-3-branch-first'). */
	id: string;
	title: string;
	kind: 'playground' | 'challenge';
	/** Command words the exercise's command lines use ('commit', 'log', …). */
	words: ReadonlySet<string>;
}

/**
 * Every command word on one command line: one per pipeline segment.
 * `commandWordOf` already resolves git lines to their SUBCOMMAND —
 * `git commit -m "x"` is a `commit` — which is the granularity the cheat
 * sheet's rows are organized at.
 */
export function commandWordsOf(line: string): string[] {
	const words: string[] = [];
	for (const segment of splitSegments(line)) {
		const word = commandWordOf(segment);
		if (word) words.push(word);
	}
	return words;
}

function toFocus(
	id: string,
	title: string,
	kind: ExerciseFocus['kind'],
	lines: readonly string[]
): ExerciseFocus {
	const words = new Set<string>();
	for (const line of lines) for (const word of commandWordsOf(line)) words.add(word);
	return { id, title, kind, words };
}

/** The exercise an anchor id points at, or null for ordinary sections. */
export function exerciseFocusOf(anchorId: string | null): ExerciseFocus | null {
	if (!anchorId) return null;
	const challenge = allChallenges.find((c) => c.id === anchorId);
	if (challenge) {
		return toFocus(
			challenge.id,
			challenge.title,
			'challenge',
			challenge.pool.map((entry) => entry.command)
		);
	}
	const scenario = playgroundScenarios.find((s) => s.id === anchorId);
	if (scenario) {
		return toFocus(scenario.id, scenario.title, 'playground', scenario.suggestedCommands);
	}
	return null;
}

/** Does a cheat-sheet row's command column use any of the exercise's words? */
export function rowUsesWords(rowCommand: string, words: ReadonlySet<string>): boolean {
	return commandWordsOf(rowCommand).some((word) => words.has(word));
}
