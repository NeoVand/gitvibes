// Convert static/images/*.png to WebP and remove the PNG originals.
// Run after adding new banner images: node scripts/optimize-images.mjs
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dir = 'static/images';
const QUALITY = 84;

const files = (await readdir(dir)).filter((f) => f.endsWith('.png'));
if (files.length === 0) {
	console.log('No PNGs to convert.');
	process.exit(0);
}

let before = 0;
let after = 0;
for (const file of files) {
	const src = path.join(dir, file);
	const out = src.replace(/\.png$/, '.webp');
	const { size: srcSize } = await stat(src);
	await sharp(src).webp({ quality: QUALITY, effort: 6 }).toFile(out);
	const { size: outSize } = await stat(out);
	before += srcSize;
	after += outSize;
	await unlink(src);
	console.log(
		`${file}: ${(srcSize / 1024 / 1024).toFixed(1)}MB -> ${(outSize / 1024).toFixed(0)}KB`
	);
}
console.log(
	`Total: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`
);
