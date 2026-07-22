import { describe, expect, it } from 'vitest';
import { commandWordsOf, exerciseFocusOf, rowUsesWords } from './exercise-commands';

describe('commandWordsOf', () => {
	it('resolves a git line to its subcommand', () => {
		expect(commandWordsOf('git status')).toEqual(['status']);
		expect(commandWordsOf('git commit -m "done"')).toEqual(['commit']);
	});

	it('yields one word per chained segment', () => {
		expect(commandWordsOf('git add . && git commit -m "x"')).toEqual(['add', 'commit']);
	});

	it('does not split on separators inside quotes', () => {
		expect(commandWordsOf('git commit -m "wip; still broken | sorry"')).toEqual(['commit']);
	});

	it('skips VAR=value prefixes and git global flags', () => {
		expect(commandWordsOf('GIT_EDITOR=true git rebase --continue')).toEqual(['rebase']);
		expect(commandWordsOf('git -C repo status')).toEqual(['status']);
	});

	it('keeps non-git commands as their own word', () => {
		expect(commandWordsOf('echo hi > notes.txt')).toEqual(['echo']);
	});
});

describe('exerciseFocusOf', () => {
	it('resolves a playground anchor to its suggested command words', () => {
		const focus = exerciseFocusOf('config');
		expect(focus?.kind).toBe('playground');
		expect(focus?.title).toBe('Introduce yourself to Git');
		for (const word of ['log', 'config', 'add', 'commit']) {
			expect(focus?.words.has(word)).toBe(true);
		}
	});

	it('resolves a challenge anchor to its pool command words', () => {
		const focus = exerciseFocusOf('ch-3-branch-first');
		expect(focus?.kind).toBe('challenge');
		expect(focus?.words.size).toBeGreaterThan(0);
		for (const word of ['status', 'branch', 'switch', 'commit', 'push']) {
			expect(focus?.words.has(word)).toBe(true);
		}
	});

	it('includes distractor words — auditing the salted pool IS the exercise', () => {
		const focus = exerciseFocusOf('ch-3-branch-first');
		// `git stash` and the `git swich` typo are distractors in this pool;
		// the focused sheet must be able to explain them, never omit them.
		expect(focus?.words.has('stash')).toBe(true);
		expect(focus?.words.has('swich')).toBe(true);
	});

	it('returns null for ordinary sections and null input', () => {
		expect(exerciseFocusOf('section-3-2')).toBeNull();
		expect(exerciseFocusOf('hero')).toBeNull();
		expect(exerciseFocusOf(null)).toBeNull();
	});
});

describe('rowUsesWords', () => {
	const words = new Set(['log', 'switch']);

	it('matches a row whose subcommand is in the set', () => {
		expect(rowUsesWords('git log --oneline', words)).toBe(true);
		expect(rowUsesWords('git switch -c <branch>', words)).toBe(true);
	});

	it('rejects rows outside the set, including non-git rows', () => {
		expect(rowUsesWords('git merge <branch>', words)).toBe(false);
		expect(rowUsesWords('gh auth login', words)).toBe(false);
	});
});
