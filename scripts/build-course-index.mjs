#!/usr/bin/env node
/**
 * Builds src/lib/ai/course-index.json — the lexical retrieval corpus for the
 * Agent panel. Chunks come from two sources:
 *
 *   1. The course sections (src/lib/components/sections/*.svelte), split at
 *      every `id="section-…"` / `id="part-…"` anchor so each chunk maps to a
 *      real deep link on the page. Long sections split into multiple chunks
 *      that share the same anchor id.
 *   2. The cheat sheet categories (src/lib/data/cheat-sheet.ts), under ids
 *      like `cheat-panic-button` — no page anchor, but retrieval gold for
 *      "how do I quit vim"-style panic questions.
 *
 * Run with: npm run build:index  (commit the JSON — CI never rebuilds it).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SECTIONS_DIR = join(ROOT, 'src/lib/components/sections');
const OUT_FILE = join(ROOT, 'src/lib/ai/course-index.json');
const MAX_CHUNK = 1200;

/* ── section ids (parsed from sections.ts so the two never drift) ───────── */

const sectionsSource = readFileSync(join(ROOT, 'src/lib/data/sections.ts'), 'utf8');
const sectionIdsMatch = sectionsSource.match(/sectionIds = \[([\s\S]*?)\]/);
if (!sectionIdsMatch) throw new Error('could not parse sectionIds from sections.ts');
const sectionIds = new Set([...sectionIdsMatch[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]));

/* ── titles from sidebar-nav.ts labels ──────────────────────────────────── */

const navSource = readFileSync(join(ROOT, 'src/lib/data/sidebar-nav.ts'), 'utf8');
const labels = new Map();
for (const m of navSource.matchAll(/id:\s*'([a-z0-9-]+)',\s*label:\s*(?:'([^']+)'|"([^"]+)")/g)) {
	labels.set(m[1], m[2] ?? m[3]);
}

function titleFor(id) {
	const label = labels.get(id) ?? id;
	const section = id.match(/^section-(\d+)-(\d+)$/);
	if (section) return `${section[1]}.${section[2]} ${label}`;
	const part = id.match(/^part-(\d+)$/);
	if (part) return `Part ${part[1]} · ${label}`;
	if (id.startsWith('section-intro-')) return `Intro · ${label}`;
	if (id === 'hero') return 'Introduction';
	return label;
}

function partFor(id) {
	const m = id.match(/^(?:section|part)-(\d+)/);
	return m ? Number(m[1]) : 0;
}

/* ── svelte markup → plain text ─────────────────────────────────────────── */

function stripMarkup(src) {
	// Template-literal attribute values (CodeBlock code={`…`}) hold the shell
	// commands — pure retrieval gold. Stash them so tag-stripping can't eat
	// the > and < characters inside them, then restore as plain text.
	const literals = [];
	let s = src.replace(/\{`([\s\S]*?)`\}/g, (_, lit) => {
		literals.push(lit);
		return `\u0001${literals.length - 1}\u0001`;
	});
	// Slices begin mid-tag (at the id="…" attribute) and end right before
	// the next anchor's id attribute, so trim the partial tags at both ends
	// before general tag-stripping.
	s = s.replace(/^[^<>]*>/, ' ');
	s = s.replace(/<[^<>]*$/, ' ');
	s = s.replace(/<!--[\s\S]*?-->/g, ' ');
	// Svelte expressions (attribute handlers, {#if}/{#each} tags, {base}, …),
	// innermost first so nested braces unwind. Must run before tag-stripping:
	// an inline `onclick={() => …}` would otherwise break the <[^>]+> regex.
	while (/\{[^{}]*\}/.test(s)) s = s.replace(/\{[^{}]*\}/g, ' ');
	s = s.replace(/<[^>]+>/g, ' ');
	// eslint-disable-next-line no-control-regex -- \u0001 is our own chunk sentinel
	s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => ` ${literals[Number(i)]} `);
	s = s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&mdash;/g, '—');
	return s.replace(/\s+/g, ' ').trim();
}

/** Split long text into ≤ MAX_CHUNK pieces at sentence boundaries. */
function chunkText(text) {
	if (text.length <= MAX_CHUNK) return text ? [text] : [];
	const sentences = text.split(/(?<=[.!?])\s+/);
	const chunks = [];
	let current = '';
	for (const sentence of sentences) {
		if (current && current.length + sentence.length + 1 > MAX_CHUNK) {
			chunks.push(current);
			current = sentence;
		} else {
			current = current ? `${current} ${sentence}` : sentence;
		}
	}
	if (current) chunks.push(current);
	return chunks;
}

/* ── walk the section files in page order ───────────────────────────────── */

const files = [
	'Hero.svelte',
	'Part1.svelte',
	'Part2.svelte',
	'Part3.svelte',
	'Part4.svelte',
	'Part5.svelte',
	'Part6.svelte',
	'Part7.svelte',
	'Part8.svelte',
	'Part9.svelte'
];

const entries = [];

for (const file of files) {
	let source = readFileSync(join(SECTIONS_DIR, file), 'utf8');
	source = source.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');

	// Anchor positions, in document order, restricted to real section ids.
	const anchors = [...source.matchAll(/id="([a-z0-9-]+)"/g)]
		.filter((m) => sectionIds.has(m[1]))
		.map((m) => ({ id: m[1], start: m.index }));

	for (let i = 0; i < anchors.length; i++) {
		const { id, start } = anchors[i];
		const end = i + 1 < anchors.length ? anchors[i + 1].start : source.length;
		const text = stripMarkup(source.slice(start, end));
		for (const chunk of chunkText(text)) {
			entries.push({ id, part: partFor(id), title: titleFor(id), text: chunk });
		}
	}
}

/* ── cheat sheet categories ─────────────────────────────────────────────── */

// cheat-sheet.ts is data-only TypeScript: strip the interfaces and the type
// annotation, then import the remainder as an ES module via a data: URL.
const cheatSource = readFileSync(join(ROOT, 'src/lib/data/cheat-sheet.ts'), 'utf8')
	.replace(/export interface [\s\S]*?\n\}/g, '')
	.replace(/: CheatSheetCategory\[\]/, '');
const { cheatSheet } = await import(`data:text/javascript,${encodeURIComponent(cheatSource)}`);

for (const category of cheatSheet) {
	const slug = category.label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	const text = category.commands
		.map((c) => `${c.command} — ${c.description}.${c.detail ? ` ${c.detail}` : ''}`)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
	for (const chunk of chunkText(text)) {
		entries.push({
			id: `cheat-${slug}`,
			part: 0,
			title: `Cheat Sheet · ${category.label}`,
			text: chunk
		});
	}
}

/* ── write ──────────────────────────────────────────────────────────────── */

const empty = entries.filter((e) => !e.text);
if (empty.length) throw new Error(`empty chunks for: ${empty.map((e) => e.id).join(', ')}`);

writeFileSync(OUT_FILE, JSON.stringify(entries, null, '\t') + '\n');
console.log(
	`course-index.json: ${entries.length} chunks from ${files.length} section files + ${cheatSheet.length} cheat sheet categories`
);
