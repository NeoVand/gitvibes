import { describe, expect, it } from 'vitest';
import manifest from '../data/timeline-manifest.json';
import offsets from './measured-offsets.fixture.json';
import { buildModel, type PlacedItem, type TimelineItem } from './mapping';
import {
	TOTAL_PLAYGROUNDS,
	TOTAL_SECTIONS,
	playgroundIds,
	readableIds,
	summarizeParts
} from './summary';
import { readFileSync } from 'node:fs';
import { lessonScenarioIds } from '../playground/scenarios';
import { playgroundAnchorIds } from '../data/sections';

const items = manifest as TimelineItem[];

/** The manifest with the fixture's measured offsets, as the rail sees it. */
function placed(): PlacedItem[] {
	const h = offsets.h;
	const byId = new Map(offsets.a.map((o) => [o.id, o.top]));
	return items.map((it) => ({ ...it, f: (byId.get(it.id) ?? 0) / h }));
}

describe('summary denominators', () => {
	it('counts the manifest, not sectionIds', () => {
		expect(TOTAL_SECTIONS).toBe(42);
		expect(TOTAL_PLAYGROUNDS).toBe(23);
		expect(readableIds.length + playgroundIds.length).toBe(65);
		// The whole manifest is 84: 65 content anchors, 10 part headers (hero
		// plus nine parts) and the nine challenges. The challenges are counted
		// here and NOWHERE in the two denominators above — a challenge is a
		// part's closing exam, not another exercise to tick off, and folding it
		// into TOTAL_PLAYGROUNDS would silently move every reader's percentage.
		expect(items.length).toBe(84);
	});

	/**
	 * The bug this pins shut. `partSkeleton` sorts each item into `sections`
	 * or `playgrounds` EXPLICITLY, never by a trailing `else` — a trailing else
	 * would sweep any future `kind: 'challenge'` anchor into the playground
	 * bucket the moment it entered the manifest, silently inflating the
	 * exercise denominator on both surfaces at once. A challenge is a Part's
	 * exit test, not one of the 23 playgrounds.
	 */
	it('keeps challenges out of both denominators', () => {
		const challenges = items.filter((it) => it.kind === 'challenge').map((it) => it.id);
		for (const id of challenges) {
			expect(readableIds).not.toContain(id);
			expect(playgroundIds).not.toContain(id);
		}
		// And a synthetic future challenge in the done-set moves neither number.
		const full = summarizeParts(new Set(), new Set([...challenges, 'challenge-of-tomorrow']));
		expect(full.reduce((a, p) => a + p.playgroundsDone, 0)).toBe(0);
		expect(full.reduce((a, p) => a + p.sectionsRead, 0)).toBe(0);
	});

	it('excludes part headers from the readable set', () => {
		const parts = items.filter((it) => it.kind === 'part').map((it) => it.id);
		expect(parts).toHaveLength(10);
		for (const id of parts) expect(readableIds).not.toContain(id);
	});

	/**
	 * The acceptance gate for "one number, two surfaces". The rail's hover card
	 * prints `secs.filter(read).length / secs.length` per part, where `secs`
	 * are the `kind: 'section'` kids of `buildModel`'s part entries. If the
	 * rollup here is the same partition, summing the rail's own chips
	 * reproduces the whole-course fraction exactly — for ANY progress set, not
	 * just a lucky one.
	 */
	it('agrees with buildModel part-by-part, for a scattered progress set', () => {
		const model = buildModel(placed());
		// deliberately irregular: every third section, every fourth playground
		const readIds = new Set(readableIds.filter((_, i) => i % 3 === 0));
		const doneIds = new Set(playgroundIds.filter((_, i) => i % 4 === 0));

		const mine = summarizeParts(readIds, doneIds);
		expect(mine).toHaveLength(model.parts.length);

		let secTotal = 0;
		let secRead = 0;
		for (let i = 0; i < model.parts.length; i++) {
			const railSecs = model.parts[i].kids.filter((f) => f.item.kind === 'section');
			const railPlay = model.parts[i].kids.filter((f) => f.item.kind === 'playground');
			expect(mine[i].id).toBe(model.parts[i].item.id);
			expect(mine[i].sections).toBe(railSecs.length);
			expect(mine[i].playgrounds).toBe(railPlay.length);
			expect(mine[i].sectionsRead).toBe(railSecs.filter((f) => readIds.has(f.item.id)).length);
			expect(mine[i].playgroundsDone).toBe(railPlay.filter((f) => doneIds.has(f.item.id)).length);
			secTotal += mine[i].sections;
			secRead += mine[i].sectionsRead;
		}
		// nothing falls between two parts
		expect(secTotal).toBe(TOTAL_SECTIONS);
		expect(secRead).toBe(readIds.size);
	});

	it('reaches 100% and 0% at the extremes', () => {
		const empty = summarizeParts(new Set(), new Set());
		expect(empty.reduce((a, p) => a + p.sectionsRead, 0)).toBe(0);

		const full = summarizeParts(new Set(readableIds), new Set(playgroundIds));
		expect(full.reduce((a, p) => a + p.sectionsRead, 0)).toBe(TOTAL_SECTIONS);
		expect(full.reduce((a, p) => a + p.playgroundsDone, 0)).toBe(TOTAL_PLAYGROUNDS);
	});
});

describe('exercise denominator is reachable', () => {
	/**
	 * The sidebar prints `doneCount/lessonScenarioIds.length`. `doneCount` can
	 * only rise for a scenario the reader can actually open, and the only
	 * reliable route to most of them is the sidebar's own gamepad row — so if
	 * a scenario has no row, the maximum is unreachable and the counter reads
	 * n-1/n forever.
	 */
	it('every lesson scenario has a sidebar row', () => {
		// Read the source rather than importing it: sidebar-nav.ts pulls in
		// lucide-svelte, which this node-environment suite cannot resolve. The
		// invariant is over static checked-in data either way.
		const src = readFileSync(new URL('../data/sidebar-nav.ts', import.meta.url).pathname, 'utf8');
		const rows = new Set(
			[...src.matchAll(/id:\s*'([a-z0-9-]+)'[^}]*isPlayground:\s*true/g)].map((m) => m[1])
		);
		const missing = (lessonScenarioIds as readonly string[]).filter((id) => !rows.has(id));
		expect(missing).toEqual([]);
		expect(rows.size).toBe(lessonScenarioIds.length);
	});

	it('the three playground lists are the same set', () => {
		expect([...playgroundIds].sort()).toEqual([...playgroundAnchorIds].sort());
		expect([...playgroundIds].sort()).toEqual([...lessonScenarioIds].sort());
	});
});
