import manifest from '../data/timeline-manifest.json';
import { partLabel, type TimelineItem } from './mapping';

/**
 * Per-part progress rollup, shared by the header rail and the sidebar.
 *
 * This module exists because the two surfaces can disagree. The sidebar
 * divides its "% read" by `sectionIds.length` — which is ten PART HEADERS plus
 * the sections, and excludes every playground. The rail's hover cards count
 * only `kind: 'section'` items and report playgrounds separately as "n/m
 * solved". Two different denominators for the same word on the same screen
 * reads as a bug.
 *
 * The fix is to make the MANIFEST the single source of both numbers, so the
 * sidebar's percentage is by construction the sum of the rail's per-part
 * "n/m read" chips over every part. Part headers are excluded from the read
 * denominator deliberately: a part header is a title, not content, and the
 * reader cannot "read" it independently of the section under it. Playgrounds
 * are excluded too, because they already have their own denominator — counting
 * one both as read and as an exercise double-counts the same work.
 *
 * Grouping is "the most recent `kind: 'part'` at or before this item in
 * manifest order", which is exactly what `buildModel`'s `partOf` map does for
 * non-part items. So the per-part splits here and the rail's HUD splits are the
 * same partition, not two implementations that happen to agree today.
 */

const items = manifest as TimelineItem[];

export interface PartProgress {
	id: string;
	/** "Introduction", "Part 7" — the rail's own wording. */
	label: string;
	sections: number;
	sectionsRead: number;
	playgrounds: number;
	playgroundsDone: number;
}

/** Every anchor the rail treats as readable content. */
export const readableIds: readonly string[] = items
	.filter((it) => it.kind === 'section')
	.map((it) => it.id);

/** Every playground anchor. */
export const playgroundIds: readonly string[] = items
	.filter((it) => it.kind === 'playground')
	.map((it) => it.id);

/** The part skeleton, in page order, with its section/playground membership. */
const partSkeleton: { id: string; label: string; sections: string[]; playgrounds: string[] }[] =
	(() => {
		const out: { id: string; label: string; sections: string[]; playgrounds: string[] }[] = [];
		for (const it of items) {
			if (it.kind === 'part') {
				out.push({ id: it.id, label: partLabel(it), sections: [], playgrounds: [] });
				continue;
			}
			// A manifest that opened with a non-part item would drop it silently;
			// there is no such item today, and build-timeline.mjs enforces that the
			// first anchor is `hero`, but skipping is still the safe read.
			const cur = out[out.length - 1];
			if (!cur) continue;
			// Explicit on both kinds, never an `else`. A trailing else would sweep
			// any future `kind: 'challenge'` anchor into the playground bucket the
			// moment it landed in the manifest, quietly inflating the exercise
			// denominator on both surfaces at once.
			if (it.kind === 'section') cur.sections.push(it.id);
			else if (it.kind === 'playground') cur.playgrounds.push(it.id);
		}
		return out;
	})();

/** Roll the two progress sets up per part. Pure; safe to call in a `$derived`. */
export function summarizeParts(
	readIds: ReadonlySet<string>,
	doneIds: ReadonlySet<string>
): PartProgress[] {
	return partSkeleton.map((p) => ({
		id: p.id,
		label: p.label,
		sections: p.sections.length,
		sectionsRead: p.sections.filter((id) => readIds.has(id)).length,
		playgrounds: p.playgrounds.length,
		playgroundsDone: p.playgrounds.filter((id) => doneIds.has(id)).length
	}));
}

/** Whole-course totals, i.e. the denominators both surfaces must quote. */
export const TOTAL_SECTIONS = readableIds.length;
export const TOTAL_PLAYGROUNDS = playgroundIds.length;
