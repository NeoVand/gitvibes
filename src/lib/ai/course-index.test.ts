import { describe, expect, it } from 'vitest';
import courseIndex from './course-index.json';
import { sectionIds } from '../data/sections';

interface Entry {
	id: string;
	part: number;
	title: string;
	text: string;
}

const entries = courseIndex as Entry[];

describe('course index sanity', () => {
	it('exists and is non-empty', () => {
		expect(entries.length).toBeGreaterThan(40);
	});

	it('every section entry id is a real section id', () => {
		const known = new Set<string>(sectionIds);
		for (const entry of entries) {
			if (entry.id.startsWith('cheat-')) continue;
			expect(known, `unknown id ${entry.id}`).toContain(entry.id);
		}
	});

	it('covers every section of the course', () => {
		const indexed = new Set(entries.map((e) => e.id));
		for (const id of sectionIds) {
			expect(indexed, `missing section ${id}`).toContain(id);
		}
	});

	it('has no empty texts and respects the chunk budget', () => {
		for (const entry of entries) {
			expect(entry.text.trim().length).toBeGreaterThan(0);
			expect(entry.text.length).toBeLessThanOrEqual(1200);
		}
	});

	it('every entry has a title and a numeric part', () => {
		for (const entry of entries) {
			expect(entry.title).toBeTruthy();
			expect(typeof entry.part).toBe('number');
		}
	});

	it('contains no unstripped markup', () => {
		// Decoded placeholders like `echo <pattern>` are legitimate text, so
		// look for real tag remnants: closing tags, common elements, attrs.
		for (const entry of entries) {
			expect(entry.text).not.toMatch(/<\/[a-z]+>|<(div|p|span|code|strong|em|button|section)\b/i);
			expect(entry.text).not.toMatch(/class="|style="/);
			expect(entry.text).not.toMatch(/\{#(if|each)/);
		}
	});
});
