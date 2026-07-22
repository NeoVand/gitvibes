/**
 * The course as a graph rather than a list.
 *
 * Labels and icons are NOT duplicated here — they resolve from sidebarNav, so
 * a part renamed in the sidebar is renamed everywhere it's referenced. That
 * indirection is the point: cross-references in the prose name a part instead
 * of numbering it, which keeps them correct if the curriculum is ever
 * reordered. It has been reordered once already.
 */

export interface CourseNode {
	/** Anchor id, e.g. 'part-8'. */
	id: string;
	/** What a learner can do after this part — one short clause. */
	gives: string;
	/** Parts whose skills this one genuinely builds on. */
	needs: string[];
	/**
	 * 'core'    — the spine; skipping one breaks what follows
	 * 'power'   — everyday power tools, each independently useful
	 * 'mastery' — synthesis and enrichment; rewarding, not load-bearing
	 */
	track: 'core' | 'power' | 'mastery';
}

/**
 * Prerequisites are the honest ones: what the lesson actually leans on, not
 * everything that happens to come earlier. Worktrees need branches; they do
 * not need rebase.
 */
export const courseGraph: CourseNode[] = [
	{ id: 'hero', gives: 'what version control is for, and why now', needs: [], track: 'core' },
	{
		id: 'part-1',
		gives: 'a repo of your own, signed with your name',
		needs: ['hero'],
		track: 'core'
	},
	{
		id: 'part-2',
		gives: 'save work deliberately — status, stage, commit',
		needs: ['part-1'],
		track: 'core'
	},
	{
		id: 'part-3',
		gives: 'work on a branch and propose it as a pull request',
		needs: ['part-2'],
		track: 'core'
	},
	{
		id: 'part-4',
		gives: 'undo anything, at the layer it went wrong',
		needs: ['part-2', 'part-3'],
		track: 'core'
	},
	{
		id: 'part-5',
		gives: 'stash, rebase, resolve conflicts, tag a release',
		needs: ['part-3', 'part-4'],
		track: 'power'
	},
	{
		id: 'part-6',
		gives: 'give an agent a repo it cannot wreck',
		needs: ['part-3', 'part-5'],
		track: 'power'
	},
	{
		id: 'part-7',
		gives: 'drive the same moves from an editor',
		needs: ['part-2', 'part-4'],
		track: 'power'
	},
	{
		id: 'part-8',
		gives: 'let CI, bots and release tooling carry the routine',
		needs: ['part-3', 'part-5'],
		track: 'mastery'
	},
	{
		id: 'part-9',
		gives: 'the habits, a reference card, and a final challenge',
		needs: ['part-4', 'part-6', 'part-8'],
		track: 'mastery'
	}
];

export function nodeFor(id: string): CourseNode | undefined {
	return courseGraph.find((n) => n.id === id);
}

/** Course order, for laying the map out in reading sequence. */
export const courseOrder: string[] = courseGraph.map((n) => n.id);

/**
 * Everything you'd need before `id` makes sense, walked transitively and
 * returned in reading order — the "what do I have to read first?" answer.
 */
export function prerequisitesOf(id: string): string[] {
	const seen = new Set<string>();
	const walk = (current: string) => {
		for (const need of nodeFor(current)?.needs ?? []) {
			if (seen.has(need)) continue;
			seen.add(need);
			walk(need);
		}
	};
	walk(id);
	return courseOrder.filter((n) => seen.has(n));
}
