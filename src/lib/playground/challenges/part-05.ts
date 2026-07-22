/**
 * Part 5 · Advanced Workflows — the challenge.
 *
 * Cherry-pick is easy to remember and hard to AIM. So the seed buries the
 * gem: the experiment branch's tip is junk, and the one commit worth having
 * sits directly below it. Grabbing the branch name takes the junk;
 * addressing the commit underneath — with the revision syntax Part 4
 * introduced and Part 5 leans on — takes exactly the fix. The release tag on
 * top keeps 5-6 in play: releases get annotated tags, not sticky notes.
 *
 * The beginner's floor is the manual copy: switch over, read the fix, come
 * back, retype it, commit, tag. It works, it is honest, and it costs three
 * times the aimed pick — which is the whole argument for learning to aim.
 */

import type { Challenge } from '../challenges';
import { buildBuriedFixRepo } from '../seed-builders';
import { annotatedTagTarget, fileAtTip, tipMessage, tipOid } from './check-helpers';

export const challengePart5: Challenge = {
	id: 'ch-5-rescue-the-fix',
	partId: 'part-5',
	part: 5,
	title: 'Rescue the Buried Fix',

	description:
		'The experiment branch is a graveyard of half-finished ideas, but somewhere in it is one real fix: the change that makes billing round to cents. Main needs exactly that fix and none of the rest — no dashboard stubs, no wip noise — and the fixed main must then be marked as release v1.0.1 the proper way, with a tag that records who cut it and why. Read the branch history before you move anything: where the fix SITS matters as much as what it says.',

	goal: 'Main carries the rounding fix alone, under a real annotated v1.0.1 tag',

	seedFn: buildBuriedFixRepo,

	/**
	 * The manual-copy route is fully clickable — switching, reading, retyping,
	 * committing, tagging. The aimed cherry-pick is not: the pool offers the
	 * pick only by branch NAME, which lands on the junk tip, and addressing
	 * the commit below it is the move you compose. Two rescue chips (the
	 * step-back reset and the tag delete) exist because two distractors
	 * genuinely need undoing.
	 */
	pool: [
		{ command: 'git log --oneline --all', role: 'solution' },
		{
			command: 'git cherry-pick experiment',
			role: 'distractor',
			kind: 'wrong-target',
			teaches: 'section-5-4',
			trap: 'A branch name points at its TIP, and the tip is the dashboard junk — main just gained a wip commit. The gem sits one commit below; step back and aim lower.'
		},
		{ command: 'git switch experiment', role: 'solution' },
		{
			command: 'git merge experiment',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-5-4',
			trap: 'merge takes the whole branch, junk included — main now contains the dashboard TODO you were told to leave behind. cherry-pick exists precisely for taking one commit and not its friends.'
		},
		{ command: 'cat src/config.py', role: 'solution' },
		{ command: 'git switch main', role: 'solution' },
		{
			command: 'git tag v1.0.1',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-5-6',
			trap: 'A bare tag is lightweight — a sticky note with no author, date, or message. Releases get annotated tags; delete this one before the real tag can take the name.'
		},
		{ command: "echo 'ROUND_CENTS = True' > src/config.py", role: 'solution' },
		{
			command: 'git reset --hard experiment',
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-4-4',
			trap: 'That pointed main at the junk tip itself — main IS the experiment now. The reflog knows where main was; this is exactly the reset the course told you to slow down for.'
		},
		{ command: 'git add src/config.py', role: 'solution' },
		{
			command: 'git chery-pick experiment',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-5-4',
			trap: 'One letter short of a command — the sandbox refused, the Enter counted, and the fix is still sitting on the branch.'
		},
		{ command: 'git reset --hard HEAD~1', role: 'solution' },
		{ command: 'git commit -m "fix: round currency to cents"', role: 'solution' },
		{ command: 'git tag -a v1.0.1 -m "Release: correct rounding"', role: 'solution' },
		{ command: 'git tag -d v1.0.1', role: 'solution' }
	],

	/**
	 * Four conditions: the fix is main's newest commit, the junk never came
	 * along, and v1.0.1 is ANNOTATED and planted on that exact tip. The
	 * subject-line check accepts both routes — the picked commit and the
	 * beginner's retyped one share their subject.
	 */
	check: async (engine) => {
		const tip = await tipOid(engine, 'main');
		if (!tip) return false;
		if (!(await tipMessage(engine, 'main'))?.startsWith('fix: round currency')) return false;
		if ((await fileAtTip(engine, 'main', 'src/config.py')) !== 'ROUND_CENTS = True\n') return false;
		if ((await fileAtTip(engine, 'main', 'src/dashboard.py')) !== null) return false;
		return (await annotatedTagTarget(engine, 'v1.0.1')) === tip;
	},

	scoring: {
		great: {
			lines: [
				'git log --oneline --all',
				'git cherry-pick experiment~1',
				'git tag -a v1.0.1 -m "Release: correct rounding"'
			],
			note: 'Read the map for free, then aim: experiment~1 names the commit UNDER the junk tip, so exactly the fix crosses over. One pick, one annotated tag.',
			expect: { enters: 2, elements: 2, cost: 4 }
		},
		greatAlternates: [
			{
				lines: [
					'git log --oneline --all',
					'git cherry-pick experiment^',
					'git tag -a v1.0.1 -m "Release: correct rounding"'
				],
				note: 'The caret spelling of the same aim — experiment^ and experiment~1 are the same parent, at the same price.',
				expect: { enters: 2, elements: 2, cost: 4 }
			}
		],
		acceptable: {
			lines: [
				'git log --oneline --all',
				'git switch experiment',
				'cat src/config.py',
				'git switch main',
				"echo 'ROUND_CENTS = True' > src/config.py",
				'git add src/config.py',
				'git commit -m "fix: round currency to cents"',
				'git tag -a v1.0.1 -m "Release: correct rounding"'
			],
			note: 'The manual copy: go look at the fix, come back, retype it, commit it, tag it. Every step is honest and the result is identical — it just pays six Enters for what an aimed pick does in two.',
			expect: { enters: 6, elements: 6, cost: 12 }
		}
	}
};
