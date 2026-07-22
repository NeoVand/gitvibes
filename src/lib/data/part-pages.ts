import manifest from './timeline-manifest.json';

/**
 * The standalone /parts/<slug> pages — one prerendered, crawlable URL per
 * part. The single-page course at / stays the canonical reading experience;
 * these exist so each part has a shareable link, its own title/description,
 * and its own social card. Slugs are semantic (they are the marketing
 * surface); ids are the same `part-N` anchors the rest of the app uses.
 */
export interface PartPage {
	/** Anchor id on the main page, e.g. `part-7` */
	id: string;
	/** URL slug under /parts/ */
	slug: string;
	/** Full display title, matching the part's SectionHeader */
	title: string;
	/** Meta/OG description, written for search results (~150 chars) */
	description: string;
}

export const SITE_URL = 'https://neovand.github.io/gitvibes';

export const partPages: PartPage[] = [
	{
		id: 'part-1',
		slug: 'setup-and-cloning',
		title: 'Enterprise Onboarding: Connecting to Your Codebase',
		description:
			'Install Git, sign your work with a name and email, authenticate over SSH or HTTPS, and clone your first repository — the setup every later chapter assumes.'
	},
	{
		id: 'part-2',
		slug: 'core-safety-loop',
		title: 'The Core Safety Loop: Your Save Game for AI Coding',
		description:
			'Status, stage, commit — the four-step loop that turns AI-generated changes into work you can review, keep or throw away, plus what .gitignore is really for.'
	},
	{
		id: 'part-3',
		slug: 'branching-and-pull-requests',
		title: 'Parallel Universes: Branching for AI Experiments',
		description:
			'Branch so an experiment can fail safely, then propose it as a pull request. Covers switch, merge, remotes, and how review works when a bot opens the PR.'
	},
	{
		id: 'part-4',
		slug: 'undo-toolkit',
		title: 'The Undo Toolkit: Reversing AI Mistakes',
		description:
			'Every way to undo, matched to the layer that went wrong: restore a file, unstage, amend, reset, revert a pushed commit, and recover from a detached HEAD.'
	},
	{
		id: 'part-5',
		slug: 'advanced-workflows',
		title: 'Advanced Scenarios: Managing a Multi-Branch Workflow',
		description:
			'Stash work in progress, rebase for a clean history, resolve conflicts without panic, cherry-pick a single commit, and tag a release.'
	},
	{
		id: 'part-6',
		slug: 'git-for-ai-agents',
		title: 'Git for AI Agents: Rules, Guardrails, and Scale',
		description:
			'AGENTS.md conventions, hooks as seatbelts, and worktrees for running several coding agents at once without them overwriting each other.'
	},
	{
		id: 'part-7',
		slug: 'vs-code-cockpit',
		title: 'Your AI-Assisted Cockpit: Mastering Git in VS Code',
		description:
			'The same Git moves from an editor: the source control panel, staging individual hunks, the merge editor, blame, and the timeline view.'
	},
	{
		id: 'part-8',
		slug: 'ci-bots-and-releases',
		title: 'Ship It: CI, Bots, and Releases',
		description:
			'What the green check actually means, how Dependabot and CodeQL keep a repo current, and how semantic versioning turns commits into releases.'
	},
	{
		id: 'part-9',
		slug: 'conclusion',
		title: 'Conclusion: Best Practices for AI-Augmented Teams',
		description:
			'The habits worth keeping, a printable reference card, a final challenge that combines everything, and where to go next.'
	}
];

const bySlug = new Map(partPages.map((p) => [p.slug, p]));
const byId = new Map(partPages.map((p) => [p.id, p]));

export function partPageBySlug(slug: string): PartPage | undefined {
	return bySlug.get(slug);
}

export function partPageById(id: string): PartPage | undefined {
	return byId.get(id);
}

/**
 * The banner a part's social card should use. Read from the timeline manifest
 * rather than restated here: the manifest already resolves which anchors own a
 * banner and which inherit their part's first section, so a part whose own
 * header has no art still gets a card.
 */
export function partImage(id: string): string | null {
	const item = (manifest as { id: string; image?: string }[]).find((it) => it.id === id);
	return item?.image ?? null;
}
