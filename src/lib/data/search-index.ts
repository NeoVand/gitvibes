import { cheatSheet } from './cheat-sheet';

export interface SearchEntry {
	/** Unique key for list rendering */
	id: string;
	/** DOM id to scroll to when selected */
	sectionId: string;
	/** Primary git command, when this entry is command-focused */
	command?: string;
	title: string;
	part: string;
	description: string;
	keywords: string[];
	kind: 'command' | 'topic';
}

function resolveSectionId(command: string, category: string): string {
	const cmd = command.toLowerCase();

	if (cmd.includes('stash')) return 'section-5-1';
	if (cmd.includes('reflog') || cmd.includes('head@{')) return 'section-4-9';
	if (cmd.includes('cherry-pick')) return 'section-5-4';
	if (cmd.includes('rebase --continue') || cmd.includes('rebase --abort')) return 'section-5-5';
	if (cmd.includes('rebase')) return 'section-5-2';
	if (cmd.includes('credential') || cmd.includes('ssh') || cmd.startsWith('gh auth'))
		return 'section-1-2';
	if (cmd.includes('rm --cached') || cmd.includes('excludesfile')) return 'section-2-4';
	if (cmd.includes('hookspath') || cmd.includes('--no-verify')) return 'section-6-2';
	if (cmd.includes('worktree')) return 'section-6-3';
	if (cmd.includes('config') || cmd.includes('init')) return 'section-1-1';
	if (cmd.includes('clone')) return 'section-1-3';
	if (cmd.startsWith('git status')) return 'section-2-1';
	if (cmd.includes('git add') || cmd.includes('git diff')) return 'section-2-2';
	if (cmd.includes('commit')) return 'section-2-3';
	if (cmd.includes('switch') || (cmd.includes('branch') && !cmd.includes('remote')))
		return 'section-3-1';
	if (cmd.includes('fetch') || cmd.includes('pull')) return 'section-3-2';
	// Tag pushes must win over the generic push rule below. Written precisely
	// so '--staged' (which contains 'tag') never matches.
	if (cmd.startsWith('git tag') || cmd.includes('--tags') || cmd.includes('<tag>'))
		return 'section-5-6';
	if (cmd.includes('push')) return 'section-3-3';
	if (cmd.includes('remote')) return 'section-3-2';
	if (cmd.includes('restore --staged') || cmd === 'git reset <file>') return 'section-4-2';
	if (cmd.includes('restore') || cmd.includes('clean')) return 'section-4-1';
	if (cmd.includes('amend')) return 'section-4-3';
	if (cmd.includes('reset')) return 'section-4-4';
	if (cmd.includes('revert')) return 'section-4-5';
	if (cmd.includes('force')) return 'section-4-6';
	if (cmd.includes('merge')) return 'section-5-2';
	if (cmd.includes('log') || cmd.includes('show') || cmd.includes('blame')) return 'section-7-2';
	if (cmd.includes('bisect') || cmd.includes('submodule')) {
		return 'section-8-2';
	}
	if (cmd.includes('tag')) return 'section-5-6';

	const categoryFallback: Record<string, string> = {
		'Setup & Config': 'section-1-1',
		'Basic Workflow': 'section-2-1',
		Branching: 'section-3-1',
		Remote: 'section-3-2',
		Stashing: 'section-5-1',
		Undoing: 'section-4-1',
		'History & Inspection': 'section-7-2',
		'Rebase & Cherry-pick': 'section-5-2',
		Tags: 'section-5-6',
		Advanced: 'section-8-2'
	};

	return categoryFallback[category] ?? 'section-8-2';
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function buildCommandEntries(): SearchEntry[] {
	const entries: SearchEntry[] = [];

	for (const category of cheatSheet) {
		for (const cmd of category.commands) {
			const sectionId = resolveSectionId(cmd.command, category.label);
			const baseCommand = cmd.command.split('<')[0].trim();

			entries.push({
				id: `${sectionId}-${slugify(cmd.command)}-${slugify(cmd.description)}`,
				sectionId,
				command: cmd.command,
				title: baseCommand,
				part: category.label,
				description: cmd.description,
				keywords: [
					baseCommand,
					cmd.command,
					cmd.description,
					category.label.toLowerCase(),
					...baseCommand.replace(/"/g, '').split(/\s+/)
				],
				kind: 'command'
			});
		}
	}

	return entries;
}

/** Concept / workflow searches that are not a single cheat-sheet row */
const topicEntries: SearchEntry[] = [
	{
		id: 'topic-git-history',
		sectionId: 'section-intro-history',
		title: 'A Brief History of Git',
		part: 'Introduction',
		description: 'How Linus Torvalds created Git in 2005 after the BitKeeper license crisis.',
		keywords: [
			'history',
			'linus',
			'torvalds',
			'bitkeeper',
			'who created git',
			'origin',
			'2005',
			'linux kernel',
			'junio hamano'
		],
		kind: 'topic'
	},
	{
		id: 'topic-authentication',
		sectionId: 'section-1-2',
		title: 'Authentication: tokens & SSH keys',
		part: 'Enterprise Onboarding',
		description:
			'Authenticate to GitHub over HTTPS with a personal access token or over SSH with a key pair.',
		keywords: [
			'authentication',
			'auth',
			'login',
			'personal access token',
			'PAT',
			'fine-grained token',
			'token',
			'password',
			'credentials',
			'credential helper',
			'permission denied',
			'403'
		],
		kind: 'topic'
	},
	{
		id: 'topic-ssh-keys',
		sectionId: 'section-1-2',
		title: 'SSH keys',
		part: 'Enterprise Onboarding',
		description: 'Generate an ed25519 SSH key, add it to GitHub, and clone with the SSH URL.',
		keywords: [
			'ssh',
			'ssh key',
			'ssh-keygen',
			'ed25519',
			'ssh-agent',
			'public key',
			'private key',
			'keypair',
			'git@github.com',
			'https vs ssh'
		],
		kind: 'topic'
	},
	{
		id: 'topic-merge-conflict',
		sectionId: 'section-5-3',
		title: 'Merge conflicts',
		part: 'Advanced Workflows',
		description: 'Resolve conflicts after a merge or pull when Git cannot auto-merge.',
		keywords: [
			'merge conflict',
			'conflict',
			'conflicts',
			'CONFLICT',
			'conflict markers',
			'<<<<<<',
			'resolve conflict',
			'fix conflict',
			'fix conflicts',
			'both modified'
		],
		kind: 'topic'
	},
	{
		id: 'topic-pull-request',
		sectionId: 'section-3-3',
		title: 'Pull requests',
		part: 'Branching & PRs',
		description: 'Push your branch and open a PR for human review before merging to main.',
		keywords: ['pull request', 'PR', 'code review', 'propose changes', 'merge to main'],
		kind: 'topic'
	},
	{
		id: 'topic-undo-matrix',
		sectionId: 'section-4-7',
		title: 'Undo decision guide',
		part: 'Undo Toolkit',
		description: 'Pick the right undo command for local, staged, committed, or pushed mistakes.',
		keywords: [
			'undo',
			'undo matrix',
			'recovery matrix',
			'which command',
			'mistake',
			'recover',
			'oops',
			'accidentally',
			'panic',
			'i messed up',
			'help'
		],
		kind: 'topic'
	},
	{
		id: 'topic-undo-last-commit',
		sectionId: 'section-4-4',
		title: 'Undo the last commit',
		part: 'Undo Toolkit',
		description:
			'Use git reset to un-commit — soft keeps changes staged, mixed keeps them unstaged.',
		keywords: [
			'uncommit',
			'undo commit',
			'undo last commit',
			'delete last commit',
			'remove last commit',
			'take back commit',
			'reset commit'
		],
		kind: 'topic'
	},
	{
		id: 'topic-wrong-branch',
		sectionId: 'section-3-1',
		title: 'Committed on the wrong branch',
		part: 'Branching & PRs',
		description: 'Move an accidental commit off main and onto a proper feature branch.',
		keywords: [
			'wrong branch',
			'committed to main',
			'committed on main',
			'move commit',
			'move commit to branch',
			'accidental commit'
		],
		kind: 'topic'
	},
	{
		id: 'topic-force-push',
		sectionId: 'section-4-6',
		title: 'Force push, safely',
		part: 'Undo Toolkit',
		description:
			'Rewrite pushed history with --force-with-lease, the force that aborts if a teammate pushed first.',
		keywords: [
			'force push',
			'force-with-lease',
			'force with lease',
			'push rejected',
			'non-fast-forward',
			'rejected push',
			'break glass',
			'rewrite pushed history'
		],
		kind: 'topic'
	},
	{
		id: 'topic-checkout-modern',
		sectionId: 'section-3-1',
		title: 'checkout → switch & restore',
		part: 'Branching & PRs',
		description:
			'Older tutorials say git checkout — this course teaches its modern replacements: switch (branches) and restore (files).',
		keywords: [
			'checkout',
			'git checkout',
			'checkout -b',
			'checkout branch',
			'checkout file',
			'checkout --'
		],
		kind: 'topic'
	},
	{
		id: 'topic-playground',
		sectionId: 'core-loop',
		title: 'Git Playground',
		part: 'Try it yourself',
		description: 'Practice Git commands in a real in-browser repo.',
		keywords: ['playground', 'practice', 'try it yourself', 'terminal', 'interactive'],
		kind: 'topic'
	},
	{
		id: 'topic-gitignore',
		sectionId: 'section-2-4',
		title: 'What NOT to Commit (.gitignore)',
		part: 'Core Safety Loop',
		description: 'Keep secrets, dependencies, and OS junk out of the repository.',
		keywords: [
			'gitignore',
			'ignore files',
			'secrets',
			'.env',
			'node_modules',
			'untrack',
			'api keys',
			'exclude'
		],
		kind: 'topic'
	},
	{
		id: 'topic-git-hooks',
		sectionId: 'section-6-2',
		title: 'Automating Quality with Git Hooks',
		part: 'Git for AI Agents',
		description: 'Pre-commit and commit-msg hooks that enforce standards on human and AI commits.',
		keywords: [
			'hooks',
			'pre-commit',
			'commit-msg',
			'husky',
			'automation',
			'enforce',
			'conventional commits',
			'block commit'
		],
		kind: 'topic'
	},
	{
		id: 'topic-agents-md',
		sectionId: 'section-6-1',
		title: 'Teaching Your AI to Use Git (AGENTS.md)',
		part: 'Git for AI Agents',
		description: 'Encode Git rules for coding agents with AGENTS.md and skills.',
		keywords: [
			'agents.md',
			'claude.md',
			'skill',
			'agent rules',
			'copilot instructions',
			'teach ai',
			'review ai diff',
			'large pr'
		],
		kind: 'topic'
	},
	{
		id: 'topic-detached-head',
		sectionId: 'section-4-8',
		title: 'Detached HEAD — Time Travel Safely',
		part: 'Undo Toolkit',
		description: 'Visit an old commit, look around, and escape with your work intact.',
		keywords: [
			'detached head',
			'checkout commit',
			'time travel',
			'old commit',
			'orphaned commits',
			'switch -c',
			'escape detached'
		],
		kind: 'topic'
	},
	{
		id: 'topic-reflog',
		sectionId: 'section-4-9',
		title: 'The Reflog — Your Time Machine',
		part: 'Undo Toolkit',
		description: 'Recover commits that vanished after a hard reset or a botched rebase.',
		keywords: [
			'reflog',
			'recover lost commits',
			'undo reset --hard',
			'rescue',
			'lost work',
			'HEAD@{1}',
			'time machine'
		],
		kind: 'topic'
	},
	{
		id: 'topic-cherry-pick',
		sectionId: 'section-5-4',
		title: 'Cherry-Pick — Take Only the Gems',
		part: 'Advanced Workflows',
		description: 'Copy a single commit from a messy branch onto your current branch.',
		keywords: [
			'cherry-pick',
			'copy commit',
			'single commit',
			'selective merge',
			'pick commit',
			'experiment branch'
		],
		kind: 'topic'
	},
	{
		id: 'topic-rebase-conflict',
		sectionId: 'section-5-5',
		title: 'When Rebase Goes Wrong',
		part: 'Advanced Workflows',
		description: 'Resolve a paused rebase with --continue, or bail out safely with --abort.',
		keywords: [
			'rebase conflict',
			'rebase --continue',
			'rebase --abort',
			'unmerged paths',
			'paused rebase',
			'stuck rebase'
		],
		kind: 'topic'
	},
	{
		id: 'topic-tags',
		sectionId: 'section-5-6',
		title: 'Tags & Releases',
		part: 'Advanced Workflows',
		description: 'Mark release commits with annotated tags and semantic versions.',
		keywords: [
			'tag',
			'annotated tag',
			'release',
			'semantic versioning',
			'semver',
			'version',
			'milestone'
		],
		kind: 'topic'
	},
	{
		id: 'topic-worktrees',
		sectionId: 'section-6-3',
		title: 'Parallel Agents with Git Worktrees',
		part: 'Git for AI Agents',
		description: 'Run multiple AI agents on one repo with a working directory per branch.',
		keywords: [
			'worktree',
			'worktrees',
			'parallel agents',
			'multiple agents',
			'two branches at once',
			'agent per branch',
			'simultaneous'
		],
		kind: 'topic'
	}
];

export const searchIndex: SearchEntry[] = [...buildCommandEntries(), ...topicEntries];

export function scoreSearchEntry(entry: SearchEntry, rawQuery: string): number {
	const query = rawQuery.toLowerCase().trim();
	if (!query) return 0;

	const tokens = query.split(/\s+/).filter(Boolean);
	const command = entry.command?.toLowerCase() ?? '';
	const title = entry.title.toLowerCase();
	const description = entry.description.toLowerCase();
	const keywordBlob = entry.keywords.join(' ').toLowerCase();

	if (entry.kind === 'command' && command) {
		if (command === query) return 1000;
		if (command.startsWith(query)) return 900;
		if (command.includes(query)) return 750;

		const commandPrefix = tokens.join(' ');
		if (command.startsWith(commandPrefix)) return 850;
		if (tokens.length > 1 && tokens.every((token) => command.includes(token))) {
			return 700 + tokens.length * 20;
		}
	}

	for (const keyword of entry.keywords) {
		const lower = keyword.toLowerCase();
		if (lower === query) return entry.kind === 'command' ? 650 : 500;
		if (lower.startsWith(query)) return entry.kind === 'command' ? 600 : 450;
	}

	if (title === query) return entry.kind === 'command' ? 550 : 300;
	if (title.startsWith(query)) return entry.kind === 'command' ? 500 : 250;
	if (description.includes(query)) return entry.kind === 'command' ? 400 : 200;

	if (tokens.every((token) => keywordBlob.includes(token) || title.includes(token))) {
		return entry.kind === 'command' ? 350 + tokens.length * 15 : 120;
	}

	if (title.includes(query)) return entry.kind === 'command' ? 180 : 80;

	return 0;
}

export function searchEntries(rawQuery: string, limit = 8): SearchEntry[] {
	const query = rawQuery.trim();
	if (!query) return [];

	return searchIndex
		.map((entry) => ({ entry, score: scoreSearchEntry(entry, query) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
		.slice(0, limit)
		.map(({ entry }) => entry);
}
