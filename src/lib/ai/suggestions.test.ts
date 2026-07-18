import { describe, expect, it } from 'vitest';
import {
	buildSuggestionPrompt,
	groundingSnippets,
	normalizeSuggestion,
	STATIC_STARTERS,
	SUGGESTION_COUNT,
	SuggestionLineParser,
	suggestionTopic,
	topUpSuggestions
} from './suggestions';

describe('normalizeSuggestion', () => {
	it('strips numbering, bullets, and wrapping quotes', () => {
		expect(normalizeSuggestion('1. What does chmod +x do?')).toBe('What does chmod +x do?');
		expect(normalizeSuggestion('2) How do pipes work?')).toBe('How do pipes work?');
		expect(normalizeSuggestion('- Why is rm dangerous?')).toBe('Why is rm dangerous?');
		expect(normalizeSuggestion('"Can you demo grep?"')).toBe('Can you demo grep?');
	});

	it('keeps backticks inside the question intact', () => {
		expect(normalizeSuggestion('3. What does `ls -l` show?')).toBe('What does `ls -l` show?');
	});

	it('rejects fragments, runaway lines, and non-text', () => {
		expect(normalizeSuggestion('')).toBeNull();
		expect(normalizeSuggestion('ok?')).toBeNull();
		expect(normalizeSuggestion('x'.repeat(120))).toBeNull();
		expect(normalizeSuggestion('4. ---')).toBeNull();
	});
});

describe('SuggestionLineParser', () => {
	it('emits each question the moment its line completes, across split tokens', () => {
		const parser = new SuggestionLineParser();
		expect(parser.push('1. What does ch')).toEqual([]);
		expect(parser.push('mod do?\n2. How do')).toEqual(['What does chmod do?']);
		expect(parser.push(' pipes work?\n')).toEqual(['How do pipes work?']);
		expect(parser.questions).toEqual(['What does chmod do?', 'How do pipes work?']);
	});

	it('flush drains an unterminated final line', () => {
		const parser = new SuggestionLineParser();
		parser.push('1. What is a shell?\n2. What is a prompt?');
		expect(parser.flush()).toEqual(['What is a prompt?']);
	});

	it('dedupes case-insensitively and stops at the chip count', () => {
		const parser = new SuggestionLineParser();
		parser.push('1. What is sudo?\n2. WHAT IS SUDO?\n');
		expect(parser.questions).toEqual(['What is sudo?']);
		parser.push('3. Q one is fine?\n4. Q two is fine?\n5. Q three is fine?\n6. Q four is fine?\n');
		expect(parser.questions).toHaveLength(SUGGESTION_COUNT);
	});
});

describe('topUpSuggestions', () => {
	it('fills a short parse from the starters without duplicates', () => {
		const out = topUpSuggestions(['How do branches work?', 'What is rebase?']);
		expect(out).toHaveLength(SUGGESTION_COUNT);
		expect(out.slice(0, 2)).toEqual(['How do branches work?', 'What is rebase?']);
		// The identical starter is skipped, the other two fill the row.
		expect(out).toContain('How do I undo a pushed commit?');
		expect(out).toContain('Is git reset --hard safe to approve?');
		expect(new Set(out.map((q) => q.toLowerCase())).size).toBe(out.length);
	});

	it('a full parse passes through untouched', () => {
		const four = ['a?'.repeat(5), 'b?'.repeat(5), 'c?'.repeat(5), 'd?'.repeat(5)];
		expect(topUpSuggestions(four)).toEqual(four);
	});

	it('an empty parse becomes exactly the static starters', () => {
		expect(topUpSuggestions([])).toEqual([...STATIC_STARTERS]);
	});
});

describe('suggestionTopic', () => {
	it('drops section numbering and the part suffix', () => {
		expect(suggestionTopic('5.2 chmod — Permissions & Environment')).toBe('chmod');
		expect(suggestionTopic('Part 5 · Permissions & Environment')).toBe('Permissions & Environment');
		expect(suggestionTopic('Introduction')).toBe('Introduction');
	});
});

describe('groundingSnippets', () => {
	it("returns the section's own chunks for a real section", () => {
		const snippets = groundingSnippets({ sectionId: 'section-2-1', label: '2.1 git status' });
		expect(snippets.length).toBeGreaterThan(0);
		expect(snippets.join(' ')).toMatch(/prompted the AI|refactor/i);
	});

	it('falls back to a lexical search for spots without chunks', () => {
		const snippets = groundingSnippets({
			sectionId: 'first-steps',
			label: 'Say Hello to the Machine — First Contact'
		});
		expect(snippets.length).toBeGreaterThan(0);
	});

	it('caps each excerpt to keep the prompt lightweight', () => {
		for (const s of groundingSnippets({ sectionId: 'section-5-2', label: '5.2 chmod' })) {
			expect(s.length).toBeLessThanOrEqual(360);
		}
	});
});

describe('buildSuggestionPrompt', () => {
	it('carries the spot, the excerpts, and the format contract', () => {
		const prompt = buildSuggestionPrompt({
			label: '5.2 chmod — Permissions & Environment',
			snippets: ['chmod flips the execute bit.']
		});
		expect(prompt).toContain('"5.2 chmod — Permissions & Environment"');
		expect(prompt).toContain('1) chmod flips the execute bit.');
		expect(prompt).toContain(`EXACTLY ${SUGGESTION_COUNT} short questions`);
		expect(prompt).toContain('under 70 characters');
		expect(prompt).toContain('ONE question may invite a live terminal demonstration');
	});
});
