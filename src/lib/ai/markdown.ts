/**
 * Lightweight markdown for agent chat messages — exactly the subset the
 * tutor needs: paragraphs, `inline code`, **bold**, bullet lists, and fenced
 * code blocks. The parser only ever produces a token tree; the panel renders
 * it through Svelte text nodes, so raw HTML in model output can never reach
 * the DOM as markup (escape-first by construction — there is no HTML
 * pass-through at all).
 */

export type InlineToken =
	| { kind: 'text'; value: string }
	| { kind: 'bold'; value: string }
	| { kind: 'code'; value: string };

export type MarkdownBlock =
	| { kind: 'p'; inlines: InlineToken[] }
	| { kind: 'codeblock'; lang: string | null; code: string }
	| { kind: 'list'; items: InlineToken[][] };

/** `inline code` and **bold** inside one line of prose. */
export function parseInline(text: string): InlineToken[] {
	const out: InlineToken[] = [];
	const pattern = /`([^`\n]+)`|\*\*([^*\n]+)\*\*/g;
	let cursor = 0;
	for (const match of text.matchAll(pattern)) {
		if (match.index > cursor) {
			out.push({ kind: 'text', value: text.slice(cursor, match.index) });
		}
		if (match[1] !== undefined) {
			out.push({ kind: 'code', value: match[1] });
		} else {
			out.push({ kind: 'bold', value: match[2] });
		}
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		out.push({ kind: 'text', value: text.slice(cursor) });
	}
	return out;
}

/**
 * Parse a chat message into blocks. Tolerant of model quirks: fenced blocks
 * open with three (or more) backticks — a stray unclosed fence swallows the
 * rest of the message as code rather than corrupting the prose.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = [];
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	let paragraph: string[] = [];
	let list: InlineToken[][] | null = null;

	function flushParagraph() {
		if (paragraph.length) {
			const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
			if (text) blocks.push({ kind: 'p', inlines: parseInline(text) });
			paragraph = [];
		}
	}
	function flushList() {
		if (list?.length) blocks.push({ kind: 'list', items: list });
		list = null;
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const fence = line.match(/^\s*`{3,}\s*(\w+)?\s*$/);
		if (fence) {
			flushParagraph();
			flushList();
			const lang = fence[1] ?? null;
			const code: string[] = [];
			i++;
			while (i < lines.length && !/^\s*`{3,}\s*$/.test(lines[i])) {
				code.push(lines[i]);
				i++;
			}
			blocks.push({ kind: 'codeblock', lang, code: code.join('\n') });
			continue;
		}

		const bullet = line.match(/^\s*[-*]\s+(.*)$/);
		if (bullet) {
			flushParagraph();
			list ??= [];
			list.push(parseInline(bullet[1].trim()));
			continue;
		}

		if (!line.trim()) {
			flushParagraph();
			flushList();
			continue;
		}

		flushList();
		paragraph.push(line.trim());
	}
	flushParagraph();
	flushList();
	return blocks;
}

export interface CitationSplit {
	/** Prose with every [[id]] token removed (whitespace tidied). */
	text: string;
	/** Cited ids in first-appearance order, deduplicated. */
	ids: string[];
}

/**
 * Pull `[[section-x-y]]` citations OUT of the sentence flow: the prose reads
 * clean, and the ids feed the "Sources" chip row at the end of the message.
 */
export function extractCitations(source: string): CitationSplit {
	const ids: string[] = [];
	const text = source
		.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id: string) => {
			if (!ids.includes(id)) ids.push(id);
			return '';
		})
		.replace(/[ \t]+([.,;:!?])/g, '$1')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/[ \t]+$/gm, '');
	return { text: text.trim(), ids };
}
