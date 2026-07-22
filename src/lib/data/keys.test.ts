import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cheatSheet } from './cheat-sheet';
import { searchIndex } from './search-index';
import { anchorIds } from './sections';

/**
 * sidebar-nav.ts imports lucide components, which this node-environment test
 * can't evaluate — so read the ids out of the source text instead. Same trick
 * scripts/build-course-index.mjs uses.
 */
function navIds(): string[] {
	const src = readFileSync('src/lib/data/sidebar-nav.ts', 'utf8');
	return [...src.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

/**
 * Svelte's keyed `{#each … (key)}` blocks throw on a duplicate key, and the
 * throw takes down the whole render — the page loses its header and sidebar
 * with no console error to explain why. These lists are all rendered keyed,
 * so a duplicate here is a white-screen bug, not a cosmetic one.
 *
 * (This is not hypothetical: a second `:q!` row in one cheat sheet category
 * broke the sister course exactly this way. The data looked harmless and the
 * crash looked unrelated.)
 */
function duplicates(values: string[]): string[] {
	return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
}

describe('render keys are unique', () => {
	it('cheat sheet category labels — keyed in CheatSheet and the print route', () => {
		expect(duplicates(cheatSheet.map((c) => c.label))).toEqual([]);
	});

	it('commands within each cheat sheet category', () => {
		for (const category of cheatSheet) {
			expect(
				duplicates(category.commands.map((c) => c.command)),
				`duplicate command in "${category.label}"`
			).toEqual([]);
		}
	});

	it('search index entry ids', () => {
		expect(duplicates(searchIndex.map((e) => e.id))).toEqual([]);
	});

	it('sidebar nav ids, including children', () => {
		expect(duplicates(navIds())).toEqual([]);
	});

	it('anchor ids (sections and playgrounds share one hash namespace)', () => {
		expect(duplicates([...anchorIds])).toEqual([]);
	});
});

describe('nav and anchors agree', () => {
	it('every sidebar target is a real anchor id', () => {
		const known = new Set(anchorIds);
		expect(navIds().filter((id) => !known.has(id))).toEqual([]);
	});

	/**
	 * A search hit scrolls to entry.sectionId. An id that no longer exists fails
	 * silently — the result looks fine and clicking it goes nowhere, which is
	 * precisely the failure a renumbering (Conclusion 8 → 9) can leave behind
	 * while every other consistency check still passes.
	 */
	it('every search result scrolls to a real anchor id', () => {
		const known = new Set(anchorIds);
		const broken = searchIndex
			.filter((entry) => !known.has(entry.sectionId))
			.map((entry) => `${entry.id} → ${entry.sectionId}`);
		expect(broken).toEqual([]);
	});
});
