/**
 * Part 9 · Conclusion — the final challenge.
 *
 * The same three messes as the capstone playground ("Three Messes, One
 * Repo"), regraded: the seed and the pass condition are shared with the
 * `capstone` scenario, but here there is no hint, the pool is salted, and
 * the ORDER is what the score reads. The staged secret, the misplaced
 * commit, and the missing release tag look like three cleanups — until you
 * notice that a hard reset back to the published main handles the secret
 * and the misplaced commit in the same breath, because both live in the gap
 * between local and origin. Plant the branch first, reset to what the team
 * last saw, tag it: three moves.
 */

import type { Challenge } from '../challenges';
import { buildCapstoneRepo } from '../seed-builders';
import { annotatedTagTarget, fileAtTip, git, tipMessage, tipOid } from './check-helpers';

export const challengePart9: Challenge = {
	id: 'ch-9-three-messes',
	partId: 'part-9',
	part: 9,
	title: 'Three Messes, No Hints',

	description:
		'The final exam, and everything at once: a payment feature was committed straight to main (the remote still shows the clean history the team knows), a live Stripe key is sitting STAGED and ready to leak into the next commit, and the cleaned-up main still needs its v1.0.0 release mark. Untangle all three: the key never reaches history, the payment work survives on a branch of its own, and main ends up matching what the team last saw — with a proper annotated release tag on top. Everything you have learned is in play, and the order you work in decides what it costs.',

	goal: 'Secret unstaged, payment commit on its own branch, main tagged v1.0.0',

	seedFn: buildCapstoneRepo,

	/**
	 * The three-tool click path is complete: unstage, plant the branch, step
	 * main back, tag. The three-move route is not clickable end to end — its
	 * reset aims at origin/main, the published truth, and writing that target
	 * yourself is the course's closing thought in one token. The distractors
	 * are the exam's classic wrong turns: committing the pile, publishing the
	 * mistake, restoring the wrong side of the index, and one tilde too many.
	 */
	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git commit -m "chore: save everything"',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-2-4',
			trap: 'That commit carries the staged Stripe key — the secret is in history now, and moving the commit to a branch would take the key along. Unstage first; commits do not forget.'
		},
		{ command: 'git log --oneline', role: 'solution' },
		{
			command: 'git restore .env',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-4-2',
			trap: 'Without --staged, restore rewrites the WORKING copy from the index — the key is still staged. You polished a copy of the thing you were trying to pull back.'
		},
		{ command: 'git restore --staged .env', role: 'solution' },
		{
			command: 'git brnach feature/payments',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-3-1',
			trap: "The sandbox does not know 'brnach', so no branch exists yet — reset main now and the payment commit would have nothing holding onto it."
		},
		{ command: 'git branch feature/payments', role: 'solution' },
		{
			command: 'git reset --hard HEAD~2',
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-4-4',
			trap: 'One tilde too far: that dragged main back past the user-model commit the team already has. The reflog can rescue it — but the exam asked for surgery, not amputation.'
		},
		{ command: 'git reset --hard HEAD~1', role: 'solution' },
		{
			command: 'git push origin main',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-4-6',
			trap: 'Before the cleanup, that publishes the misplaced payment commit — a local mistake just became a shared one, and unsharing history needs a force push and an apology.'
		},
		{ command: 'git tag -a v1.0.0 -m "First stable release"', role: 'solution' }
	],

	/**
	 * The capstone scenario's pass condition, unchanged: the secret is not
	 * staged and never reached history (on either branch), the payment commit
	 * lives on a non-main branch, main ends at the user-model commit, and an
	 * annotated v1.0.0 sits on that exact tip.
	 */
	check: async (engine) => {
		const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
		const envRow = matrix.find(([f]) => f === '.env');
		if (envRow && (envRow[3] === 2 || envRow[3] === 3)) return false;

		if ((await tipMessage(engine, 'main')) !== 'feat: add user model') return false;
		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		let paymentsBranch: string | null = null;
		for (const b of branches) {
			if (b === 'main') continue;
			if ((await tipMessage(engine, b))?.startsWith('feat: add payment')) paymentsBranch = b;
		}
		if (!paymentsBranch) return false;
		if ((await fileAtTip(engine, paymentsBranch, '.env')) !== null) return false;

		const mainTip = await tipOid(engine, 'main');
		return mainTip !== null && (await annotatedTagTarget(engine, 'v1.0.0')) === mainTip;
	},

	scoring: {
		great: {
			lines: [
				'git status',
				'git log --oneline',
				'git branch feature/payments',
				'git reset --hard origin/main',
				'git tag -a v1.0.0 -m "First stable release"'
			],
			note: 'Plant the branch, then reset to the published truth: origin/main is where the team already is, and a hard reset to it drops the misplaced commit AND the staged key in one move. Tag, done — three moves.',
			expect: { enters: 3, elements: 3, cost: 6 }
		},
		greatAlternates: [
			{
				lines: [
					'git branch feature/payments',
					'git reset --hard HEAD~1',
					'git tag -a v1.0.0 -m "Release: first stable"'
				],
				note: 'The same three moves counted in tildes instead of named against the remote — one step back is the same place origin/main points, at the same price.',
				expect: { enters: 3, elements: 3, cost: 6 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git log --oneline',
				'git restore --staged .env',
				'git branch feature/payments',
				'git reset --hard HEAD~1',
				'git tag -a v1.0.0 -m "First stable release"'
			],
			note: 'One tool per mess: unstage the key, plant the branch, step main back, tag. Perfectly correct — it just pays a separate Enter to unstage what the hard reset was about to sweep anyway.',
			expect: { enters: 4, elements: 4, cost: 8 }
		}
	}
};
