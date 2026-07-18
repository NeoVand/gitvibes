// Generate simple placeholder banners for sections whose real art hasn't been
// created yet. Placeholders match the series look (dark navy, film-grain feel,
// localized accent glow) so the page reads complete; replace them by dropping
// the real PNG in static/images/ and running: node scripts/optimize-images.mjs
//
// Usage: node scripts/make-placeholders.mjs
import sharp from 'sharp';

const BANNERS = [
	{
		file: 'ci-pipeline',
		title: 'CI — the green checkmark',
		subtitle: 'every push · every check · every time',
		accent: '#a6e3a1'
	},
	{
		file: 'robot-coworkers',
		title: 'The Robot Coworkers',
		subtitle: 'they propose · your checks dispose',
		accent: '#818cf8'
	},
	{
		file: 'release-autopilot',
		title: 'Releases on Autopilot',
		subtitle: 'feat → minor · fix → patch',
		accent: '#d97706'
	}
];

const W = 1600;
const H = 900;

function svg({ title, subtitle, accent }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="72%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0f1117"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g stroke="${accent}" stroke-opacity="0.35" fill="none" stroke-width="2">
    <path d="M 1040 620 C 1140 560, 1200 480, 1240 360"/>
    <circle cx="1040" cy="620" r="9" fill="#0f1117"/>
    <circle cx="1140" cy="520" r="9" fill="#0f1117"/>
    <circle cx="1240" cy="360" r="11" fill="${accent}" fill-opacity="0.55" stroke-opacity="0.8"/>
  </g>
  <text x="96" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="76"
    fill="#e5e7eb" fill-opacity="0.94">${title}</text>
  <text x="98" y="500" font-family="'SF Mono', 'Fira Code', Menlo, monospace" font-size="30"
    fill="${accent}" fill-opacity="0.75">${subtitle}</text>
  <text x="98" y="820" font-family="'SF Mono', 'Fira Code', Menlo, monospace" font-size="22"
    fill="#9ca3af" fill-opacity="0.55">placeholder — final art pending (docs/IMAGE_PROMPTS.md)</text>
</svg>`;
}

for (const banner of BANNERS) {
	const out = `static/images/${banner.file}.webp`;
	await sharp(Buffer.from(svg(banner)))
		.webp({ quality: 84 })
		.toFile(out);
	console.log(`wrote ${out}`);
}
