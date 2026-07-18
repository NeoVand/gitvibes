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
}

export interface NavSection extends NavItem {
	children?: NavItem[];
}

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
			{ id: 'section-1-2', label: 'Authentication', icon: KeyRound },
			{ id: 'section-1-3', label: 'Cloning a Repo', icon: Download }
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
			{ id: 'section-2-4', label: 'What NOT to Commit', icon: EyeOff }
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
			{ id: 'branching', label: 'Branching Workflow', icon: Gamepad2, isPlayground: true }
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
			{ id: 'bisect', label: 'Find the Bad Commit', icon: Gamepad2, isPlayground: true }
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
			{ id: 'release-tags', label: 'Cut a Release', icon: Gamepad2, isPlayground: true }
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
			{ id: 'worktrees', label: 'Worktree Fleet', icon: Gamepad2, isPlayground: true }
		]
	},
	{
		id: 'part-7',
		label: 'VS Code Cockpit',
		icon: Monitor,
		children: [
			{ id: 'section-7-1', label: 'Source Control View', icon: Layout },
			{ id: 'section-7-2', label: 'Timeline & GitLens', icon: Clock },
			{ id: 'section-7-3', label: 'Merge Editor', icon: Columns }
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
			{ id: 'release-robot', label: 'Be release-please', icon: Gamepad2, isPlayground: true }
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
			{ id: 'section-9-4', label: 'Keep Learning', icon: Library }
		]
	}
];
