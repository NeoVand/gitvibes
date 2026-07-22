/**
 * Part 3 · Branching & PRs — the challenge.
 *
 * The Part's one commandment: experiments live on branches, and stable
 * branches stay boring. The seed is an agent refactor sitting uncommitted on
 * main — the exact moment the commandment applies — and the check watches
 * both ends: the work must reach a published branch, and main must still
 * point exactly where the team last saw it.
 *
 * The economy gap is the Part's two clustered levers: `switch -c` creates
 * and moves in one Enter, `push -u` publishes and wires tracking in one.
 * The pool carries only the unclustered spellings; folding them is the
 * reader's move.
 */

import type { Challenge } from '../challenges';
import { buildBranchingRepo } from '../seed-builders';
import { fileAtTip, tipOid } from './check-helpers';

export const challengePart3: Challenge = {
	id: 'ch-3-branch-first',
	partId: 'part-3',
	part: 3,
	title: 'Branch Before You Build',

	description:
		"Main is stable, reviewed, and already published; your agent's refactor — a changed pipeline file and a brand-new helper — is neither. Experiments get a home of their own: put this one on its own branch, record BOTH files there, and publish that branch so a teammate could open a pull request against it. One hard condition: when you are done, main must still point exactly where the team last saw it. The refactor is already reviewed — all of it is yours to keep.",

	goal: 'The experiment lives on its own published branch, and main never moved',

	seedFn: buildBranchingRepo,

	/**
	 * The honest route — create, move, stage, commit, push — is fully
	 * clickable. The clustered spellings are not, and neither is anything
	 * that would touch main: the commit-straight-to-main reflex is here as
	 * the works-but-wrong it is, and the two force-flavored reflexes are here
	 * because this is the Part where people first meet them in the wild.
	 */
	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git commit -am "feat: agent refactor, round one"',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-3-1',
			trap: 'That committed straight to main — the stable branch just absorbed an experiment, and -a skipped the brand-new helper file besides. Branch first; main is for work the team already trusts.'
		},
		{ command: 'git diff', role: 'solution' },
		{ command: 'git branch feature/agent-refactor', role: 'solution' },
		{
			command: 'git swich -c feature/agent-refactor',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-3-1',
			trap: "The sandbox does not know 'swich', so no branch was created and you have not moved — check the reply before assuming you are somewhere new."
		},
		{ command: 'git switch feature/agent-refactor', role: 'solution' },
		{
			command: 'git stash',
			role: 'distractor',
			kind: 'forward-reference',
			teaches: 'section-5-1',
			trap: "It worked — and now the refactor is HIDDEN, not homed. stash is Part 5's shelf for work you need out of the way; the ask here was to keep the work and give it a branch. Type git stash pop to get it back."
		},
		{ command: 'git add .', role: 'solution' },
		{
			command: 'git push --force origin main',
			role: 'distractor',
			kind: 'forward-reference',
			teaches: 'section-4-6',
			trap: "It ran — and only because your main happens to match the remote. The reflex is the damage: --force on a shared branch overwrites teammates' work without asking. Part 4 covers the one narrow case where force is ever allowed."
		},
		{ command: 'git commit -m "feat: agent refactor, round one"', role: 'solution' },
		{ command: 'git push origin feature/agent-refactor', role: 'solution' }
	],

	/**
	 * Three conditions, all load-bearing: some branch other than main was
	 * pushed and matches its local tip; that tip carries BOTH files (the
	 * helper is exactly what `commit -am` silently drops); and main still
	 * equals what the remote saw before the exercise started.
	 */
	check: async (engine) => {
		const mainTip = await tipOid(engine, 'main');
		if (!mainTip || engine.remote.getBranch('main') !== mainTip) return false;

		for (const [branch, remoteOid] of engine.remote.branches) {
			if (branch === 'main') continue;
			const local = await tipOid(engine, branch);
			if (!local || local !== remoteOid) continue;
			const helper = await fileAtTip(engine, branch, 'src/utils.py');
			const pipeline = await fileAtTip(engine, branch, 'src/main.py');
			if (helper !== null && pipeline === 'def main():\n    run_ai_pipeline()\n') return true;
		}
		return false;
	},

	scoring: {
		great: {
			lines: [
				'git switch -c feature/agent-refactor',
				'git add .',
				'git commit -m "feat: agent refactor, round one"',
				'git push -u origin feature/agent-refactor'
			],
			note: 'Both clustered levers at once: -c creates and moves in one Enter, -u publishes and wires tracking in one. Four moves, nothing wasted, main untouched.',
			expect: { enters: 4, elements: 4, cost: 8 }
		},
		greatAlternates: [
			{
				lines: [
					'git checkout -b feature/agent-refactor',
					'git add .',
					'git commit -m "feat: agent refactor, round one"',
					'git push -u origin feature/agent-refactor'
				],
				note: 'The older spelling of the same move — checkout -b and switch -c are one lever with two names, and neither costs more than the other.',
				expect: { enters: 4, elements: 4, cost: 8 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git branch feature/agent-refactor',
				'git switch feature/agent-refactor',
				'git add .',
				'git commit -m "feat: agent refactor, round one"',
				'git push origin feature/agent-refactor'
			],
			note: 'Create, then move, then the loop, then a plain push. Every step is right; it just spends an extra Enter creating and moving separately, and leaves upstream tracking for a later day.',
			expect: { enters: 5, elements: 5, cost: 10 }
		}
	}
};
