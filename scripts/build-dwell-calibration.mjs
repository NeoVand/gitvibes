#!/usr/bin/env node
/**
 * Builds src/lib/timeline/dwell-calibration.json — the modelled reading time
 * behind the rail's dwell heat, one number of seconds per manifest anchor.
 *
 * Word count alone is the wrong model for this page. Prose is only part of
 * it; the rest is code blocks, figures, diagrams and playgrounds, and a
 * word-count model demands near-zero dwell exactly where a learner lingers
 * longest. So each ingredient carries its own rate:
 *
 *   • prose: 200 wpm — the standard skilled-reading figure for expository
 *     text on screen.
 *   • code: 40% of the prose rate. Code is read token-by-token, and a git
 *     command with three flags takes far longer per "word" than a sentence.
 *   • figures/diagrams/screenshots: a flat cost each. A banner is glanced at,
 *     a diagram is studied; the flat figure is a defensible middle.
 *   • playgrounds: a base cost plus one per suggested command, read from
 *     scenarios.ts — the commands ARE the exercise, so its length is the best
 *     available proxy for how long a learner sits in it.
 *
 * The absolute scale matters less than the RATIOS: dwell heat is
 * `dwell/target` through a strong gamma (see dwell.ts), so what the model has
 * to get right is that section 4.7's matrix costs more than a two-paragraph
 * intro, not the exact minute count of either.
 *
 * Run with: npm run build:timeline  (commit the JSON — CI never rebuilds it.)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SECTIONS_DIR = join(ROOT, 'src/lib/components/sections');
const OUT_FILE = join(ROOT, 'src/lib/timeline/dwell-calibration.json');
const manifest = JSON.parse(
	readFileSync(join(ROOT, 'src/lib/data/timeline-manifest.json'), 'utf8')
);

const WPM = 200;
const CODE_RATE = 0.4; // code reads at 40% of prose speed
const FIGURE_SECONDS = 12; // per ExpandableImage / VsCodeScreenshot / Mermaid
const PLAYGROUND_BASE = 30; // orienting in the scenario
const PER_COMMAND = 14; // typing, reading output, recovering from a typo

/* ── suggested-command counts, from the scenarios themselves ────────────── */

const scenarioSource = readFileSync(join(ROOT, 'src/lib/playground/scenarios.ts'), 'utf8');
const commandCounts = new Map();
// Each scenario object opens with `id: '…'` and carries one suggestedCommands
// array; pairing them by order of appearance mirrors the file's own layout.
const scenarioBlocks = scenarioSource.split(/\n\t\{/).slice(1);
for (const block of scenarioBlocks) {
	const id = /id:\s*'([a-z0-9-]+)'/.exec(block)?.[1];
	const cmds = /suggestedCommands:\s*\[([\s\S]*?)\]/.exec(block)?.[1];
	if (id && cmds) commandCounts.set(id, [...cmds.matchAll(/'(?:[^'\\]|\\.)*'/g)].length);
}

/* ── the same positional scan the manifest builder uses ─────────────────── */

const files = ['Hero.svelte', ...Array.from({ length: 9 }, (_, i) => `Part${i + 1}.svelte`)];
const ids = new Set(manifest.map((it) => it.id));
const seconds = new Map();

function words(s) {
	return s.split(/\s+/).filter(Boolean).length;
}

/** Depth-counting bracket stripper — same reasoning as build-timeline.mjs. */
function stripBracketed(s, open, close) {
	let out = '';
	let depth = 0;
	for (const ch of s) {
		if (ch === open) depth++;
		else if (ch === close) {
			if (depth > 0) depth--;
		} else if (depth === 0) out += ch;
	}
	return out;
}

for (const file of files) {
	const raw = readFileSync(join(SECTIONS_DIR, file), 'utf8');
	const source = raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, (m) => ' '.repeat(m.length));
	// Blank LessonActivity tags exactly as the manifest builder does, so both
	// scans see each playground anchor once, at its heading.
	const scan = source.replace(/<LessonActivity\b[^>]*\/>/g, (m) => ' '.repeat(m.length));

	const anchors = [...scan.matchAll(/id="([a-z0-9-]+)"/g)]
		.filter((m) => ids.has(m[1]))
		.map((m) => ({ id: m[1], at: m.index }));

	for (let i = 0; i < anchors.length; i++) {
		const { id, at } = anchors[i];
		const end = i + 1 < anchors.length ? anchors[i + 1].at : scan.length;
		let span = scan.slice(at, end);

		// Code first, because stripping tags would eat the template literals'
		// contents along with everything else. CodeBlock bodies are the big
		// blocks; inline <Code code="…" /> mentions ride along at the same rate.
		let codeWords = 0;
		span = span.replace(/code=\{`([\s\S]*?)`\}/g, (m, body) => {
			codeWords += words(body);
			return ' '.repeat(m.length);
		});
		span = span.replace(/code="([^"]*)"/g, (m, body) => {
			codeWords += words(body);
			return ' '.repeat(m.length);
		});

		const figures =
			(span.match(/<ExpandableImage\b/g)?.length ?? 0) +
			(span.match(/<VsCodeScreenshot\b/g)?.length ?? 0) +
			(span.match(/<MermaidDiagram\b/g)?.length ?? 0);

		// What remains after tags and Svelte expressions go is the prose the
		// reader actually reads. Attribute text (alt, captions, titles) survives
		// inside the tags stripped here — acceptable: captions ARE read, and the
		// scan errs uniformly, which the ratio-based heat forgives.
		const prose = words(stripBracketed(stripBracketed(span, '<', '>'), '{', '}'));

		let secs = (prose / WPM) * 60 + (codeWords / (WPM * CODE_RATE)) * 60 + figures * FIGURE_SECONDS;

		const item = manifest.find((it) => it.id === id);
		if (item && (item.kind === 'playground' || item.kind === 'challenge')) {
			secs += PLAYGROUND_BASE + PER_COMMAND * (commandCounts.get(id) ?? 4);
		}

		seconds.set(id, Math.round(secs * 10) / 10);
	}
}

const missing = manifest.filter((it) => !seconds.has(it.id)).map((it) => it.id);
if (missing.length) {
	throw new Error(`calibration missed manifest anchors: ${missing.join(', ')}`);
}

const anchorsOut = {};
for (const it of manifest) anchorsOut[it.id] = seconds.get(it.id);

writeFileSync(
	OUT_FILE,
	JSON.stringify(
		{
			$comment:
				'Generated by scripts/build-dwell-calibration.mjs. Per-anchor modelled reading ' +
				`seconds at ${WPM} wpm, with code at ${CODE_RATE * 100}% of prose rate, figures at a ` +
				'flat cost, and playgrounds costed from their suggestedCommands count. Regenerate ' +
				'whenever section sources change; every timeline-manifest id must be present and no ' +
				'extras. See DWELL in src/lib/timeline/dwell.ts for how it is consumed.',
			wpm: WPM,
			generatedAt: new Date().toISOString(),
			anchors: anchorsOut
		},
		null,
		'\t'
	) + '\n'
);

const total = [...seconds.values()].reduce((a, b) => a + b, 0);
console.log(
	`dwell-calibration.json: ${seconds.size} anchors, ` +
		`${(total / 60).toFixed(0)} modelled minutes end to end`
);
