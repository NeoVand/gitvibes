/**
 * Part 7 · VS Code Cockpit — the challenge.
 *
 * Part 7 has no sandbox of its own because its subject IS the GUI. So its
 * challenge inverts the Part: every button in the Source Control view maps
 * to one command, and today the cockpit is closed. The task is the SCM
 * view's whole loop — see the changes, stage what you mean, commit with a
 * message, publish the branch — done by hand, which is the proof that the
 * cockpit was a view over Git all along and not a replacement for it.
 *
 * The distractors are GUI habits translated literally: the empty message
 * box, the forgotten Untracked group, committing on the wrong branch with
 * the status bar unread.
 */

import type { Challenge } from '../challenges';
import { fileAtTip, tipOid } from './check-helpers';

const WELCOME_POLISHED = 'def welcome(name):\n    return f"Welcome back, {name}!"\n';

export const challengePart7: Challenge = {
	id: 'ch-7-cockpit-by-hand',
	partId: 'part-7',
	part: 7,
	title: 'The Cockpit, By Hand',

	description:
		"VS Code's Source Control view is one loop: see what changed, stage what you mean, commit with a message, sync. Today the cockpit is closed — fly the same loop by hand. The welcome polish and a brand-new tips file are sitting in the working directory of the feature branch you are standing on; record both in one commit on that branch, and publish the branch so the team's PR dashboard picks it up. Every button maps to one command. Prove you know the mapping.",

	goal: 'Both changes committed on the feature branch and published — the SCM loop, by hand',

	seed: {
		commits: [
			{
				message: 'Initial commit',
				files: [
					{ path: 'README.md', content: '# Welcome Service\n' },
					{
						path: 'src/welcome.py',
						content: 'def welcome(name):\n    return f"hi {name}"\n'
					}
				]
			}
		],
		branches: [{ name: 'feature/welcome-polish', commits: [] }],
		branch: 'feature/welcome-polish',
		workingFiles: [
			{ path: 'src/welcome.py', content: WELCOME_POLISHED },
			{ path: 'src/tips.py', content: 'TIPS = ["invite a teammate", "star the repo"]\n' }
		]
	},

	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git add -u',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-2-2',
			trap: '-u stages what is already tracked and nothing else — the new tips file stayed behind, exactly like ticking Modified in the SCM view and forgetting the Untracked group below it.'
		},
		{ command: 'git diff', role: 'solution' },
		{ command: 'git add src/welcome.py', role: 'solution' },
		{ command: 'git add src/tips.py', role: 'solution' },
		{ command: 'git add .', role: 'solution' },
		{
			command: 'git commit',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-2-3',
			trap: 'The empty message box: the commit view will not commit without a message and neither will the terminal — nothing was recorded, and the reply told you what was missing.'
		},
		{ command: 'git commit -m "feat: warmer welcome and starter tips"', role: 'solution' },
		{
			command: 'git switch main',
			role: 'distractor',
			kind: 'wrong-target',
			teaches: 'section-3-1',
			trap: 'The work belongs on the branch you were standing on — commit after switching and it lands on main instead. The status bar shows the current branch for exactly this reason; switch back before recording anything.'
		},
		{ command: 'git switch feature/welcome-polish', role: 'solution' },
		{
			command: 'git puhs origin feature/welcome-polish',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-3-2',
			trap: "The sandbox does not know 'puhs' — nothing was published, and the PR dashboard is still waiting. Sync only syncs when the word is right."
		},
		{ command: 'git push origin feature/welcome-polish', role: 'solution' }
	],

	check: async (engine) => {
		const tip = await tipOid(engine, 'feature/welcome-polish');
		if (!tip) return false;
		if ((await fileAtTip(engine, 'feature/welcome-polish', 'src/welcome.py')) !== WELCOME_POLISHED)
			return false;
		if ((await fileAtTip(engine, 'feature/welcome-polish', 'src/tips.py')) === null) return false;
		return engine.remote.getBranch('feature/welcome-polish') === tip;
	},

	scoring: {
		great: {
			lines: [
				'git status',
				'git diff',
				'git add .',
				'git commit -m "feat: warmer welcome and starter tips"',
				'git push -u origin feature/welcome-polish'
			],
			note: 'The SCM loop at speed: look for free, stage everything the view would show (all of it is yours here), one commit, and a publish that wires tracking the way the Publish Branch button does.',
			expect: { enters: 3, elements: 3, cost: 6 }
		},
		greatAlternates: [
			{
				lines: [
					'git add src/welcome.py src/tips.py',
					'git commit -m "feat: warmer welcome and starter tips"',
					'git push origin feature/welcome-polish'
				],
				note: 'Naming both files instead of sweeping the directory — the precise spelling of the same stage, at the same price.',
				expect: { enters: 3, elements: 3, cost: 6 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git diff',
				'git add src/welcome.py',
				'git add src/tips.py',
				'git status',
				'git commit -m "feat: warmer welcome and starter tips"',
				'git push origin feature/welcome-polish'
			],
			note: 'One file per stage, a status between clicks — the loop exactly as the SCM view teaches it, one paid Enter slower than staging in one breath.',
			expect: { enters: 4, elements: 4, cost: 8 }
		}
	}
};
