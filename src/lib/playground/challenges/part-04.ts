/**
 * Part 4 · Undo Toolkit — the challenge.
 *
 * Three messes, none pushed: a checkpoint commit that must not ship, a
 * scribble in the working tree, and a staged debug script. The recovery
 * matrix says each mess has its own tool — and then it says something
 * better: because ALL of it is local and the target state is simply "one
 * commit ago", a single hard reset erases the commit, the scribble, and the
 * staged file in one move. Seeing the three messes collapse into one is the
 * widest economy gap in the course, on purpose.
 *
 * The revert distractor is the heart of it: revert is the right tool for
 * PUSHED mistakes, and reaching for it here — where nothing is pushed —
 * leaves the do-not-ship commit in history with an apology stapled on.
 */

import type { Challenge } from '../challenges';
import { buildAgentCheckpointRepo } from '../seed-builders';
import { fileAtHead, git, logDepth } from './check-helpers';

const APP_CLEAN = 'def app():\n    return run()\n';

export const challengePart4: Challenge = {
	id: 'ch-4-pick-your-undo',
	partId: 'part-4',
	part: 4,
	title: 'Pick the Right Undo',

	description:
		"An overnight agent session left three messes in this repo, and none of them have been pushed anywhere. The newest commit on main is a half-done 'checkpoint' the agent had no business committing; the app entrypoint carries a fresh scribble on top of that; and a debugging script is sitting staged, ready to ride into the next commit. Leave the repo as if none of it ever happened: history ends at the parser commit, the entrypoint matches it, nothing staged, nothing scribbled. Every mess has a matching tool — and what is local and unpushed can simply be made to not exist. Choose accordingly.",

	goal: 'History ends at the parser commit — no checkpoint, no scribble, nothing staged',

	seedFn: buildAgentCheckpointRepo,

	/**
	 * The tool-per-mess route is fully clickable: a mixed reset (which also
	 * unstages the debug script — that is what mixed means) plus a restore for
	 * the scribble. The one-move `--hard` line is NOT a chip: writing --hard
	 * yourself, after deciding the working tree holds nothing worth keeping,
	 * is exactly the deliberateness the Part asks for. The distractors are the
	 * matrix's classic misfilings — revert for a local mistake, soft when you
	 * meant gone, one tilde too many, and committing on top as if history
	 * were append-only.
	 */
	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git revert HEAD',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-4-5',
			trap: 'revert is the PUBLIC undo: it added a commit that cancels the checkpoint, so the do-not-ship commit stays in history with a second commit apologizing for it. Nothing here was pushed — local mistakes can simply be removed.'
		},
		{ command: 'git log --oneline', role: 'solution' },
		{
			command: 'git reset --soft HEAD~1',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-4-4',
			trap: "--soft moved the branch but kept the checkpoint's changes STAGED — status now shows them queued to be committed right back. Soft is for re-doing a commit, not for making one disappear."
		},
		{ command: 'git restore src/app.py', role: 'solution' },
		{
			command: 'git reset --hard HEAD~2',
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-4-4',
			trap: 'One tilde too far: that wiped the parser commit too, and with it real work. The reflog can bring it back — and you just learned why --hard deserves a second look before Enter.'
		},
		{ command: 'git reset HEAD~1', role: 'solution' },
		{
			command: 'git rest --hard HEAD~1',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-4-4',
			trap: "'rest' is not a command the sandbox knows — nothing moved, and the Enter counted. Read the terminal's echo before assuming the mess is gone."
		},
		{ command: 'git restore --staged src/debug.py', role: 'solution' },
		{
			command: 'git commit -m "fix: remove checkpoint"',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-4-4',
			trap: 'You cannot delete a commit by adding another — the checkpoint is still there, and the staged debug script just rode along into history on top of it.'
		},
		{ command: 'git reflog', role: 'solution' }
	],

	/**
	 * The end state, not the route: exactly two commits remain, the entrypoint
	 * matches them in history AND on disk, and nothing is staged. The staged
	 * debug script may survive on disk as an untracked file — untracked is
	 * fine; staged is the mess.
	 */
	check: async (engine) => {
		if ((await logDepth(engine, 'main', 10)) !== 2) return false;
		if ((await fileAtHead(engine, 'src/app.py')) !== APP_CLEAN) return false;
		if ((await engine.readFile('src/app.py')) !== APP_CLEAN) return false;
		const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
		return matrix.every(([, , , stage]) => stage !== 2 && stage !== 3);
	},

	scoring: {
		great: {
			lines: ['git status', 'git log --oneline', 'git reset --hard HEAD~1'],
			note: 'One move. --hard resets the branch, the index, and the tracked working files to one commit ago — which erases the checkpoint, the scribble, and the staged script together, because every one of them was local.',
			expect: { enters: 1, elements: 1, cost: 2 }
		},
		greatAlternates: [
			{
				lines: ['git reset --hard HEAD^'],
				note: 'The same move in caret spelling — HEAD^ and HEAD~1 name the same parent, and neither is cheaper than the other.',
				expect: { enters: 1, elements: 1, cost: 2 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git log --oneline',
				'git reset HEAD~1',
				'git status',
				'git restore src/app.py'
			],
			note: 'Tool per mess: a mixed reset drops the checkpoint and — because mixed resets the index — unstages the debug script with it, then a restore clears the scribble. Two paid moves for what --hard does in one, and nothing about it is wrong.',
			expect: { enters: 2, elements: 2, cost: 4 }
		}
	}
};
