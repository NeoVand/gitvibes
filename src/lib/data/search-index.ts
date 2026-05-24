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
	if (cmd.includes('rebase') || cmd.includes('cherry-pick')) return 'section-5-2';
	if (cmd.includes('config') || cmd.includes('init')) return 'section-1-1';
	if (cmd.includes('clone')) return 'section-1-3';
	if (cmd.startsWith('git status')) return 'section-2-1';
	if (cmd.includes('git add') || cmd.includes('git diff')) return 'section-2-2';
	if (cmd.includes('commit')) return 'section-2-3';
	if (cmd.includes('switch') || (cmd.includes('branch') && !cmd.includes('remote'))) return 'section-3-1';
	if (cmd.includes('fetch') || cmd.includes('pull')) return 'section-3-2';
	if (cmd.includes('push') || cmd.includes('remote')) return 'section-3-3';
	if (cmd.includes('restore --staged') || cmd === 'git reset <file>') return 'section-4-2';
	if (cmd.includes('restore') || cmd.includes('clean')) return 'section-4-1';
	if (cmd.includes('amend')) return 'section-4-3';
	if (cmd.includes('reset')) return 'section-4-4';
	if (cmd.includes('revert')) return 'section-4-5';
	if (cmd.includes('force')) return 'section-4-6';
	if (cmd.includes('merge')) return 'section-5-2';
	if (cmd.includes('log') || cmd.includes('show') || cmd.includes('blame')) return 'section-6-2';
	if (cmd.includes('bisect') || cmd.includes('reflog') || cmd.includes('submodule') || cmd.includes('worktree')) {
		return 'section-7-2';
	}
	if (cmd.includes('tag')) return 'section-7-2';

	const categoryFallback: Record<string, string> = {
		'Setup & Config': 'section-1-1',
		'Basic Workflow': 'section-2-1',
		Branching: 'section-3-1',
		Remote: 'section-3-2',
		Stashing: 'section-5-1',
		Undoing: 'section-4-1',
		'History & Inspection': 'section-6-2',
		'Rebase & Cherry-pick': 'section-5-2',
		Tags: 'section-7-2',
		Advanced: 'section-7-2'
	};

	return categoryFallback[category] ?? 'section-7-2';
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
				id: `${sectionId}-${slugify(baseCommand)}`,
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
		keywords: ['undo', 'undo matrix', 'recovery matrix', 'which command', 'mistake', 'recover'],
		kind: 'topic'
	},
	{
		id: 'topic-playground',
		sectionId: 'core-loop',
		title: 'Git Playground',
		part: 'Try it yourself',
		description: 'Practice Git commands in a real in-browser repo with Watch and Try it yourself tabs.',
		keywords: ['playground', 'practice', 'try it yourself', 'sandbox', 'terminal', 'interactive'],
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
