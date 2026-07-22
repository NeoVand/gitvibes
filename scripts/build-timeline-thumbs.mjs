#!/usr/bin/env node
/**
 * Builds static/images/thumbs/<anchor-id>.webp — the hover-card banners for
 * the header's Thread rail.
 *
 * The section banners in static/images run to hundreds of KB each. Serving
 * one of those on hover is absurd for a 236px card, and the rail can fire
 * several hovers a second. At 480×270 (2× the card at 16:9) quality 62 the
 * same images average ~15 KB — the whole set costs about as much as one full
 * banner, and a hover costs about as much as a favicon.
 *
 * Keyed by ANCHOR ID rather than by source filename, so the card needs no
 * second lookup: it already knows the id it is drawing.
 *
 * Run with: npm run build:timeline  (commit the output — CI never rebuilds it.)
 */
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = join(ROOT, 'static/images');
const OUT_DIR = join(ROOT, 'static/images/thumbs');
const MANIFEST = join(ROOT, 'src/lib/data/timeline-manifest.json');

const WIDTH = 480;
const HEIGHT = 270;
const QUALITY = 62;

mkdirSync(OUT_DIR, { recursive: true });

const items = JSON.parse(readFileSync(MANIFEST, 'utf8'));

function mtime(path) {
	try {
		return statSync(path).mtimeMs;
	} catch {
		return null;
	}
}

let written = 0;
let skipped = 0;
let bytes = 0;
const missing = [];

for (const item of items) {
	if (!item.image) continue;
	// Every anchor resolves to a banner, but most parts and all playgrounds
	// INHERIT one (see the inheritance pass in build-timeline.mjs). `thumb`
	// names the anchor that owns the file; a borrower reads the owner's
	// thumbnail, so encoding it again under a second name would just commit the
	// same ~15 KB twice and cost the browser a second download of a picture it
	// already has.
	if (item.thumb !== item.id) continue;
	const src = join(SRC_DIR, item.image);
	const srcTime = mtime(src);
	if (srcTime === null) {
		missing.push(`${item.id} -> ${item.image}`);
		continue;
	}
	const out = join(OUT_DIR, `${item.id}.webp`);
	const outTime = mtime(out);
	if (outTime !== null && outTime >= srcTime) {
		skipped++;
		bytes += statSync(out).size;
		continue;
	}
	const info = await sharp(src)
		.resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
		.webp({ quality: QUALITY, effort: 6 })
		.toFile(out);
	written++;
	bytes += info.size;
}

if (missing.length) {
	throw new Error(
		`banner files named in the manifest but absent from static/images:\n  ${missing.join('\n  ')}`
	);
}

console.log(
	`timeline thumbs: ${written} written, ${skipped} up to date, ` +
		`${(bytes / 1024).toFixed(0)} KB total (${WIDTH}x${HEIGHT} q${QUALITY})`
);
