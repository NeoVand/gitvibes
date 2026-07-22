/**
 * The one channel between the header's search box and the Thread rail.
 *
 * `SearchEntry.sectionId` is already a DOM anchor id, and every rail mark is
 * keyed by the same anchor id, so a result set maps straight onto rail
 * positions with no translation table. What it must NOT do is travel by prop:
 * Search and ThreadRail are siblings under Header, which is itself a child of
 * the page, so threading a result set between them would mean two new props on
 * Header and one on the page — three files edited to move a value that only
 * two components care about, and a re-render of the whole header on every
 * keystroke.
 *
 * A module-level rune is the smaller thing. It is a singleton, which is
 * correct here: there is exactly one search box and exactly one rail.
 *
 * Search is the only writer; the rail is a reader.
 */

/** Deduped anchor ids for the current result set, in result order. */
let ids = $state<readonly string[]>([]);

/** Cheap identity check so an unchanged result set does not wake the rail. */
function same(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

export const searchHits = {
	get ids(): readonly string[] {
		return ids;
	},

	/**
	 * Publish the current results. Several results routinely resolve to the
	 * same anchor — the index lists `git reset --soft`, `--mixed` and `--hard`
	 * separately but they all live in section 4.4 — and the rail draws one mark
	 * per anchor, so dedupe here rather than making every reader do it.
	 */
	set(anchorIds: readonly string[]): void {
		const out: string[] = [];
		for (const id of anchorIds) if (id && !out.includes(id)) out.push(id);
		if (!same(out, ids)) ids = out;
	},

	/** Search closed, cleared, or unmounted. */
	clear(): void {
		if (ids.length) ids = [];
	}
};
