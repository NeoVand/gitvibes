import {
	AlertTriangle,
	Archive,
	BookOpen,
	Clock,
	Columns,
	Download,
	Eye,
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
	PenLine,
	RefreshCcw,
	RefreshCw,
	Rocket,
	RotateCcw,
	Save,
	Sparkles,
	Table,
	Trash2,
	Undo2,
	UserCheck,
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
			{ id: 'core-loop', label: 'Core Safety Loop', icon: Gamepad2, isPlayground: true }
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
			{ id: 'undo', label: 'Undo Operations', icon: Gamepad2, isPlayground: true }
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
			{ id: 'section-5-3', label: 'Merge Conflicts', icon: FileWarning },
			{ id: 'conflicts', label: 'Conflict Resolution', icon: Gamepad2, isPlayground: true }
		]
	},
	{
		id: 'part-6',
		label: 'VS Code Cockpit',
		icon: Monitor,
		children: [
			{ id: 'section-6-1', label: 'Source Control View', icon: Layout },
			{ id: 'section-6-2', label: 'Timeline & GitLens', icon: Clock },
			{ id: 'section-6-3', label: 'Merge Editor', icon: Columns }
		]
	},
	{
		id: 'part-7',
		label: 'Conclusion',
		icon: BookOpen,
		children: [
			{ id: 'section-7-1', label: 'AI-First Workflow', icon: Workflow },
			{ id: 'section-7-2', label: 'Quick Reference', icon: Table },
			{ id: 'section-7-3', label: 'Teaching AI Git', icon: Sparkles }
		]
	}
];
