/**
 * Part 8 · CI, Bots & Releases — the challenge.
 *
 * The bot did its half — a branch with one chore(deps) commit, the exact
 * shape of the PRs it opens on GitHub — and this challenge grades the human
 * half: review, land, clean up, release. Two judgments carry the score.
 * First, HOW you review: a diff against main reads the proposal for free,
 * where the field trip (switch over, look around, switch back) pays two
 * Enters to learn the same thing. Second, WHAT the release is: a chore(deps)
 * commit is a patch, so the tag is v1.2.1 — the version number is read off
 * the commit type, exactly the way the release bots do it.
 */

import type { Challenge } from '../challenges';
import { buildBotBumpRepo } from '../seed-builders';
import { annotatedTagTarget, git, logContains, tipOid } from './check-helpers';

export const challengePart8: Challenge = {
	id: 'ch-8-review-the-robot',
	partId: 'part-8',
	part: 8,
	title: 'Review the Robot',

	description:
		"A branch named dependabot/npm-axios-1.7.4 appeared overnight — the dependency bot proposing a version bump, the same shape as the PRs it opens on GitHub. Be the human in the loop: see exactly what the bot wants to change before it touches main, land the change, remove the finished branch, and cut the release this kind of change calls for — versioned by what the commit type says it is, marked the way releases are marked. The last release was v1.2.0; the bot's commit tells you everything else you need.",

	goal: "The bot's bump is on main, the branch is gone, and v1.2.1 is a real annotated tag",

	seedFn: buildBotBumpRepo,

	/**
	 * Both review styles are clickable — the diff and the full field trip —
	 * because pricing them against each other IS the exercise. The release
	 * tag chip exists for the beginner; the economical route writes its own
	 * tag line. The -D force-delete is the one distractor with real teeth
	 * here: clicked before the merge, it takes the bot's commit with it.
	 */
	pool: [
		{ command: 'git log --oneline --all', role: 'solution' },
		{
			command: 'git branch -D dependabot/npm-axios-1.7.4',
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-8-2',
			trap: "-D deletes without the merged check — before the merge, the bot's commit goes with the branch. -d would have refused, and that refusal is information."
		},
		{ command: 'git diff main..dependabot/npm-axios-1.7.4', role: 'solution' },
		{ command: 'git switch dependabot/npm-axios-1.7.4', role: 'solution' },
		{
			command: 'git mrege dependabot/npm-axios-1.7.4',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-3-2',
			trap: "The sandbox does not know 'mrege' — nothing merged, and the bot's proposal is still waiting. Check the reply before checking the log."
		},
		{ command: 'cat package.json', role: 'solution' },
		{ command: 'git switch main', role: 'solution' },
		{ command: 'git merge dependabot/npm-axios-1.7.4', role: 'solution' },
		{
			command: 'git tag -a v1.3.0 -m "Release: axios bump"',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-8-3',
			trap: 'A dependency patch is not a feature: chore(deps) bumps the PATCH digit, so the next release is v1.2.1. Release tooling reads the version off the commit type — that is the whole convention.'
		},
		{ command: 'git branch -d dependabot/npm-axios-1.7.4', role: 'solution' },
		{
			command: 'git tag v1.2.1',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-5-6',
			trap: 'A bare tag is lightweight — no author, no date, no message. Releases are annotated so the tag itself says who cut it and why; delete this one to free the name.'
		},
		{ command: 'git tag -a v1.2.1 -m "Release: dependency patch"', role: 'solution' },
		{ command: 'git tag -d v1.2.1', role: 'solution' }
	],

	check: async (engine) => {
		const tip = await tipOid(engine, 'main');
		if (!tip) return false;
		if (!(await logContains(engine, 'main', 'chore(deps): bump axios'))) return false;
		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		if (branches.some((b) => b.startsWith('dependabot/'))) return false;
		return (await annotatedTagTarget(engine, 'v1.2.1')) === tip;
	},

	scoring: {
		great: {
			lines: [
				'git log --oneline --all',
				'git diff main..dependabot/npm-axios-1.7.4',
				'git merge dependabot/npm-axios-1.7.4',
				'git branch -d dependabot/npm-axios-1.7.4',
				'git tag -a v1.2.1 -m "Release: bump axios to 1.7.4"'
			],
			note: 'Review with a diff — reading the proposal is free — then land, clean up with the safe delete, and cut the patch release the commit type asked for.',
			expect: { enters: 3, elements: 3, cost: 6 }
		},
		greatAlternates: [
			{
				lines: [
					'git diff main..dependabot/npm-axios-1.7.4',
					'git merge dependabot/npm-axios-1.7.4',
					'git tag -a v1.2.1 -m "Release: bump axios to 1.7.4"',
					'git branch -d dependabot/npm-axios-1.7.4'
				],
				note: 'Tag first, sweep second — the release and the cleanup commute, and neither order is cheaper.',
				expect: { enters: 3, elements: 3, cost: 6 }
			}
		],
		acceptable: {
			lines: [
				'git log --oneline --all',
				'git switch dependabot/npm-axios-1.7.4',
				'cat package.json',
				'git switch main',
				'git merge dependabot/npm-axios-1.7.4',
				'git branch -d dependabot/npm-axios-1.7.4',
				'git tag -a v1.2.1 -m "Release: dependency patch"'
			],
			note: 'The field trip: switch to the branch, read the file, switch back. It answers the same question the diff answers — for two paid Enters the diff never charges.',
			expect: { enters: 5, elements: 5, cost: 10 }
		}
	}
};
