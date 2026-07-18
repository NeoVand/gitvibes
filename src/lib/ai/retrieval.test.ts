import { describe, expect, it } from 'vitest';
import { retrieve, titleForId } from './retrieval';

describe('retrieval routing', () => {
	it('routes "undo a pushed commit" into the undo toolkit', () => {
		const hits = retrieve('undo a pushed commit');
		expect(['section-4-7', 'section-4-5', 'part-4']).toContain(hits[0]?.id);
	});

	it('routes "what does git status show" to section 2.1', () => {
		const hits = retrieve('what does git status show');
		expect(hits[0]?.id).toBe('section-2-1');
	});

	it('routes "merge conflict markers resolve" to section 5.3', () => {
		const hits = retrieve('merge conflict markers resolve');
		expect(hits[0]?.id).toBe('section-5-3');
	});

	it('routes "reflog recover lost commits" to section 4.9', () => {
		const hits = retrieve('reflog recover lost commits');
		expect(hits[0]?.id).toBe('section-4-9');
	});

	it('routes "force push safely lease" to section 4.6', () => {
		const hits = retrieve('force push safely lease');
		expect(hits[0]?.id).toBe('section-4-6');
	});

	it('routes "rebase vs merge difference" to section 5.2', () => {
		const hits = retrieve('rebase vs merge difference');
		expect(hits[0]?.id).toBe('section-5-2');
	});

	it('routes "dependabot security bots" to section 8.2', () => {
		const hits = retrieve('dependabot security bots');
		expect(hits[0]?.id).toBe('section-8-2');
	});

	it('routes "semver release-please changelog" to section 8.3', () => {
		const hits = retrieve('semver release-please changelog');
		expect(hits[0]?.id).toBe('section-8-3');
	});

	it('routes "worktrees parallel agents" to section 6.3', () => {
		const hits = retrieve('worktrees parallel agents');
		expect(hits[0]?.id).toBe('section-6-3');
	});

	it('returns hits with titles, positive scores, and snippets', () => {
		const hits = retrieve('how do branches work', 3);
		expect(hits.length).toBeGreaterThan(0);
		expect(hits.length).toBeLessThanOrEqual(3);
		for (const hit of hits) {
			expect(hit.title).toBeTruthy();
			expect(hit.score).toBeGreaterThan(0);
			expect(hit.snippet).toBeTruthy();
		}
	});

	it('deduplicates hits by section id', () => {
		const hits = retrieve('stash switch branches', 5);
		const ids = hits.map((h) => h.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('returns nothing for an empty query', () => {
		expect(retrieve('')).toEqual([]);
		expect(retrieve('   ')).toEqual([]);
	});

	it('returns nothing for stopword-only queries', () => {
		expect(retrieve('what is the how why')).toEqual([]);
	});

	it('returns nothing for garbage tokens', () => {
		expect(retrieve('xyzzyqwlkj blorptastic zzyzx9000')).toEqual([]);
	});

	it('looks up pretty titles by id', () => {
		expect(titleForId('section-2-1')).toBe('2.1 git status');
		expect(titleForId('no-such-id')).toBeNull();
	});
});
