import { expect, test, type Page } from '@playwright/test';

// The header controls are server-rendered, so a fast worker can act on them
// before hydration attaches handlers. The heading anchors are created in
// +page's onMount, so their presence proves the page is live.
async function gotoHydrated(page: Page, path = '/') {
	await page.goto(path);
	await page.locator('.heading-anchor').first().waitFor({ state: 'attached' });
}

/**
 * A page that scrolls sideways is a page that feels broken on a phone, and it
 * is invisible from a desktop browser — nobody notices until they are reading
 * on the train. The cause here was inline code chips: they sit in running
 * prose, a few of them quote something long, and an inline element cannot
 * scroll, so its width goes to the document.
 */
test.describe('No horizontal scroll', () => {
	for (const width of [390, 768, 1024, 1440]) {
		test(`the course page fits its viewport at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await gotoHydrated(page);
			// Far enough in to have rendered the parts that quote long output.
			await page.evaluate(() => window.scrollTo(0, 4000));
			await page.waitForTimeout(400);

			const measured = await page.evaluate(() => {
				const doc = document.documentElement;
				const over = doc.scrollWidth - doc.clientWidth;
				if (over <= 0) return { over, widest: null as string | null };
				// Name the offender in the failure, so the next person does not
				// have to rediscover which element pushed the page out.
				let widest: string | null = null;
				let worst = 0;
				for (const el of document.querySelectorAll('body *')) {
					const box = el.getBoundingClientRect();
					if (box.width === 0 || box.right <= doc.clientWidth + 1) continue;
					let parent = el.parentElement;
					let contained = false;
					while (parent && parent !== document.body) {
						const cs = getComputedStyle(parent);
						if (cs.position === 'fixed' || /(auto|scroll|hidden)/.test(cs.overflowX)) {
							contained = true;
							break;
						}
						parent = parent.parentElement;
					}
					if (contained || getComputedStyle(el).position === 'fixed') continue;
					if (box.right > worst) {
						worst = box.right;
						widest = `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 40)} — "${(el.textContent || '').trim().slice(0, 40)}"`;
					}
				}
				return { over, widest };
			});

			expect(measured.over, `overflowing element: ${measured.widest}`).toBeLessThanOrEqual(0);
		});
	}

	/**
	 * The panels sit off-screen at translate-x-full when closed and show up in
	 * any naive overflow scan. They are position:fixed, so they cannot push the
	 * document — proven here rather than assumed, because chasing them wastes
	 * the time of whoever debugs this next.
	 */
	test('the closed side panels do not push the page out', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await gotoHydrated(page);

		const withPanels = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		await page.addStyleTag({
			content: '.cheat-panel,.pg-panel,.agent-panel{display:none !important}'
		});
		await page.waitForTimeout(200);
		const without = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(without).toBe(withPanels);
	});
});
