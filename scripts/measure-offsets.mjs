#!/usr/bin/env node
/**
 * Regenerates src/lib/timeline/measured-offsets.fixture.json — the real scroll
 * position of every anchor on the rendered page.
 *
 * mapping.test.ts is built on this file rather than on an evenly spaced ideal,
 * because the rail's hard cases are hard precisely where the document is
 * uneven. That makes the fixture a MEASUREMENT, and a measurement needs a
 * repeatable rig: a fixed viewport, a settled layout, and no lazily-mounted
 * playground having changed a card's height mid-pass.
 *
 * Usage:  npm run dev        (in another shell)
 *         node scripts/measure-offsets.mjs [url]
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
// The runner package re-exports the browser launcher, so measurement needs no
// second Playwright install alongside @playwright/test.
import { chromium } from '@playwright/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_FILE = join(ROOT, 'src/lib/timeline/measured-offsets.fixture.json');
const { default: manifest } = await import(join(ROOT, 'src/lib/data/timeline-manifest.json'), {
	with: { type: 'json' }
});

const url = process.argv[2] ?? 'http://localhost:5173/';

/** The reference viewport. Changing it re-measures the whole document. */
const VIEWPORT = { width: 1280, height: 800 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle' });
// Fonts decide line counts, and line counts decide every offset below.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const ids = manifest.map((it) => it.id);
const result = await page.evaluate((ids) => {
	window.scrollTo(0, 0);
	const missing = ids.filter((id) => !document.getElementById(id));
	return {
		missing,
		h: document.documentElement.scrollHeight,
		a: ids.map((id) => {
			const rect = document.getElementById(id).getBoundingClientRect();
			return { id, top: Math.round(rect.top + window.scrollY) };
		})
	};
}, ids);

await browser.close();

if (result.missing.length) {
	throw new Error(`manifest anchors absent from the page: ${result.missing.join(', ')}`);
}

// Document order is the manifest's claim; a measurement that disagrees means
// the manifest is wrong, not the page.
for (let i = 1; i < result.a.length; i++) {
	if (result.a[i].top < result.a[i - 1].top) {
		throw new Error(
			`the page has ${result.a[i].id} above ${result.a[i - 1].id}, the manifest says otherwise`
		);
	}
}

const body =
	'{\n\t"h": ' +
	result.h +
	',\n\t"a": [\n' +
	result.a.map((x) => `\t\t{ "id": "${x.id}", "top": ${x.top} }`).join(',\n') +
	'\n\t]\n}\n';
writeFileSync(OUT_FILE, body);
console.log(`measured-offsets.fixture.json: ${result.a.length} anchors over ${result.h}px`);
