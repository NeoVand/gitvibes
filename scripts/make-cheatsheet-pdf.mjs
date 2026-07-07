// Render /cheatsheet-print to static/gitvibes-cheatsheet.pdf.
// Regenerate whenever src/lib/data/cheat-sheet.ts changes:
//   npm run dev   (in another terminal)
//   node scripts/make-cheatsheet-pdf.mjs [baseUrl]
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'static/gitvibes-cheatsheet.pdf';

const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: 'light' });
const res = await page.goto(`${baseUrl}/cheatsheet-print`, { waitUntil: 'networkidle' });
if (!res?.ok()) {
	console.error(`Could not load ${baseUrl}/cheatsheet-print — is the dev server running?`);
	process.exit(1);
}
// Let the webfonts settle so the PDF embeds them
await page.evaluate(() => document.fonts.ready);

await page.pdf({
	path: OUT,
	format: 'A4',
	printBackground: true,
	margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
	displayHeaderFooter: true,
	headerTemplate: '<span></span>',
	footerTemplate: `
		<div style="width:100%; font-size:7.5px; color:#94a3b8; padding:0 12mm;
		            display:flex; justify-content:space-between;
		            font-family:system-ui, sans-serif;">
			<span>GitVibes — neovand.github.io/gitvibes</span>
			<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
		</div>`
});
await browser.close();

const { statSync } = await import('node:fs');
console.log(`${OUT}: ${(statSync(OUT).size / 1024).toFixed(0)}KB`);
