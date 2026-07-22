import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { partPages, partPageBySlug, partPageById, partImage, SITE_URL } from './part-pages';
import { anchorIds } from './sections';
import { courseGraph } from './course-map';

describe('part pages', () => {
	it('covers every part in the course, in reading order', () => {
		const parts = [...anchorIds].filter((id) => /^part-\d+$/.test(id));
		expect(partPages.map((p) => p.id)).toEqual(parts);
	});

	it('every id is a real anchor on the course page', () => {
		const known = new Set(anchorIds);
		expect(partPages.filter((p) => !known.has(p.id)).map((p) => p.id)).toEqual([]);
	});

	it('slugs are unique, lowercase and URL-safe', () => {
		const slugs = partPages.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	/**
	 * These strings are the search result and the link preview — the only text
	 * most people will ever read about a part. Too short says nothing; past
	 * about 160 characters Google truncates mid-sentence.
	 */
	it('descriptions are written to survive a search result', () => {
		for (const part of partPages) {
			expect(part.description.length, `${part.slug} description`).toBeGreaterThan(80);
			expect(part.description.length, `${part.slug} description`).toBeLessThanOrEqual(200);
		}
	});

	it('resolves both ways', () => {
		for (const part of partPages) {
			expect(partPageBySlug(part.slug)).toBe(part);
			expect(partPageById(part.id)).toBe(part);
		}
		expect(partPageBySlug('no-such-part')).toBeUndefined();
	});

	/**
	 * A part page with no image gets a blank social card, which is worse than
	 * no card at all. The manifest's inheritance is what guarantees one, so
	 * this asserts the guarantee rather than trusting it.
	 */
	it('every part resolves a social image', () => {
		for (const part of partPages) {
			expect(partImage(part.id), `${part.slug} has no banner`).toBeTruthy();
		}
	});

	it('the site URL carries no trailing slash, so joins do not double it', () => {
		expect(SITE_URL.endsWith('/')).toBe(false);
	});

	it('the loader can reach a component for every part', () => {
		// The dynamic-import map is a literal, so a part added without a matching
		// entry would 500 at request time rather than fail the build.
		const src = readFileSync('src/routes/parts/[slug]/+page.ts', 'utf8');
		for (const part of partPages) {
			expect(src.includes(`'${part.id}':`), `${part.id} is missing from the component map`).toBe(
				true
			);
		}
	});

	it('agrees with the course map on which parts exist', () => {
		const mapped = courseGraph.map((n) => n.id).filter((id) => /^part-\d+$/.test(id));
		expect(partPages.map((p) => p.id)).toEqual(mapped);
	});
});
