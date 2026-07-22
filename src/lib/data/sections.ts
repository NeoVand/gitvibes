export const sectionIds = [
	'hero',
	'section-intro-what',
	'section-intro-history',
	'section-intro-install',
	'section-intro-repo',
	'part-1',
	'section-1-1',
	'section-1-2',
	'section-1-3',
	'part-2',
	'section-2-1',
	'section-2-2',
	'section-2-3',
	'section-2-4',
	'part-3',
	'section-3-1',
	'section-3-2',
	'section-3-3',
	'part-4',
	'section-4-1',
	'section-4-2',
	'section-4-3',
	'section-4-4',
	'section-4-5',
	'section-4-6',
	'section-4-7',
	'section-4-8',
	'section-4-9',
	'part-5',
	'section-5-1',
	'section-5-2',
	'section-5-3',
	'section-5-4',
	'section-5-5',
	'section-5-6',
	'part-6',
	'section-6-1',
	'section-6-2',
	'section-6-3',
	'part-7',
	'section-7-1',
	'section-7-2',
	'section-7-3',
	'part-8',
	'section-8-1',
	'section-8-2',
	'section-8-3',
	'part-9',
	'section-9-1',
	'section-9-2',
	'section-9-3',
	'section-9-4'
] as const;

/**
 * Anchor ids of the embedded playground activities (the sidebar's gamepad
 * entries). Kept separate from sectionIds so the part/section hierarchy stays
 * clean, but deep links and scroll-spy treat them the same way.
 */
export const playgroundAnchorIds = [
	'config',
	'core-loop',
	'wrong-branch',
	'sync-remote',
	'branching',
	'accidental-stage',
	'force-push',
	'undo',
	'detached-head',
	'reflog-rescue',
	'stash',
	'rebase-merge',
	'conflicts',
	'cherry-pick',
	'rebase-conflict',
	'release-tags',
	'interactive-rebase',
	'bisect',
	'hooks',
	'worktrees',
	'bot-pr',
	'release-robot',
	'capstone'
] as const;

/**
 * Anchor ids of the graded challenges — one per part, in course order.
 * challenges.test.ts cross-checks this list against the challenge registry
 * (src/lib/playground/challenges.ts), order included; it is duplicated here
 * as plain strings so the nav and deep-link code never has to import the
 * challenge modules (and their nine sandbox seeds).
 */
export const challengeAnchorIds = [
	'ch-1-sign-your-work',
	'ch-2-stage-what-you-trust',
	'ch-3-branch-first',
	'ch-4-pick-your-undo',
	'ch-5-rescue-the-fix',
	'ch-6-read-the-gate',
	'ch-7-cockpit-by-hand',
	'ch-8-review-the-robot',
	'ch-9-three-messes'
] as const;

/** Every id that can appear in the URL hash and the sidebar scroll-spy. */
export const anchorIds: readonly string[] = [
	...sectionIds,
	...playgroundAnchorIds,
	...challengeAnchorIds
];
