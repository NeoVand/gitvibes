import { describe, expect, it } from 'vitest';
import { extractCitations, parseInline, parseMarkdown } from './markdown';

describe('markdown parser', () => {
	it('parses inline code and bold', () => {
		expect(parseInline('use `ls -la` for a **long** listing')).toEqual([
			{ kind: 'text', value: 'use ' },
			{ kind: 'code', value: 'ls -la' },
			{ kind: 'text', value: ' for a ' },
			{ kind: 'bold', value: 'long' },
			{ kind: 'text', value: ' listing' }
		]);
	});

	it('never emits HTML — raw tags stay literal text', () => {
		const blocks = parseMarkdown('<script>alert(1)</script> and <b>bold?</b>');
		expect(blocks).toEqual([
			{
				kind: 'p',
				inlines: [{ kind: 'text', value: '<script>alert(1)</script> and <b>bold?</b>' }]
			}
		]);
		// The token tree carries the raw string as a TEXT token: the renderer
		// puts it through a Svelte text node, so it can never become markup.
	});

	it('parses fenced code blocks with a language', () => {
		const blocks = parseMarkdown('Before\n\n```bash\ncat log | wc -l\n```\n\nAfter');
		expect(blocks).toHaveLength(3);
		expect(blocks[1]).toEqual({ kind: 'codeblock', lang: 'bash', code: 'cat log | wc -l' });
		expect(blocks[0].kind).toBe('p');
		expect(blocks[2].kind).toBe('p');
	});

	it('an unclosed fence swallows the rest as code (streaming tolerance)', () => {
		const blocks = parseMarkdown('Look:\n```bash\necho hi');
		expect(blocks[1]).toEqual({ kind: 'codeblock', lang: 'bash', code: 'echo hi' });
	});

	it('parses bullet lists', () => {
		const blocks = parseMarkdown('- first `a`\n- second\n\ntail');
		expect(blocks[0]).toEqual({
			kind: 'list',
			items: [
				[
					{ kind: 'text', value: 'first ' },
					{ kind: 'code', value: 'a' }
				],
				[{ kind: 'text', value: 'second' }]
			]
		});
		expect(blocks[1].kind).toBe('p');
	});

	it('joins wrapped lines into one paragraph', () => {
		const blocks = parseMarkdown('one\ntwo\n\nthree');
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({ kind: 'p', inlines: [{ kind: 'text', value: 'one two' }] });
	});
});

describe('citation extraction', () => {
	it('strips [[id]] tokens from prose and collects them for the sources row', () => {
		const { text, ids } = extractCitations(
			'Pipes chain commands [[section-4-2]] and count things [[section-4-4]].'
		);
		expect(text).toBe('Pipes chain commands and count things.');
		expect(ids).toEqual(['section-4-2', 'section-4-4']);
	});

	it('deduplicates ids, preserving first-appearance order', () => {
		const { ids } = extractCitations('[[b-1]] then [[a-2]] then [[b-1]] again');
		expect(ids).toEqual(['b-1', 'a-2']);
	});

	it('tidies whitespace left behind mid-sentence', () => {
		const { text } = extractCitations('chmod changes permissions [[section-5-2]] , simply.');
		expect(text).toBe('chmod changes permissions, simply.');
	});

	it('passes citation-free text through untouched', () => {
		const { text, ids } = extractCitations('plain answer');
		expect(text).toBe('plain answer');
		expect(ids).toEqual([]);
	});
});
