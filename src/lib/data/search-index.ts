export interface SearchEntry {
	id: string;
	title: string;
	part: string;
	keywords: string[];
	description: string;
}

export const searchIndex: SearchEntry[] = [
	// Hero / Introduction
	{
		id: 'hero',
		title: 'Introduction',
		part: 'Introduction',
		keywords: [
			'introduction',
			'getting started',
			'welcome',
			'overview',
			'git',
			'vibe coding',
			'ai coding',
			'gitvibes',
			'start',
			'begin',
			'home'
		],
		description: 'Welcome to GitVibes -- a guide to Git for AI-first developers.'
	},

	// Part 1: Enterprise Onboarding
	{
		id: 'part-1',
		title: 'Enterprise Onboarding',
		part: 'Enterprise Onboarding',
		keywords: [
			'onboarding',
			'enterprise',
			'setup',
			'install',
			'getting started',
			'new machine',
			'first time',
			'configuration',
			'connect',
			'codebase'
		],
		description: 'Connect to your enterprise codebase: configure Git, authenticate, and clone.'
	},
	{
		id: 'section-1-1',
		title: 'Git Configuration',
		part: 'Enterprise Onboarding',
		keywords: [
			'git config',
			'git config --global',
			'user.name',
			'user.email',
			'configuration',
			'config',
			'setup',
			'identity',
			'name',
			'email',
			'first time',
			'new machine',
			'global',
			'traceability',
			'enterprise'
		],
		description:
			'Set your Git identity with user.name and user.email for the first time on a new machine.'
	},
	{
		id: 'section-1-2',
		title: 'Authentication',
		part: 'Enterprise Onboarding',
		keywords: [
			'authentication',
			'personal access token',
			'PAT',
			'token',
			'credentials',
			'credential helper',
			'osxkeychain',
			'credential.helper',
			'git config --global credential.helper',
			'login',
			'password',
			'github settings',
			'developer settings',
			'private repository',
			'security',
			'keychain',
			'credential manager',
			'libsecret',
			'scopes',
			'repo',
			'read:org'
		],
		description:
			'Authenticate with GitHub using a Personal Access Token and store credentials securely.'
	},
	{
		id: 'section-1-3',
		title: 'Cloning a Repo',
		part: 'Enterprise Onboarding',
		keywords: [
			'git clone',
			'clone',
			'download',
			'repository',
			'repo',
			'first pull',
			'copy',
			'HTTPS',
			'URL',
			'vs code clone',
			'Git: Clone',
			'command palette',
			'default branch',
			'main',
			'remote-tracking',
			'welcome page'
		],
		description:
			'Clone a repository to your local machine using the terminal or VS Code.'
	},

	// Part 2: Core Safety Loop
	{
		id: 'part-2',
		title: 'Core Safety Loop',
		part: 'Core Safety Loop',
		keywords: [
			'core loop',
			'safety loop',
			'save game',
			'daily workflow',
			'status stage commit',
			'fundamental',
			'ai coding',
			'review',
			'save point'
		],
		description:
			'The fundamental daily workflow: Status, Stage, Commit -- your save game for AI coding.'
	},
	{
		id: 'section-2-1',
		title: 'git status',
		part: 'Core Safety Loop',
		keywords: [
			'git status',
			'status',
			'check',
			'modified',
			'untracked',
			'working directory',
			'changes',
			'what changed',
			'heads-up display',
			'not staged',
			'changes not staged',
			'untracked files',
			'red',
			'source control panel',
			'badge',
			'AI changes',
			'refactor',
			'copilot',
			'cursor',
			'review'
		],
		description:
			'Check what the AI changed using git status to see modified and untracked files.'
	},
	{
		id: 'section-2-2',
		title: 'Staging Changes',
		part: 'Core Safety Loop',
		keywords: [
			'git add',
			'git add .',
			'git add --patch',
			'git add -p',
			'stage',
			'staging',
			'staging area',
			'add',
			'review',
			'hunk',
			'interactive staging',
			'patch',
			'surgical add',
			'stage all',
			'stage specific file',
			'stage parts',
			'stage selected ranges',
			'diff editor',
			'approve',
			'trust',
			'dangerous'
		],
		description:
			'Review and stage AI changes selectively using git add, git add -p, or VS Code stage ranges.'
	},
	{
		id: 'section-2-3',
		title: 'Committing',
		part: 'Core Safety Loop',
		keywords: [
			'git commit',
			'git commit -m',
			'commit',
			'save point',
			'commit message',
			'conventional commits',
			'feat',
			'fix',
			'refactor',
			'docs',
			'test',
			'message',
			'save',
			'immutable',
			'permanent',
			'checkmark',
			'commit button',
			'AI commit message',
			'copilot commit',
			'why not how'
		],
		description:
			'Create permanent save points with descriptive commit messages following Conventional Commits.'
	},

	// Part 3: Branching & PRs
	{
		id: 'part-3',
		title: 'Branching & PRs',
		part: 'Branching & PRs',
		keywords: [
			'branch',
			'branching',
			'pull request',
			'PR',
			'parallel',
			'experiment',
			'feature branch',
			'main branch',
			'collaboration',
			'isolation'
		],
		description:
			'Work in isolated branches and propose changes through Pull Requests.'
	},
	{
		id: 'section-3-1',
		title: 'Creating Branches',
		part: 'Branching & PRs',
		keywords: [
			'git switch',
			'git switch -c',
			'git checkout -b',
			'branch',
			'create branch',
			'new branch',
			'feature branch',
			'parallel universe',
			'sandbox',
			'isolated',
			'experiment',
			'fearless',
			'safe copy',
			'main',
			'status bar',
			'discard branch'
		],
		description:
			'Create isolated feature branches for AI experiments using git switch -c.'
	},
	{
		id: 'section-3-2',
		title: 'Syncing Changes',
		part: 'Branching & PRs',
		keywords: [
			'git fetch',
			'git pull',
			'git merge',
			'git merge origin/main',
			'git pull origin main',
			'sync',
			'syncing',
			'fetch',
			'pull',
			'update',
			'stale',
			'out of date',
			'teammate',
			'remote',
			'origin',
			'download commits',
			'controlled sync',
			'safe sync'
		],
		description:
			'Keep your branch up to date with remote changes using fetch, pull, or merge.'
	},
	{
		id: 'section-3-3',
		title: 'Pull Requests',
		part: 'Branching & PRs',
		keywords: [
			'git push',
			'git push -u',
			'pull request',
			'PR',
			'push',
			'propose',
			'code review',
			'merge to main',
			'compare & pull request',
			'feature ready',
			'auditable',
			'review gate',
			'human review',
			'github',
			'AI PR description',
			'copilot PR',
			'claude code',
			'origin',
			'upstream'
		],
		description:
			'Push your branch and create a Pull Request for human review before merging to main.'
	},

	// Part 4: Undo Toolkit
	{
		id: 'part-4',
		title: 'Undo Toolkit',
		part: 'Undo Toolkit',
		keywords: [
			'undo',
			'reverse',
			'mistake',
			'recover',
			'recovery',
			'revert',
			'reset',
			'restore',
			'fix',
			'AI mistake',
			'buggy code',
			'rollback'
		],
		description:
			'Reverse AI mistakes at every stage: local, staged, committed, or pushed.'
	},
	{
		id: 'section-4-1',
		title: 'Discard Local Changes',
		part: 'Undo Toolkit',
		keywords: [
			'git restore',
			'git restore .',
			'discard',
			'discard changes',
			'local changes',
			'not committed',
			'revert file',
			'undo local',
			'throw away',
			'last save point',
			'dangerous',
			'gone forever',
			'working directory'
		],
		description:
			'Discard uncommitted local changes with git restore to revert to the last save point.'
	},
	{
		id: 'section-4-2',
		title: 'Unstage Files',
		part: 'Undo Toolkit',
		keywords: [
			'git restore --staged',
			'git reset HEAD',
			'unstage',
			'unstaging',
			'staged by accident',
			'remove from staging',
			'staging area',
			'undo add',
			'undo stage',
			'accidental stage'
		],
		description:
			'Remove accidentally staged files from the staging area with git restore --staged.'
	},
	{
		id: 'section-4-3',
		title: 'Amend Commits',
		part: 'Undo Toolkit',
		keywords: [
			'git commit --amend',
			'git commit --amend --no-edit',
			'amend',
			'forgot file',
			'typo',
			'fix commit',
			'last commit',
			'commit message',
			'not pushed',
			'rewrite commit',
			'Commit Staged (Amend)'
		],
		description:
			'Fix the last unpushed commit by adding forgotten files or correcting the message.'
	},
	{
		id: 'section-4-4',
		title: 'Reset (Local)',
		part: 'Undo Toolkit',
		keywords: [
			'git reset',
			'git reset --hard',
			'git reset --soft',
			'git reset --mixed',
			'reset',
			'hard reset',
			'soft reset',
			'mixed reset',
			'HEAD~',
			'nuke',
			'destroy commits',
			'delete commits',
			'local cleanup',
			'squash',
			'rewrite history',
			'not pushed'
		],
		description:
			'Delete local commits with git reset using --soft, --mixed, or --hard modes.'
	},
	{
		id: 'section-4-5',
		title: 'Revert (Public)',
		part: 'Undo Toolkit',
		keywords: [
			'git revert',
			'revert',
			'undo pushed commit',
			'public',
			'pushed',
			'safe undo',
			'inverse commit',
			'bug on main',
			'team',
			'teammates',
			'git log',
			'git log --oneline',
			'hash',
			'history preserved',
			'no history deleted',
			'Revert Commit',
			'GitLens revert'
		],
		description:
			'Safely undo a pushed commit by creating a new revert commit that preserves history.'
	},
	{
		id: 'section-4-6',
		title: 'Force Push',
		part: 'Undo Toolkit',
		keywords: [
			'git push --force',
			'git push --force-with-lease',
			'force push',
			'force-with-lease',
			'break glass',
			'diverged',
			'history diverged',
			'remote refuses',
			'conditional force',
			'dangerous push',
			'destroy work',
			'overwrite remote'
		],
		description:
			'Use git push --force-with-lease as a safe alternative to force push when history diverges.'
	},
	{
		id: 'section-4-7',
		title: 'Recovery Matrix',
		part: 'Undo Toolkit',
		keywords: [
			'recovery matrix',
			'undo matrix',
			'cheat sheet',
			'reference table',
			'which command',
			'scenario',
			'decision',
			'git restore',
			'git reset',
			'git revert',
			'git commit --amend',
			'git push --force-with-lease',
			'safe',
			'local only',
			'break glass'
		],
		description:
			'Quick reference matrix mapping common undo scenarios to the correct Git command.'
	},

	// Part 5: Advanced Workflows
	{
		id: 'part-5',
		title: 'Advanced Workflows',
		part: 'Advanced Workflows',
		keywords: [
			'advanced',
			'workflows',
			'multi-branch',
			'context switching',
			'stash',
			'rebase',
			'merge',
			'conflict'
		],
		description:
			'Advanced Git workflows: stashing, rebasing vs merging, and resolving merge conflicts.'
	},
	{
		id: 'section-5-1',
		title: 'Git Stash',
		part: 'Advanced Workflows',
		keywords: [
			'git stash',
			'git stash save',
			'git stash pop',
			'git stash apply',
			'stash',
			'WIP',
			'work in progress',
			'context switch',
			'switch branches',
			'dirty working directory',
			'temporary',
			'holding area',
			'urgent bug',
			'hotfix',
			'save later',
			'unfinished work',
			'interrupt'
		],
		description:
			'Temporarily save unfinished work with git stash to switch branches for urgent tasks.'
	},
	{
		id: 'section-5-2',
		title: 'Rebase vs Merge',
		part: 'Advanced Workflows',
		keywords: [
			'git rebase',
			'git rebase main',
			'git merge',
			'git merge main',
			'rebase',
			'merge',
			'rebase vs merge',
			'linear history',
			'clean history',
			'merge commit',
			'replay commits',
			'stale branch',
			'out of date',
			'golden rule',
			'public branch',
			'private branch',
			'AI-first',
			'clean PR'
		],
		description:
			'Choose between rebase (clean linear history) and merge (preserved history) to update branches.'
	},
	{
		id: 'section-5-3',
		title: 'Merge Conflicts',
		part: 'Advanced Workflows',
		keywords: [
			'merge conflict',
			'conflict',
			'CONFLICT',
			'conflict markers',
			'<<<<<<',
			'======',
			'>>>>>>',
			'HEAD',
			'origin/main',
			'resolve conflict',
			'same file',
			'same lines',
			'accept current',
			'accept incoming',
			'accept both',
			'3-way merge',
			'merge editor',
			'conflict resolution'
		],
		description:
			'Resolve merge conflicts using conflict markers in the terminal or the VS Code 3-way merge editor.'
	},

	// Part 6: VS Code Cockpit
	{
		id: 'part-6',
		title: 'VS Code Cockpit',
		part: 'VS Code Cockpit',
		keywords: [
			'vs code',
			'vscode',
			'IDE',
			'cockpit',
			'visual',
			'GUI',
			'source control',
			'editor',
			'integration',
			'UI'
		],
		description: 'Master Git visually through the VS Code Source Control, Timeline, and Merge Editor.'
	},
	{
		id: 'section-6-1',
		title: 'Source Control View',
		part: 'VS Code Cockpit',
		keywords: [
			'source control',
			'source control view',
			'source control panel',
			'changes',
			'staged changes',
			'commit box',
			'commit message input',
			'checkmark button',
			'overflow menu',
			'three dot menu',
			'activity bar',
			'command center',
			'vs code git',
			'git status UI',
			'stage UI',
			'commit UI'
		],
		description:
			'Use the VS Code Source Control panel as your command center for status, staging, and committing.'
	},
	{
		id: 'section-6-2',
		title: 'Timeline & GitLens',
		part: 'VS Code Cockpit',
		keywords: [
			'timeline',
			'timeline view',
			'GitLens',
			'gitlens',
			'blame',
			'git blame',
			'annotation',
			'file history',
			'commit history',
			'who wrote',
			'when changed',
			'diff',
			'restore',
			'explorer panel',
			'extension',
			'marketplace'
		],
		description:
			'Track file history with the Timeline view and GitLens blame annotations in VS Code.'
	},
	{
		id: 'section-6-3',
		title: 'Merge Editor',
		part: 'VS Code Cockpit',
		keywords: [
			'merge editor',
			'3-way merge',
			'three-way merge',
			'incoming',
			'current',
			'result',
			'accept current change',
			'accept incoming change',
			'accept both changes',
			'conflict resolution UI',
			'visual merge',
			'left pane',
			'right pane',
			'bottom pane',
			'point and click'
		],
		description:
			'Resolve merge conflicts visually with the VS Code 3-way Merge Editor.'
	},

	// Part 7: Conclusion
	{
		id: 'part-7',
		title: 'Conclusion',
		part: 'Conclusion',
		keywords: [
			'conclusion',
			'best practices',
			'AI-augmented',
			'summary',
			'workflow',
			'reference',
			'cheat sheet',
			'wrap up'
		],
		description:
			'Best practices, the AI-first workflow summary, and a quick reference card.'
	},
	{
		id: 'section-7-1',
		title: 'AI-First Workflow',
		part: 'Conclusion',
		keywords: [
			'AI-first workflow',
			'workflow summary',
			'8 steps',
			'sandbox',
			'generate',
			'review',
			'save',
			'sync',
			'push',
			'propose',
			'recover',
			'save game loop',
			'daily workflow',
			'best practice',
			'git switch -c',
			'git add -p',
			'git commit',
			'git fetch',
			'git rebase',
			'git push --force-with-lease',
			'pull request',
			'git revert'
		],
		description:
			'The complete 8-step AI-first workflow: Sandbox, Generate, Review, Save, Sync, Push, Propose, Recover.'
	},
	{
		id: 'section-7-2',
		title: 'Teaching AI Git',
		part: 'Conclusion',
		keywords: [
			'teaching AI',
			'AI git',
			'cursor rules',
			'.cursor/rules',
			'claude code',
			'github actions',
			'automation',
			'AI agent',
			'PR review',
			'documentation',
			'branch management',
			'conventional commits',
			'feature branch',
			'future',
			'next level'
		],
		description:
			'Configure AI tools like Cursor and Claude Code to follow your team Git workflow automatically.'
	},
	{
		id: 'section-quick-ref',
		title: 'Quick Reference',
		part: 'Conclusion',
		keywords: [
			'quick reference',
			'reference card',
			'cheat sheet',
			'commands',
			'git status',
			'git add -p',
			'git commit',
			'git switch -c',
			'git restore',
			'git reset --soft',
			'git revert',
			'git stash',
			'git fetch',
			'git rebase',
			'git push --force-with-lease',
			'vs code',
			'table',
			'summary',
			'all commands'
		],
		description:
			'Quick reference table mapping common tasks to Git commands and their VS Code equivalents.'
	}
];
