import { expect, test, type Page } from '@playwright/test';
// The header buttons are server-rendered, so a fast worker can click them
// BEFORE hydration attaches their handlers — the click lands, nothing opens,
// and the test times out. The heading anchors are created in +page's onMount,
// so their presence proves the page's interactivity is live.
async function gotoHydrated(page: Page, path = '/') {
	await page.goto(path);
	await page.locator('.heading-anchor').first().waitFor({ state: 'attached' });
}

/**
 * The Thread rail in the header.
 *
 * The rail's MATHS is covered exhaustively by src/lib/timeline/mapping.test.ts;
 * these tests cover the things only a real browser can answer — that it mounts
 * with measured offsets, that hovering and keyboard both drive it, that a click
 * navigates through the same path the sidebar uses, and that focusing the
 * search box yields exactly the width the search box takes — without the rail
 * losing the item under the pointer while it narrows.
 */

/** The rail is gated on a 720px viewport and a real pointer. */
test.use({ viewport: { width: 1440, height: 900 } });

const RAIL = '[role="listbox"][aria-label^="Course progress"]';

test.describe('Thread rail', () => {
	/**
	 * Both the search box and the rail animate for 200ms, and the two do not finish
	 * on the same frame. Reading either one the instant a poll first goes true lands
	 * mid-transition — which is how a conservation assertion ends up 19px out. Wait
	 * for a width to be the same twice in a row before believing it.
	 */
	async function settledWidth(loc: import('@playwright/test').Locator): Promise<number> {
		// The leading wait is not padding. `focus()` returns before the transition
		// has advanced a single frame, so polling immediately reads the SAME width
		// twice and reports the PRE-focus value as settled — which reads as "the
		// box never grew" and turns the conservation check into a false failure.
		// Clear the 200ms transition first, then confirm it has actually stopped.
		await loc.page().waitForTimeout(260);
		let last = -1;
		for (let i = 0; i < 40; i++) {
			const w = Math.round((await loc.boundingBox())!.width);
			if (w === last) return w;
			last = w;
			await loc.page().waitForTimeout(60);
		}
		return last;
	}

	test('mounts in the header with a mark for every anchor', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();

		// One bar per section (playgrounds fold into the preceding bar) plus one
		// diamond per playground — built once, never rebuilt.
		await expect(rail.locator('.tt-seg')).toHaveCount(42);
		await expect(rail.locator('.tt-pg')).toHaveCount(23);
		await expect(rail.locator('.tt-pos')).toHaveCount(1);
	});

	test('lays the thread out across the rail once offsets are measured', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();

		// The bar row must tile the rail: the first bar starts at 0 and the last
		// ends at the rail's width. A zero-width rail (unmeasured) fails here.
		const box = await page.evaluate((sel) => {
			const r = document.querySelector(sel) as HTMLElement;
			const segs = [...r.querySelectorAll<HTMLElement>('.tt-seg')];
			const first = segs[0].getBoundingClientRect();
			const last = segs[segs.length - 1].getBoundingClientRect();
			const rr = r.getBoundingClientRect();
			return { width: rr.width, left: first.left - rr.left, right: last.right - rr.left };
		}, RAIL);
		expect(box.width).toBeGreaterThan(200);
		expect(box.left).toBeLessThan(2);
		expect(box.right).toBeGreaterThan(box.width - 3);
	});

	test('hovering opens the card and moving along it changes the target', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const rect = (await rail.boundingBox())!;

		await page.mouse.move(rect.x + rect.width * 0.3, rect.y + 24);
		const card = page.locator('.tt-card.is-on');
		await expect(card).toBeVisible();
		const firstTitle = await card.locator('.tt-title').innerText();

		await page.mouse.move(rect.x + rect.width * 0.8, rect.y + 24);
		await expect(card).toBeVisible();
		await expect.poll(async () => card.locator('.tt-title').innerText()).not.toBe(firstTitle);

		// Leaving closes it again.
		await page.mouse.move(rect.x + rect.width / 2, rect.y + 300);
		await expect(page.locator('.tt-card.is-on')).toHaveCount(0);
	});

	test('the playground lane names the activity, not the section', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const rect = (await rail.boundingBox())!;

		// The diamonds live above the thread; y = 4 is squarely in their lane.
		// 0.3 of the rail sweeps the document into Part 2–3 territory, which is
		// thick with playgrounds, so the 24px grab radius lands on one.
		await page.mouse.move(rect.x + rect.width * 0.3, rect.y + 4);
		const card = page.locator('.tt-card.is-on.is-pg');
		await expect(card).toBeVisible();
		await expect(card.locator('.tt-kicker')).toHaveText('playground');
	});

	test('clicking a bar navigates the page, same as the sidebar', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const rect = (await rail.boundingBox())!;

		await page.mouse.move(rect.x + rect.width * 0.55, rect.y + 24);
		await page.mouse.down();
		await page.mouse.up();

		// handleNavigate rewrites the hash and jumps — exactly the sidebar path.
		await expect(page).toHaveURL(/#(section|part)-/, { timeout: 5000 });
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
	});

	test('a click navigates but leaves the card to the hover', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const rect = (await rail.boundingBox())!;

		await page.mouse.move(rect.x + rect.width * 0.62, rect.y + 24);
		await expect(page.locator('.tt-card.is-on')).toBeVisible();

		// Click without moving the pointer. The click ONLY navigates — the card
		// belongs to the hover, so it must still be there afterwards; the hover
		// ending is what dismisses it.
		await page.mouse.down();
		await page.mouse.up();
		await expect(page).toHaveURL(/#(section|part)-/, { timeout: 5000 });
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
		await expect(page.locator('.tt-card.is-on')).toBeVisible();

		await page.mouse.move(rect.x + rect.width / 2, rect.y + 300);
		await expect(page.locator('.tt-card.is-on')).toHaveCount(0);
	});

	test('is fully operable from the keyboard', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();

		await rail.focus();
		// Focus selects an item and announces it.
		await expect(rail).toHaveAttribute('aria-activedescendant', /.+/);

		await page.keyboard.press('Home');
		const atHome = await rail.getAttribute('aria-activedescendant');
		await page.keyboard.press('ArrowRight');
		await expect(rail).not.toHaveAttribute('aria-activedescendant', atHome!);

		await page.keyboard.press('End');
		const atEnd = await rail.getAttribute('aria-activedescendant');
		expect(atEnd).not.toBe(atHome);

		await page.keyboard.press('Home');
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#/, { timeout: 5000 });
	});

	test('focusing the search box yields exactly the width it takes', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const box = page.locator('.search-box');

		const railBefore = (await rail.boundingBox())!.width;
		const boxBefore = (await box.boundingBox())!.width;

		const search = page.getByPlaceholder('Search commands...');
		await search.focus();
		await search.fill('stash');

		// The invariant is CONSERVATION: whatever the search box gains on focus,
		// the rail's flex cell gives up, to the pixel. The exact figure is a
		// tuning decision, so it is derived here rather than pinned — a
		// hardcoded delta tests the current numbers, this tests the behaviour.
		//
		// It MUST be polled rather than read once: the transition is 200ms, and a
		// single read taken the instant after fill() lands mid-animation and would
		// pass against almost any behaviour, including no resize at all.
		const boxAfter = await settledWidth(box);
		const railAfter = await settledWidth(rail);
		expect(boxAfter).toBeGreaterThan(Math.round(boxBefore));
		expect(Math.round(railBefore) - railAfter).toBe(boxAfter - Math.round(boxBefore));

		// ...and it must come back, or the rail is permanently narrower after the
		// reader's first search.
		await search.fill('');
		await search.blur();
		await expect
			.poll(async () => Math.round((await rail.boundingBox())!.width))
			.toBe(Math.round(railBefore));
	});

	test('the lens stays under the pointer while the rail narrows', async ({ page }) => {
		await gotoHydrated(page);
		const rail = page.locator(RAIL);
		await expect(rail).toBeVisible();
		const rect = (await rail.boundingBox())!;
		const glow = page.locator('.tt-glow');

		// Park the pointer on the rail. The lens (.tt-glow) centres on it.
		const px = rect.width * 0.62;
		await page.mouse.move(rect.x + px, rect.y + 24);
		// The lens glides in on a tween, so this has to settle rather than be
		// read on the frame after the move.
		const centre = async () => {
			const g = (await glow.boundingBox())!;
			return g.x + g.width / 2 - rect.x;
		};
		await expect.poll(async () => Math.abs((await centre()) - px) < 8).toBe(true);

		// Narrow the rail from its right-hand end WITHOUT moving the hand. Only the
		// rail's right edge moves, so the pointer keeps its pixel and the lens
		// must stay on it. The lens is anchored in FRACTIONS, so if the fraction
		// is not re-derived from the pixel, the glow slides out from under a
		// stationary cursor and only snaps back when the reader next moves.
		//
		// Note the lens legitimately re-picks its ITEM here — the item under the
		// lens centre is a function of the fraction alone, so keeping the pixel
		// and keeping the item are mutually exclusive. The pixel is the one the
		// eye is tracking.
		const searchBox = page.locator('.search-box');
		const boxWas = await settledWidth(searchBox);
		await page.getByPlaceholder('Search commands...').focus();
		// Same conservation rule as above, derived rather than pinned: the rail
		// loses exactly what the box gains.
		const boxNow = await settledWidth(searchBox);
		const railNow = await settledWidth(rail);
		expect(railNow).toBe(Math.round(rect.width) - (boxNow - boxWas));
		expect(Math.abs((await centre()) - px)).toBeLessThan(8);
		// And it must not merely arrive there eventually via a corrective
		// pointermove — hold still and confirm it stays put.
		await page.waitForTimeout(300);
		expect(Math.abs((await centre()) - px)).toBeLessThan(8);
	});

	/* The rail is held down to iPad mini portrait by the header shedding its
	   optional parts — labels, GitHub link, the resting search box, the
	   wordmark. These two pin the boundary from both sides so a future change
	   to that ladder cannot quietly move it. 744 is iPad mini portrait; 719 is
	   one pixel under the 720 gate. */
	test('survives to iPad mini portrait', async ({ page }) => {
		await page.setViewportSize({ width: 744, height: 1000 });
		await gotoHydrated(page);
		await expect(page.locator(RAIL)).toBeVisible();

		// Every anchor still present — it is the whole rail, not a reduced one.
		await expect(page.locator(RAIL).locator('.tt-seg')).toHaveCount(42);

		// And still above the sweep floor: the tightest measured section needs
		// 3px of cursor travel, which works out to ~340px of rail; the
		// .thread-cell floor in Header.svelte guarantees at least 410px of rail
		// after the cell's own chrome. That guarantee is the reason the header
		// gives up its labels and wordmark rather than the rail giving up width.
		const railWidth = await page.locator(RAIL).evaluate((el) => el.getBoundingClientRect().width);
		expect(railWidth).toBeGreaterThanOrEqual(410);
	});

	test('is hidden below tablet portrait', async ({ page }) => {
		// 719, one pixel under RAIL_MEDIA_QUERY. The gate is 720 rather than 744
		// deliberately: 744 is iPad mini portrait exactly, so gating there puts
		// the target device ON the boundary where a scrollbar tips it into mobile.
		await page.setViewportSize({ width: 719, height: 1000 });
		await gotoHydrated(page);
		await expect(page.locator(RAIL)).toHaveCount(0);
	});
});
