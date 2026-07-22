import {
	AlertTriangle,
	Archive,
	BadgeCheck,
	BookOpen,
	Library,
	Bot,
	Cherry,
	Clock,
	Columns,
	Compass,
	Download,
	Eye,
	EyeOff,
	FileWarning,
	FolderGit2,
	FolderPlus,
	Gamepad2,
	GitBranch,
	GitMerge,
	GitPullRequest,
	HelpCircle,
	History,
	KeyRound,
	Laptop,
	Layers,
	Layout,
	MinusCircle,
	Monitor,
	PackageCheck,
	PenLine,
	Puzzle,
	RefreshCcw,
	RefreshCw,
	Rocket,
	RotateCcw,
	Save,
	ShieldAlert,
	ShieldCheck,
	Ship,
	Sparkles,
	Table,
	Tag,
	Trash2,
	Trophy,
	Undo2,
	UserCheck,
	Webhook,
	Workflow
} from 'lucide-svelte';

export interface NavItem {
	id: string;
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
	isPlayground?: boolean;
	/**
	 * The graded counterpart of a playground — one per Part, always the last
	 * child. Rendered in the challenge terracotta with `Puzzle`, and, like
	 * `isPlayground`, at the smaller activity row size.
	 */
	isChallenge?: boolean;
}

/** Both flags mean "an activity, not prose", which is what row styling keys on. */
export function isActivity(item: NavItem): boolean {
	return Boolean(item.isPlayground || item.isChallenge);
}

/**
 * The two kinds of hands-on activity. It lives here, next to the flags it
 * mirrors, so the sidebar row and the activity card name the same two things
 * from one definition rather than each declaring its own string union.
 */
export type ActivityKind = 'playground' | 'challenge';

/**
 * Challenge anchors are `ch-<part>-<slug>` (see challenges.ts). This is the
 * fallback for callers that render a card without saying which kind it is —
 * the explicit `kind` prop always wins, and importing challenges.ts here just
 * to test membership would pull all nine sandbox seeds into the nav bundle.
 */
export function activityKindOf(id: string): ActivityKind {
	return /^ch-\d+-/.test(id) ? 'challenge' : 'playground';
}

export interface NavSection extends NavItem {
	children?: NavItem[];
}

/* One challenge closes each Part (src/lib/playground/challenges.ts owns the
   ids and the order), so each is the LAST child of its part-N below, flagged
   `isChallenge: true` with lucide's `Puzzle`. Every id here must also appear
   in `challengeAnchorIds` (src/lib/data/sections.ts) and be rendered by a
   <ChallengeActivity> in the matching Part component — keys.test.ts protects
   the first pairing, and a row without a real anchor scrolls nowhere. */

export const sidebarNav: NavSection[] = [
	{
		id: 'hero',
		label: 'Introduction',
		icon: Rocket,
		children: [
			{ id: 'section-intro-what', label: 'What Is Git?', icon: HelpCircle },
			{ id: 'section-intro-history', label: 'A Brief History', icon: History },
			{ id: 'section-intro-install', label: 'Installing Git', icon: Download },
			{ id: 'section-intro-repo', label: 'What Is a Repository?', icon: FolderGit2 }
		]
	},
	{
		id: 'part-1',
		label: 'Enterprise Onboarding',
		icon: Laptop,
		children: [
			{ id: 'section-1-1', label: 'Git Configuration', icon: UserCheck },
			{ id: 'config', label: 'Introduce Yourself', icon: Gamepad2, isPlayground: true },
			{ id: 'section-1-2', label: 'Authentication', icon: KeyRound },
			{ id: 'section-1-3', label: 'Cloning a Repo', icon: Download },
			{ id: 'ch-1-sign-your-work', label: 'Sign Your Work', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-2',
		label: 'Core Safety Loop',
		icon: RefreshCw,
		children: [
			{ id: 'section-2-1', label: 'git status', icon: Eye },
			{ id: 'section-2-2', label: 'Staging Changes', icon: FolderPlus },
			{ id: 'section-2-3', label: 'Committing', icon: Save },
			{ id: 'core-loop', label: 'Core Safety Loop', icon: Gamepad2, isPlayground: true },
			{ id: 'section-2-4', label: 'What NOT to Commit', icon: EyeOff },
			{
				id: 'ch-2-stage-what-you-trust',
				label: 'Stage Only What You Trust',
				icon: Puzzle,
				isChallenge: true
			}
		]
	},
	{
		id: 'part-3',
		label: 'Branching & PRs',
		icon: GitBranch,
		children: [
			{ id: 'section-3-1', label: 'Creating Branches', icon: GitBranch },
			{ id: 'wrong-branch', label: 'Move Commit', icon: Gamepad2, isPlayground: true },
			{ id: 'section-3-2', label: 'Syncing Changes', icon: RefreshCcw },
			{ id: 'sync-remote', label: 'Sync with Remote', icon: Gamepad2, isPlayground: true },
			{ id: 'section-3-3', label: 'Pull Requests', icon: GitPullRequest },
			{ id: 'branching', label: 'Branching Workflow', icon: Gamepad2, isPlayground: true },
			{ id: 'ch-3-branch-first', label: 'Branch Before You Build', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-4',
		label: 'Undo Toolkit',
		icon: Undo2,
		children: [
			{ id: 'section-4-1', label: 'Discard Local', icon: Trash2 },
			{ id: 'section-4-2', label: 'Unstage Files', icon: MinusCircle },
			{ id: 'accidental-stage', label: 'Unstage Secrets', icon: Gamepad2, isPlayground: true },
			{ id: 'section-4-3', label: 'Amend Commits', icon: PenLine },
			{ id: 'section-4-4', label: 'Reset (Local)', icon: RotateCcw },
			{ id: 'section-4-5', label: 'Revert (Public)', icon: Undo2 },
			{ id: 'section-4-6', label: 'Force Push', icon: AlertTriangle },
			{ id: 'force-push', label: 'Reset & Force Push', icon: Gamepad2, isPlayground: true },
			{ id: 'section-4-7', label: 'Recovery Matrix', icon: Table },
			{ id: 'undo', label: 'Undo Operations', icon: Gamepad2, isPlayground: true },
			{ id: 'section-4-8', label: 'Detached HEAD', icon: Compass },
			{ id: 'detached-head', label: 'Time Travel', icon: Gamepad2, isPlayground: true },
			{ id: 'section-4-9', label: 'Reflog Rescue', icon: History },
			{ id: 'reflog-rescue', label: 'Rescue Lost Commits', icon: Gamepad2, isPlayground: true },
			{ id: 'bisect', label: 'Find the Bad Commit', icon: Gamepad2, isPlayground: true },
			{ id: 'ch-4-pick-your-undo', label: 'Pick the Right Undo', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-5',
		label: 'Advanced Workflows',
		icon: Layers,
		children: [
			{ id: 'section-5-1', label: 'Git Stash', icon: Archive },
			{ id: 'stash', label: 'Stash Workflow', icon: Gamepad2, isPlayground: true },
			{ id: 'section-5-2', label: 'Rebase vs Merge', icon: GitMerge },
			{ id: 'rebase-merge', label: 'Merge vs. Rebase', icon: Gamepad2, isPlayground: true },
			{ id: 'interactive-rebase', label: 'Squash the WIP', icon: Gamepad2, isPlayground: true },
			{ id: 'section-5-3', label: 'Merge Conflicts', icon: FileWarning },
			{ id: 'conflicts', label: 'Conflict Resolution', icon: Gamepad2, isPlayground: true },
			{ id: 'section-5-4', label: 'Cherry-Pick', icon: Cherry },
			{ id: 'cherry-pick', label: 'Pick the Gem', icon: Gamepad2, isPlayground: true },
			{ id: 'section-5-5', label: 'Rebase Conflicts', icon: ShieldAlert },
			{ id: 'rebase-conflict', label: 'Rebase Rescue', icon: Gamepad2, isPlayground: true },
			{ id: 'section-5-6', label: 'Tags & Releases', icon: Tag },
			{ id: 'release-tags', label: 'Cut a Release', icon: Gamepad2, isPlayground: true },
			{ id: 'ch-5-rescue-the-fix', label: 'Rescue the Buried Fix', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-6',
		label: 'Git for AI Agents',
		icon: Bot,
		children: [
			{ id: 'section-6-1', label: 'Teaching AI Git', icon: Sparkles },
			{ id: 'section-6-2', label: 'Automating with Hooks', icon: Webhook },
			{ id: 'hooks', label: 'The Hooks Say No', icon: Gamepad2, isPlayground: true },
			{ id: 'section-6-3', label: 'Parallel Agents: Worktrees', icon: FolderGit2 },
			{ id: 'worktrees', label: 'Worktree Fleet', icon: Gamepad2, isPlayground: true },
			{ id: 'ch-6-read-the-gate', label: 'Read the Gate First', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-7',
		label: 'VS Code Cockpit',
		icon: Monitor,
		children: [
			{ id: 'section-7-1', label: 'Source Control View', icon: Layout },
			{ id: 'section-7-2', label: 'Timeline & GitLens', icon: Clock },
			{ id: 'section-7-3', label: 'Merge Editor', icon: Columns },
			{ id: 'ch-7-cockpit-by-hand', label: 'The Cockpit, By Hand', icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-8',
		label: 'CI, Bots & Releases',
		icon: Ship,
		children: [
			{ id: 'section-8-1', label: 'CI & the Green Check', icon: BadgeCheck },
			{ id: 'section-8-2', label: 'Dependabot & CodeQL', icon: ShieldCheck },
			{ id: 'bot-pr', label: "Review the Robot's PR", icon: Gamepad2, isPlayground: true },
			{ id: 'section-8-3', label: 'Releases on Autopilot', icon: PackageCheck },
			{ id: 'release-robot', label: 'Be release-please', icon: Gamepad2, isPlayground: true },
			{ id: 'ch-8-review-the-robot', label: "Land the Bot's Bump", icon: Puzzle, isChallenge: true }
		]
	},
	{
		id: 'part-9',
		label: 'Conclusion',
		icon: BookOpen,
		children: [
			{ id: 'section-9-1', label: 'AI-First Workflow', icon: Workflow },
			{ id: 'section-9-2', label: 'Quick Reference', icon: Table },
			{ id: 'section-9-3', label: 'Final Challenge', icon: Trophy },
			{ id: 'capstone', label: 'Three Messes, One Repo', icon: Gamepad2, isPlayground: true },
			{ id: 'section-9-4', label: 'Keep Learning', icon: Library },
			{ id: 'ch-9-three-messes', label: 'Three Messes, No Hints', icon: Puzzle, isChallenge: true }
		]
	}
];

export interface NavEntry {
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

const byId = new Map<string, NavEntry>();
for (const section of sidebarNav) {
	byId.set(section.id, { label: section.label, icon: section.icon });
	for (const child of section.children ?? []) {
		byId.set(child.id, { label: child.label, icon: child.icon });
	}
}

/**
 * Label + icon for any part or section anchor. Cross-references in the prose
 * resolve through this, so renaming a part in the sidebar renames it
 * everywhere it is mentioned — which is the whole reason references name a
 * part instead of numbering it. This curriculum has been renumbered once
 * already, and every hard-coded "Part 8" silently became wrong.
 */
export function courseEntry(id: string): NavEntry | null {
	return byId.get(id) ?? null;
}

const partOf = new Map<string, string>();
for (const section of sidebarNav) {
	partOf.set(section.id, section.id);
	for (const child of section.children ?? []) {
		partOf.set(child.id, section.id);
	}
}

/**
 * The `part-N` (or `hero`) section that owns an anchor. The standalone
 * /parts/<slug> pages use this to decide whether a cross-reference stays a
 * same-page hash or has to travel back to the full course page.
 */
export function partIdOf(id: string): string | null {
	return partOf.get(id) ?? null;
}
