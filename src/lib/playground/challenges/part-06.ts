/**
 * Part 6 · Git for AI Agents — the challenge.
 *
 * The hooks are the mechanical guardrails the Part installs so agents cannot
 * ship debris, and this challenge prices the difference between reading a
 * gate and paying tolls at it. The hooks are ordinary files in the repo;
 * `cat` is free; every refused commit costs exactly what a successful one
 * does. So the economical route reads first and commits once, while the
 * honest beginner route walks into the veto, then reads, then fixes — and
 * the score is the difference.
 *
 * The two bypass distractors matter most: --no-verify and
 * silence-by-demolition both "pass the gate", and both are graded as the
 * failures they are by the check, not by lecture.
 */

import type { Challenge } from '../challenges';
import { buildHookGateRepo } from '../seed-builders';
import { fileAtHead, headMessage } from './check-helpers';

const RUN_CLEAN = 'def run(b):\n    return transform(b)\n';
const CONVENTIONAL =
	/^(Merge|Revert)|^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;

export const challengePart6: Challenge = {
	id: 'ch-6-read-the-gate',
	partId: 'part-6',
	part: 6,
	title: 'Read the Gate First',

	description:
		'This repo guards itself: one hook refuses any commit while the lint fails, another refuses any message that will not parse as a Conventional Commit — the guardrails teams install so agents cannot ship debris. An agent left a debug dump call in the pipeline entrypoint, and your job is to land a clean, properly described commit. The hooks are files in the repo and they will tell you exactly what they check; every refused commit still costs an attempt, and bypassing a gate is not passing it. The pipeline must still work when you are done.',

	goal: 'A clean pipeline and a Conventional Commit made it past both hooks',

	seedFn: buildHookGateRepo,

	/**
	 * Every chip of the walk-into-the-veto route is here, including the
	 * commit you will click twice — once to be refused, once to land. The
	 * `-am` pairing that folds staging into the clean commit is not a chip,
	 * and neither bypass earns anything: --no-verify ships the dump, and
	 * overwriting the pipeline with a stub ships nothing at all.
	 */
	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git commit -am "Fixed it"',
			role: 'distractor',
			kind: 'misconception',
			teaches: 'section-6-2',
			trap: "Two gates, two refusals waiting: the lint hook vetoes while the dump is in the code, and 'Fixed it' is not a Conventional Commit either. The reply names the pattern the message gate wants — read it."
		},
		{ command: 'cat .husky/pre-commit', role: 'solution' },
		{
			command: "echo 'ok' > src/run.py",
			role: 'distractor',
			kind: 'destructive',
			teaches: 'section-6-2',
			trap: 'The linter is happy and the pipeline is gone — you silenced the alarm by demolishing the room. Gates check what they can; keeping the code working is still your job.'
		},
		{ command: 'cat .husky/commit-msg', role: 'solution' },
		{
			command: 'git commit -m "remove debug" --no-verify',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-6-2',
			trap: 'The seatbelt came off: --no-verify bought a commit with the dump still in the code and a message the changelog tooling cannot read. The gate was right, and you overrode it.'
		},
		{ command: "echo 'def run(b):\\n    return transform(b)' > src/run.py", role: 'solution' },
		{
			command: 'git commmit -m "fix: drop the debug dump"',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-2-3',
			trap: "'commmit' is one m too many — the sandbox refused the word itself, before either hook got a say. The Enter still counted."
		},
		{ command: 'git add src/run.py', role: 'solution' },
		{ command: 'git diff', role: 'solution' },
		{ command: 'git commit -m "fix: drop the debug dump"', role: 'solution' }
	],

	/**
	 * Passing means the gates passed something REAL: a new commit whose
	 * message parses, whose pipeline file is exactly the working function —
	 * not merely dump-free, which the stub-overwrite would satisfy.
	 */
	check: async (engine) => {
		const msg = await headMessage(engine);
		if (!msg || msg === 'chore: install husky hooks') return false;
		if (!CONVENTIONAL.test(msg)) return false;
		return (await fileAtHead(engine, 'src/run.py')) === RUN_CLEAN;
	},

	scoring: {
		great: {
			lines: [
				'cat .husky/pre-commit',
				'cat .husky/commit-msg',
				"echo 'def run(b):\\n    return transform(b)' > src/run.py",
				'git commit -am "fix: drop the agent debug dump"'
			],
			note: 'Read both gates for free, fix the file once, and let -a fold staging into a commit that both hooks wave through. No refusals, no tolls.',
			expect: { enters: 2, elements: 2, cost: 4 }
		},
		greatAlternates: [
			{
				lines: [
					'cat .husky/pre-commit',
					"echo 'def run(b):\\n    return transform(b)' > src/run.py",
					'git add src/run.py',
					'git commit -m "fix: drop the agent debug dump"'
				],
				note: 'The unclustered spelling: fix, stage, commit, each on its own Enter — still zero refusals, which is what this challenge actually prices.',
				expect: { enters: 3, elements: 3, cost: 6 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git add src/run.py',
				'git commit -m "fix: drop the debug dump"',
				'cat .husky/pre-commit',
				"echo 'def run(b):\\n    return transform(b)' > src/run.py",
				'git add src/run.py',
				'git commit -m "fix: drop the debug dump"'
			],
			note: 'The toll-paying route: stage, get vetoed, THEN read the gate, fix, stage again, commit again. The refused commit and the doubled staging are the price of committing before reading — the result is identical, the receipt is longer.',
			expect: { enters: 5, elements: 5, cost: 10 }
		}
	}
};
