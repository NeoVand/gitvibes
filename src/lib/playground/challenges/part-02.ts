/**
 * Part 2 · Core Safety Loop — the challenge.
 *
 * The loop the Part drills is status → diff → stage → commit, and the skill
 * it actually tests is the STAGE step: the working directory holds real work
 * and real debris side by side, and `git add .` — the reflex this Part exists
 * to break — would ship all four. The check is unforgiving about the secret,
 * because history is: a committed key is a leaked key.
 *
 * The economy gap is precision: one add that names both trusted files (or a
 * `-am` that pairs with one explicit add) against staging them one at a time
 * with a status check between each. Both are correct; one is the loop played
 * at full speed.
 */

import type { Challenge } from '../challenges';
import { fileAtHead } from './check-helpers';

const SERVER_FIXED = 'def serve():\n    return app.run(retries=3)\n';
const LIMITER = 'def limit(ip):\n    return bucket.take(ip)\n';

export const challengePart2: Challenge = {
	id: 'ch-2-stage-what-you-trust',
	partId: 'part-2',
	part: 2,
	title: 'Stage Only What You Trust',

	description:
		'Overnight, your pair-programming agent touched the working directory: the retry fix you asked for in the server file, a brand-new rate limiter, its own API key parked in .env, and a noisy trace log. Ship the work — the server fix and the limiter, together, in one commit a teammate could read. The key and the log must never enter history; a secret that gets committed is leaked, full stop. When the newest commit holds exactly the two code files and nothing else, you are done.',

	goal: 'One commit carries the server fix and the limiter — the secret and the log stayed out',

	seed: {
		commits: [
			{
				message: 'Initial commit',
				files: [
					{ path: 'README.md', content: '# API Service\n' },
					{ path: 'src/server.py', content: 'def serve():\n    return app.run()\n' }
				]
			}
		],
		workingFiles: [
			{ path: 'src/server.py', content: SERVER_FIXED },
			{ path: 'src/limiter.py', content: LIMITER },
			{ path: '.env', content: 'OPENAI_API_KEY=sk-vibe-9f2e11\n' },
			{ path: 'debug.log', content: 'TRACE 04:12 retry storm — 61 attempts in 90s\n' }
		]
	},

	/**
	 * Eleven entries for a two-command job. The honest one-file-at-a-time path
	 * is fully clickable; the multi-file add and the `-am` pairing are not,
	 * because choosing WHAT to stage in one breath is the skill. The
	 * distractors are the four ways this exact morning goes wrong: the greedy
	 * add, the half-shipping -a, staging the secret itself, and reaching for
	 * push before anything is saved.
	 */
	pool: [
		{ command: 'git status', role: 'solution' },
		{
			command: 'git add .',
			role: 'distractor',
			kind: 'overreach',
			teaches: 'section-2-4',
			trap: 'The dot staged everything it could see — the API key and the trace log included. status now shows the secret one Enter away from history; unstage it before any commit, or this becomes a leak.'
		},
		{ command: 'git diff', role: 'solution' },
		{
			command: 'git commit -am "feat: quick ship"',
			role: 'distractor',
			kind: 'works-but-wrong',
			teaches: 'section-2-2',
			trap: '-a stages TRACKED changes only, so the brand-new limiter never made it in: the commit shipped half the feature and looked green doing it. New files always need an explicit add first.'
		},
		{ command: 'git add src/server.py', role: 'solution' },
		{
			command: 'git add .env',
			role: 'distractor',
			kind: 'wrong-target',
			teaches: 'section-2-4',
			trap: 'The one file that must never reach history is now sitting in the staging area. Nothing is lost yet — but the next commit would carry the key, and commits do not forget.'
		},
		{ command: 'git add src/limiter.py', role: 'solution' },
		{
			command: 'git stauts',
			role: 'distractor',
			kind: 'typo',
			teaches: 'section-2-1',
			trap: "Read the reply: the sandbox does not know 'stauts', so nothing ran — and the Enter still counted. The safety loop only works when the looking command actually looks."
		},
		{ command: 'git restore --staged .', role: 'solution' },
		{ command: 'git commit -m "feat: add the rate limiter"', role: 'solution' },
		{
			command: 'git push origin main',
			role: 'distractor',
			kind: 'forward-reference',
			teaches: 'section-3-2',
			trap: "It pushed the commit you already had. Your actual work is still sitting unstaged — sharing comes after saving, not instead of it, and push is Part 3's tool besides."
		}
	],

	check: async (engine) => {
		if ((await fileAtHead(engine, 'src/server.py')) !== SERVER_FIXED) return false;
		if ((await fileAtHead(engine, 'src/limiter.py')) === null) return false;
		if ((await fileAtHead(engine, '.env')) !== null) return false;
		return (await fileAtHead(engine, 'debug.log')) === null;
	},

	scoring: {
		great: {
			lines: [
				'git status',
				'git diff',
				'git add src/server.py src/limiter.py',
				'git commit -m "feat: add the rate limiter"'
			],
			note: 'Look for free, then stage both trusted files in one breath and commit. Naming the files IS the review — nothing greedy, nothing forgotten.',
			expect: { enters: 2, elements: 2, cost: 4 }
		},
		greatAlternates: [
			{
				lines: ['git add src/limiter.py', 'git commit -am "feat: add the rate limiter"'],
				note: 'The other pairing: add the one file -a cannot see, then let -a sweep in the tracked fix on the way into the commit. Genuinely equal, not second-best.',
				expect: { enters: 2, elements: 2, cost: 4 }
			}
		],
		acceptable: {
			lines: [
				'git status',
				'git diff',
				'git add src/server.py',
				'git add src/limiter.py',
				'git status',
				'git commit -m "feat: add the rate limiter"'
			],
			note: 'One file per add, a status between steps — the loop exactly as Part 2 first teaches it. Correct and careful; just one paid Enter more than naming both files at once.',
			expect: { enters: 3, elements: 3, cost: 6 }
		}
	}
};
