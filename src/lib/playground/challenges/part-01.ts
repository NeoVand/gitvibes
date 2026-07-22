/**
 * Part 1 · Enterprise Onboarding — the challenge.
 *
 * Part 1 is about identity: every commit records WHO made it, and until you
 * say otherwise this sandbox credits everything to the machine default. The
 * challenge is deliberately small — set who you are, then record the waiting
 * work — because the trap in real onboarding is ORDER, not vocabulary:
 * configure first and every commit is right; commit first and you are
 * amending history on day one.
 *
 * The economy gap is the cheat sheet's own lever: `-a` stages every tracked
 * change on the way into the commit, so the finished note (a tracked file)
 * never needs its own staging step. The clustered line is deliberately NOT
 * in the pool — composing it is the difference between clicking through
 * onboarding and having read the sheet.
 */

import type { Challenge } from '../challenges';
import { fileAtHead, headAuthor } from './check-helpers';

/** The finished note, exactly as the check expects to find it in history. */
const NOTE_DONE = 'Onboarding checklist: laptop, repo access, first build. All done.\n';

export const challengePart1: Challenge = {
	id: 'ch-1-sign-your-work',
	partId: 'part-1',
	part: 1,
	title: 'Sign Your Work',

	description:
		'This sandbox credits every save to the machine default, "Vibe Coder" — check the history and you will see it. Your onboarding note is finished in the working directory but not yet recorded. Tell Git who you are (any name and email, as long as they are yours — the chips offer Ada), then record the finished note so the newest entry in history carries your identity, not the default. The history is the proof: newest commit, your name, your email, the finished note inside it.',

	goal: 'The newest commit records the finished note under YOUR name and email',

	seed: {
		commits: [
			{
				message: 'Initial commit',
				files: [
					{
						path: 'README.md',
						content: '# day-one\nThe onboarding sandbox: one repo, one note, one commit.\n'
					},
					{
						path: 'notes.txt',
						content: 'Onboarding checklist: laptop, repo access, first build.\n'
					}
				]
			}
		],
		workingFiles: [{ path: 'notes.txt', content: NOTE_DONE }]
	},

	/**
	 * Eleven entries for a job that needs four. Every chip the beginner needs
	 * is here — both config lines, the staging step, a commit — but the
	 * clustered `git commit -am` is not: folding the staging step into the
	 * commit is the sheet-reader's move, and clicking it would hand it over.
	 * The distractors are Part 1's own classics: a key without its section, a
	 * transposed subcommand, and the reflexes (amend, restore, push) that
	 * belong to later Parts and solve nothing here.
	 */
	pool: [
		{ command: 'git log', role: 'solution' },
		{
			command: 'git config name "Ada Lovelace"',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-1-1',
			trap: 'Config keys live inside sections — user.name, not name. Git printed its usage text instead of storing anything, and the log still says Vibe Coder.'
		},
		{ command: 'git config user.name "Ada Lovelace"', role: 'solution' },
		{
			command: 'git confg user.email "ada@example.com"',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-1-1',
			trap: "Read the reply back: git did not recognize 'confg', so nothing was stored — and the Enter still counted. The terminal always tells you which word it choked on."
		},
		{ command: 'git config user.email "ada@example.com"', role: 'solution' },
		{ command: 'git config --list', role: 'solution' },
		{
			command: 'git restore notes.txt',
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-4-1',
			trap: 'restore has no undo: it rewrote the note from the last commit, and the finished version you were asked to record is gone. Reset the challenge and start again — and file away that restore discards work by design.'
		},
		{ command: 'git add notes.txt', role: 'solution' },
		{
			command: 'git commit --amend -m "chore: onboarding"',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-4-3',
			trap: 'It ran — and it rewrote the only commit in the repo instead of adding yours. Nothing new was recorded: the finished note is still sitting uncommitted, and you edited history you were never asked to touch.'
		},
		{ command: 'git commit -m "chore: finish onboarding"', role: 'solution' },
		{
			command: 'git push origin main',
			role: 'distractor',
			kind: 'forward-reference',
			teaches: 'section-3-2',
			trap: "It even worked — and it did nothing for the task. Publishing is Part 3's move; the problem here is WHO the history says you are, and pushing the old commit changed nothing about that."
		}
	],

	/**
	 * Identity first, content second: the newest commit must carry a non-default
	 * author AND the finished note. Author alone is not enough (an empty commit
	 * after config would satisfy it), and content alone is not enough (that is
	 * just the default identity committing your work for you).
	 */
	check: async (engine) => {
		const author = await headAuthor(engine);
		if (!author) return false;
		if (author.name === 'Vibe Coder' || author.email === 'vibe@gitvibes.dev') return false;
		return (await fileAtHead(engine, 'notes.txt')) === NOTE_DONE;
	},

	scoring: {
		great: {
			lines: [
				'git config user.name "Ada Lovelace"',
				'git config user.email "ada@example.com"',
				'git commit -am "chore: sign my onboarding note"'
			],
			note: 'Identity first, then one commit: -a stages every tracked change on the way in, so the finished note never needed its own staging step.',
			expect: { enters: 3, elements: 3, cost: 6 }
		},
		greatAlternates: [
			{
				lines: [
					'git config user.name "Ada Lovelace"',
					'git config user.email "ada@example.com"',
					'git commit -a -m "chore: sign my onboarding note"'
				],
				note: 'The same line before clustering — -a and -m spelled separately cost exactly the same, which is the honest price: clustering saves keystrokes, not Enters.',
				expect: { enters: 3, elements: 3, cost: 6 }
			}
		],
		acceptable: {
			lines: [
				'git log',
				'git config user.name "Ada Lovelace"',
				'git config user.email "ada@example.com"',
				'git config --list',
				'git add notes.txt',
				'git commit -m "chore: finish onboarding"',
				'git log'
			],
			note: 'Nothing here is wrong: look, introduce yourself, double-check the config, stage, commit, verify. It is simply five paid commands for what three cover — reading the log is free, but re-reading the config you just wrote is not.',
			expect: { enters: 5, elements: 5, cost: 10 }
		}
	}
};
