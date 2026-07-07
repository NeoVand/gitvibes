import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

// Truthful Mermaid gitGraph generation. The old emitter drew every branch as
// forking from main's TIP and never drew merge nodes — the visual actively
// contradicted the terminal in exactly the merge/rebase/sync lessons. This
// one works from the real DAG:
//
//  - commits are emitted in topological order (parents first)
//  - `branch X` is emitted at the moment its true fork parent is emitted,
//    which pins Mermaid's fork point to the correct commit
//  - two-parent commits become real `merge` statements when the second
//    parent is the current tip of another drawn lane
//  - tags, remote-TRACKING refs, and a detached HEAD show up as tag labels
//    (Mermaid's only way to annotate an arbitrary commit)

interface CommitNode {
	oid: string;
	parents: string[];
	message: string;
	timestamp: number;
	lane: string;
}

/**
 * First line of the message, quote-safe, cut to `max` characters at a word
 * boundary. Multi-lane graphs use a tighter cut: Mermaid rotates commit
 * labels 45° down-left, so long labels on an upper lane stab straight
 * through the branch pill of the lane below.
 */
function sanitizeLabel(message: string, max = 28): string {
	const line = message.split('\n')[0].replace(/"/g, "'").trim();
	if (!line) return 'commit';
	if (line.length <= max) return line;
	const cut = line.slice(0, max);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function sanitizeTag(name: string): string {
	return name.replace(/"/g, "'").slice(0, 24);
}

export async function buildGitGraph(engine: GitEngine): Promise<string> {
	const { fs, dir } = engine;

	let localBranches: string[];
	try {
		localBranches = await git.listBranches({ fs, dir });
	} catch {
		return 'gitGraph\n  commit id: "empty"';
	}
	if (localBranches.length === 0) {
		return 'gitGraph\n  commit id: "empty"';
	}

	const currentBranch = await git.currentBranch({ fs, dir });
	const mainBranch = localBranches.includes('main') ? 'main' : localBranches[0];

	// ── collect refs: locals, remote-tracking (honesty: never the true
	//    remote), and HEAD itself when detached ─────────────────────────
	const refs: { lane: string; ref: string }[] = [];
	refs.push({ lane: mainBranch, ref: mainBranch });
	if (currentBranch && currentBranch !== mainBranch) {
		refs.push({ lane: currentBranch, ref: currentBranch });
	}
	for (const b of localBranches.sort()) {
		if (b === mainBranch || b === currentBranch) continue;
		refs.push({ lane: b, ref: b });
	}
	const trackingBranches = await git
		.listBranches({ fs, dir, remote: 'origin' })
		.catch(() => [] as string[]);
	const trackingTips = new Map<string, string>();
	for (const b of trackingBranches) {
		if (b === 'HEAD') continue;
		const oid = await git
			.resolveRef({ fs, dir, ref: `refs/remotes/origin/${b}` })
			.catch(() => null);
		if (oid) {
			trackingTips.set(`origin/${b}`, oid);
			refs.push({ lane: `origin/${b}`, ref: `refs/remotes/origin/${b}` });
		}
	}
	const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
	if (!currentBranch && headOid) {
		refs.push({ lane: 'detached', ref: 'HEAD' });
	}

	// ── gather commits (provisional lane = first ref that reaches them) ──
	const nodes = new Map<string, CommitNode>();
	const refTips = new Map<string, string>();
	for (const { lane, ref } of refs) {
		const log = await git.log({ fs, dir, ref, depth: 100 }).catch(() => []);
		if (log.length > 0 && !refTips.has(lane)) refTips.set(lane, log[0].oid);
		for (const entry of log) {
			if (!nodes.has(entry.oid)) {
				nodes.set(entry.oid, {
					oid: entry.oid,
					parents: entry.commit.parent,
					message: entry.commit.message,
					timestamp: entry.commit.committer.timestamp,
					lane
				});
			}
		}
	}
	if (nodes.size === 0) {
		return 'gitGraph\n  commit id: "no commits yet"';
	}

	// ── refine lanes: a commit belongs to the ref whose FIRST-PARENT chain
	//    contains it. Without this, commits brought in by a merge's second
	//    parent get claimed by the merging branch and the merge edge is lost.
	{
		const claimed = new Set<string>();
		for (const { lane } of refs) {
			let cursor = refTips.get(lane);
			while (cursor && nodes.has(cursor) && !claimed.has(cursor)) {
				const node = nodes.get(cursor)!;
				node.lane = lane;
				claimed.add(cursor);
				cursor = node.parents[0];
			}
		}
		// Unclaimed commits (side legs of in-lane merges) keep their
		// reachability-order lane from the collection pass above.
	}

	// ── tag + tip decorations (Mermaid: one tag string per commit) ──────
	const decorations = new Map<string, string[]>();
	const decorate = (oid: string | null, label: string) => {
		if (!oid || !nodes.has(oid)) return;
		const list = decorations.get(oid) ?? [];
		list.push(sanitizeTag(label));
		decorations.set(oid, list);
	};
	for (const t of await git.listTags({ fs, dir }).catch(() => [] as string[])) {
		const oid = await engine.resolveRevision(t).catch(() => null);
		decorate(oid, t);
	}
	for (const [lane, oid] of trackingTips) {
		// Only decorate when the tracking ref isn't drawing its own lane tip
		const node = nodes.get(oid);
		if (node && node.lane !== lane) decorate(oid, lane);
	}
	if (!currentBranch && headOid) decorate(headOid, 'HEAD');

	// ── topological order: parents before children, then by time ────────
	const inSet = (oid: string) => nodes.has(oid);
	const pendingParents = new Map<string, number>();
	const children = new Map<string, string[]>();
	for (const node of nodes.values()) {
		const parentsIn = node.parents.filter(inSet);
		pendingParents.set(node.oid, parentsIn.length);
		for (const p of parentsIn) {
			children.set(p, [...(children.get(p) ?? []), node.oid]);
		}
	}
	const ready: CommitNode[] = [...nodes.values()].filter((n) => pendingParents.get(n.oid) === 0);
	const laneRank = new Map<string, number>(refs.map((r, i) => [r.lane, i]));
	const byPriority = (a: CommitNode, b: CommitNode) =>
		a.timestamp - b.timestamp ||
		(laneRank.get(a.lane) ?? 99) - (laneRank.get(b.lane) ?? 99) ||
		a.oid.localeCompare(b.oid);
	const ordered: CommitNode[] = [];
	ready.sort(byPriority);
	while (ready.length > 0) {
		const node = ready.shift()!;
		ordered.push(node);
		for (const childOid of children.get(node.oid) ?? []) {
			const left = (pendingParents.get(childOid) ?? 1) - 1;
			pendingParents.set(childOid, left);
			if (left === 0) {
				ready.push(nodes.get(childOid)!);
				ready.sort(byPriority);
			}
		}
	}

	// ── fork parents: where each non-main lane must be created ──────────
	const forkParent = new Map<string, string>(); // lane -> parent oid
	for (const node of ordered) {
		if (node.lane === mainBranch || forkParent.has(node.lane)) continue;
		// earliest commit of the lane in topo order; fork at its first parent
		const parent = node.parents.find(inSet);
		if (parent) forkParent.set(node.lane, parent);
	}

	// ── emit ─────────────────────────────────────────────────────────────
	// Tighter labels when several lanes are drawn: rotated labels from an
	// upper lane otherwise collide with the branch pills below them.
	const laneCount = new Set([...nodes.values()].map((n) => n.lane)).size;
	const labelMax = laneCount > 1 ? 20 : 28;

	const lines: string[] = ['gitGraph'];
	const created = new Set<string>([mainBranch]);
	const lastEmitted = new Map<string, string>();
	let checkedOut = mainBranch;

	const checkout = (lane: string) => {
		if (checkedOut === lane) return;
		lines.push(`  checkout ${lane}`);
		checkedOut = lane;
	};

	const createForksAt = (oid: string, owningLane: string) => {
		for (const [lane, parent] of forkParent) {
			if (parent !== oid || created.has(lane)) continue;
			checkout(owningLane);
			lines.push(`  branch ${lane}`);
			created.add(lane);
			checkedOut = lane; // Mermaid's `branch` also checks out
			lastEmitted.set(lane, oid);
		}
	};

	for (const node of ordered) {
		const lane = node.lane;
		if (lane !== mainBranch && !created.has(lane)) {
			// Root-parented or unusual lane: create it from wherever we are
			checkout(mainBranch);
			lines.push(`  branch ${lane}`);
			created.add(lane);
			checkedOut = lane;
		}

		const deco = decorations.get(node.oid);
		const tagAttr = deco?.length ? ` tag: "${deco.join(' · ')}"` : '';

		const secondParent = node.parents[1];
		const mergeSourceLane =
			secondParent && inSet(secondParent)
				? [...created].find(
						(l) => l !== lane && lastEmitted.get(l) === secondParent && created.has(l)
					)
				: undefined;

		checkout(lane);
		if (secondParent && mergeSourceLane) {
			lines.push(`  merge ${mergeSourceLane}${tagAttr}`);
		} else if (secondParent) {
			// A merge whose second parent isn't a drawable lane tip
			lines.push(`  commit id: "⑂ ${sanitizeLabel(node.message, labelMax - 2)}"${tagAttr}`);
		} else {
			lines.push(`  commit id: "${sanitizeLabel(node.message, labelMax)}"${tagAttr}`);
		}
		lastEmitted.set(lane, node.oid);
		createForksAt(node.oid, lane);
	}

	// Land on the branch the learner is actually on
	const finalLane = currentBranch ?? (headOid ? 'detached' : mainBranch);
	if (created.has(finalLane)) checkout(finalLane);

	return lines.join('\n');
}
