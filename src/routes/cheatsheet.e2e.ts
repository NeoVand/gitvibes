import { expect, test, type Page } from '@playwright/test';

// The header buttons are server-rendered, so a fast worker can click them
// BEFORE hydration attaches their handlers — the click lands, nothing opens,
// and the test times out. The heading anchors are created in +page's onMount,
// so their presence proves the page's interactivity is live.
async function gotoHydrated(page: Page, path = '/') {
	await page.goto(path);
	await page.locator('.heading-anchor').first().waitFor({ state: 'attached' });
}

test.describe('Cheat sheet', () => {
	test('desktop reading mode: the sheet reshapes the page at its own narrow width', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await gotoHydrated(page);
		const main = page.locator('main#main-content');

		// Sidebar starts open at desktop widths.
		await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();

		await page.getByRole('button', { name: 'Git Cheat Sheet' }).click();

		// Sidebar auto-collapses; main gains a right margin equal to the sheet —
		// the NARROW panel width, not the Agent/Playground reading width.
		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
		await expect
			.poll(async () => main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight)))
			.toBeGreaterThan(380);
		expect(await main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight))).toBeLessThan(
			500
		);

		// The course text reflows — no horizontal overflow anywhere.
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);

		// Every command chip fits on one line at this width — the whole point
		// of the panel being exactly as wide as it is.
		//
		// The margin is reported alongside the count, because a width that fits
		// with a pixel to spare passes here and wraps on the next machine: this
		// assertion first failed on CI, where a classic scrollbar takes its
		// gutter out of the content box that macOS leaves untouched.
		const fit = await page.evaluate(() => {
			const chips = [
				...document.querySelectorAll<HTMLElement>(
					'.cheat-panel button[title="Click to copy"] > code'
				)
			];
			const offenders: { text: string; over: number }[] = [];
			let wrapped = 0;
			let tightest = Infinity;
			for (const chip of chips) {
				const lineHeight = parseFloat(getComputedStyle(chip).lineHeight);
				const available = (chip.parentElement as HTMLElement).clientWidth;
				const slack = available - chip.scrollWidth;
				if (chip.getBoundingClientRect().height > lineHeight * 1.5) {
					wrapped++;
					offenders.push({ text: chip.textContent!.trim(), over: Math.round(-slack) });
				}
				tightest = Math.min(tightest, slack);
			}
			const list = document.querySelector('.cheat-list') as HTMLElement | null;
			return {
				wrapped,
				tightest: Math.round(tightest),
				chips: chips.length,
				listWidth: list?.clientWidth ?? null,
				font: getComputedStyle(chips[0]).fontFamily,
				fontSize: getComputedStyle(chips[0]).fontSize,
				offenders: offenders.slice(0, 4)
			};
		});
		// Printed unconditionally: when this fails it fails on a machine that is
		// not the one running it, so the numbers have to travel with the result.
		console.log('cheat sheet fit:', JSON.stringify(fit));
		expect(fit.chips).toBeGreaterThan(50);
		expect(fit.wrapped).toBe(0);
		// Enough room left over to absorb a scrollbar gutter or a slightly
		// wider fallback face, rather than fitting by luck.
		expect(fit.tightest).toBeGreaterThanOrEqual(12);

		// Closing restores the sidebar and the margin.
		await page.getByRole('button', { name: 'Git Cheat Sheet' }).click();
		await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
		await expect
			.poll(async () => main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight)))
			.toBe(0);
	});

	test('exercise focus: the toggle appears on an exercise and narrows the list', async ({
		page
	}) => {
		await gotoHydrated(page, '/#config');
		await page.getByRole('button', { name: 'Git Cheat Sheet' }).click();

		const panel = page.locator('.cheat-panel');
		const toggle = panel.getByRole('button', { name: "Show only this exercise's commands" });
		const rows = panel.locator('button[title="Click to copy"]');

		// Focus defaults to ON: the strip names the exercise, the list is short,
		// and the placeholder legend rests.
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
		await expect(panel.getByText('Commands for')).toBeVisible();
		await expect(panel.getByText('Introduce yourself to Git')).toBeVisible();
		await expect(panel.getByText('Three notations mark one')).not.toBeVisible();

		const focusedCount = await rows.count();
		expect(focusedCount).toBeGreaterThan(0);

		// Toggling off restores the full sheet — and the legend with it.
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await expect(panel.getByText('Three notations mark one')).toBeVisible();
		expect(await rows.count()).toBeGreaterThan(focusedCount);
	});

	test('exercise focus: a challenge focuses on its whole pool, distractors included', async ({
		page
	}) => {
		await gotoHydrated(page, '/#ch-3-branch-first');
		await page.getByRole('button', { name: 'Git Cheat Sheet' }).click();

		const panel = page.locator('.cheat-panel');
		await expect(
			panel.getByRole('button', { name: "Show only this exercise's commands" })
		).toBeVisible();
		await expect(panel.getByText('Branch Before You Build')).toBeVisible();

		// `git stash` is a distractor in this pool — the focused sheet still
		// explains it (auditing the salted kit is the exercise).
		await expect(panel.getByText('Stashing')).toBeVisible();
	});

	test('exercise focus: never offered on ordinary prose sections', async ({ page }) => {
		await gotoHydrated(page, '/#section-1-2');
		await page.getByRole('button', { name: 'Git Cheat Sheet' }).click();

		const panel = page.locator('.cheat-panel');
		await expect(panel.getByText('Setup & Config')).toBeVisible();
		await expect(
			panel.getByRole('button', { name: "Show only this exercise's commands" })
		).toHaveCount(0);
		// The full sheet keeps its legend.
		await expect(panel.getByText('Three notations mark one')).toBeVisible();
	});
});
