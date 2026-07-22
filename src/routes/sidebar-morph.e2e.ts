import { expect, test } from '@playwright/test';

/**
 * THE 26px INVARIANT.
 *
 * The sidebar's collapsed and expanded states are one DOM tree at two container
 * widths, and the whole reason that rewrite happened is this: the icon column
 * must sit on x=26 in both states AND on every frame between them. 26 is the
 * app logo's centre — the logo sits centred in a header cell that is
 * `--sidebar-collapsed-width` (52px) wide, so 52 / 2 = 26 — and the nav
 * reproduces it from paddings alone: 5.5 (nav) + 12 (row) + 8.5 (half a 17px
 * glyph) = 26. When the sidebar was two trees under `{#if open}` /
 * `{#if !open}` the icons were destroyed and rebuilt, so the panel appeared to
 * sweep in from the left carrying different marks.
 *
 * Endpoint assertions are not enough to catch a regression here: a layout that
 * reflows during the transition and settles back would pass them. So this
 * samples the icon's rect on every animation frame WHILE the panel is moving,
 * and separately proves the panel really was mid-flight when it sampled.
 */

const ICON_X = 26;
/* Sub-pixel tolerance only. This is arithmetic (5.5 + 12 + 8.5), not a tuned
   value, so anything past a rounding error means the geometry moved. */
const EPS = 0.05;

test.describe('sidebar morph', () => {
	/**
	 * +page.svelte auto-opens the sidebar at >=1024px, so "collapsed" is not the
	 * default at Playwright's viewport. Collapse it deliberately and let the
	 * morph finish, so every test below starts from a settled narrow panel
	 * rather than from whichever state the page happened to boot into.
	 *
	 * WAIT FOR THE AUTO-OPEN FIRST. The panel is in the SSR payload, so
	 * `waitFor` resolves before hydration has run `onMount` — sampled there,
	 * `is-open` is still false, the collapse click is skipped as "already
	 * collapsed", and the mount opens the panel a beat later, underneath a
	 * test that believes it pinned the collapsed state. At this viewport the
	 * auto-open always happens, so it is the one signal that hydration is
	 * done and the boot state has settled.
	 */
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		const panel = page.locator('.sidebar-panel');
		await expect(panel).toHaveClass(/is-open/);
		await page.locator('.head-toggle').click();
		await expect(panel).not.toHaveClass(/is-open/);
		await expect(panel).toHaveCSS('width', '52px');
	});

	test('the icon column holds x=26 collapsed, mid-transition and expanded', async ({ page }) => {
		const panel = page.locator('.sidebar-panel');
		const firstGlyph = page.locator('.rail-nav .nav-glyph').first();

		// ── collapsed ──────────────────────────────────────────────────────────
		await expect(panel).not.toHaveClass(/is-open/);
		const collapsed = await firstGlyph.boundingBox();
		expect(collapsed).not.toBeNull();
		expect(collapsed!.x + collapsed!.width / 2).toBeCloseTo(ICON_X, 1);

		// ── mid-transition ─────────────────────────────────────────────────────
		// Tag the node so we can prove afterwards that it is the SAME element and
		// was never unmounted — the defect this rewrite fixes would break here
		// even if all three static measurements passed.
		await firstGlyph.evaluate((el) => {
			(el as HTMLElement & { __tag?: string }).__tag = 'persistent';
		});

		const samples = await page.evaluate(async () => {
			const glyph = document.querySelector('.rail-nav .nav-glyph') as HTMLElement;
			const panelEl = document.querySelector('.sidebar-panel') as HTMLElement;
			const toggle = document.querySelector('.head-toggle') as HTMLElement;

			const out: { centre: number; width: number }[] = [];
			toggle.click();

			await new Promise<void>((resolve) => {
				const t0 = performance.now();
				const tick = () => {
					const r = glyph.getBoundingClientRect();
					out.push({ centre: r.x + r.width / 2, width: panelEl.getBoundingClientRect().width });
					// The morph is 200ms; sample past it so the settle is covered too.
					if (performance.now() - t0 < 400) requestAnimationFrame(tick);
					else resolve();
				};
				requestAnimationFrame(tick);
			});
			return out;
		});

		// The panel genuinely animated rather than snapping: at least one sample
		// caught it strictly between the two widths (52 and 249.5). Without this
		// the x assertion below could pass on a panel that never moved.
		const midFlight = samples.filter((s) => s.width > 53 && s.width < 248);
		expect(midFlight.length).toBeGreaterThan(2);

		// Every single frame, moving or settled, put the icon on 26.
		const drift = samples
			.map((s) => Math.abs(s.centre - ICON_X))
			.reduce((a, b) => Math.max(a, b), 0);
		expect(drift).toBeLessThan(EPS);

		// ── expanded ───────────────────────────────────────────────────────────
		await expect(panel).toHaveClass(/is-open/);
		const expanded = await firstGlyph.boundingBox();
		expect(expanded!.x + expanded!.width / 2).toBeCloseTo(ICON_X, 1);

		// Same node throughout — nothing was destroyed and recreated.
		await expect(
			firstGlyph.evaluate((el) => (el as HTMLElement & { __tag?: string }).__tag)
		).resolves.toBe('persistent');
	});

	test('labels and children are hidden from focus and AT while collapsed', async ({ page }) => {
		const panel = page.locator('.sidebar-panel');
		await expect(panel).not.toHaveClass(/is-open/);

		// Nothing invisible may be tabbable: `visibility: hidden` is what removes
		// the labels, carets and every child row from both the tab order and the
		// accessibility tree while the rail is narrow.
		const hiddenButFocusable = await page.evaluate(() => {
			const focusables = document.querySelectorAll(
				'.sidebar-panel button, .sidebar-panel a, .sidebar-panel [tabindex]'
			);
			return [...focusables].filter((el) => {
				const cs = getComputedStyle(el);
				const box = el.getBoundingClientRect();
				// Visible to the tab order but not to the eye.
				return cs.visibility !== 'hidden' && (box.width === 0 || box.height === 0);
			}).length;
		});
		expect(hiddenButFocusable).toBe(0);

		// Child rows exist in the DOM (they must, or there would be nothing to
		// animate) but carry zero height and hidden visibility.
		const kids = page.locator('.nav-kids').first();
		await expect(kids).toHaveCount(1);
		const kidsBox = await kids.boundingBox();
		expect(kidsBox?.height ?? 0).toBeLessThan(1);
		await expect(page.locator('.nav-kids-inner').first()).toHaveCSS('visibility', 'hidden');

		// The part buttons are still named while their visible labels are hidden.
		await expect(page.locator('.rail-nav .nav-part').first()).toHaveAttribute('aria-label', /.+/);
	});

	test('a part icon clicked while collapsed opens the panel and that part together', async ({
		page
	}) => {
		const panel = page.locator('.sidebar-panel');
		// Part 1 — the second row, since row 0 is the hero.
		const part = page.locator('.rail-nav .nav-part').nth(1);
		const caret = page.locator('.rail-nav .nav-caret').nth(1);

		await part.click();
		await expect(panel).toHaveClass(/is-open/);
		await expect(caret).toHaveAttribute('aria-expanded', 'true');
		// The children it discloses are now real height and visible.
		await expect(page.locator('.nav-kids.is-shown').first()).toBeVisible();
	});

	/**
	 * THE PREVIEW FLYOUT.
	 *
	 * Collapsed, the rail is ten unlabelled glyphs, and the flyout is what
	 * answers "what is in this part?" without opening the drawer. It is allowed
	 * to exist only in that state and only for the pointer: the inline labels
	 * and child rows are always in this DOM now, held out of the tab order by
	 * `visibility: hidden`, so a tabbable flyout would be a second reachable
	 * copy of rows the previous test just proved are unreachable.
	 */
	test('the flyout previews a part while collapsed and never while open', async ({ page }) => {
		const panel = page.locator('.sidebar-panel');
		const flyout = page.locator('.nav-flyout');
		const row = page.locator('.rail-nav .nav-item').nth(1);

		await expect(panel).not.toHaveClass(/is-open/);
		// A real cursor position rather than `row.hover()`. Playwright's hover
		// scrolls the target into view first, and a nav row is the full
		// --sidebar-width wide inside a 52px panel — so `hover()` scrolls the
		// panel sideways and measures a geometry no user ever sees. See the
		// scrollLeft test below.
		await page.mouse.move(ICON_X, (await row.boundingBox())!.y + 10);
		await expect(flyout).toBeVisible();

		// It PREVIEWS. The invariant is TAB STOPS, not element type — the rows are
		// real buttons so a pointer can act on them, which is the point of a
		// preview. What must never happen is a second labelled copy of the nav
		// entering the tab order while the inline one is deliberately held out of
		// it. So: assert nothing here is tabbable, which is the property that
		// actually matters.
		const tabbables = await flyout.evaluate(
			(el) =>
				[...el.querySelectorAll('button, a, [tabindex], input, select')].filter(
					(n) => (n as HTMLElement).tabIndex >= 0
				).length
		);
		expect(tabbables).toBe(0);
		await expect(flyout).toHaveAttribute('aria-hidden', 'true');

		// Adding it must not disturb the thing the whole rewrite exists to hold.
		const glyph = page.locator('.rail-nav .nav-glyph').first();
		const box = await glyph.boundingBox();
		expect(box!.x + box!.width / 2).toBeCloseTo(ICON_X, 1);
		// …nor push the document into a horizontal scroll.
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			)
		).toBeLessThanOrEqual(0);

		// Dismissible without moving the pointer — WCAG 2.2 SC 1.4.13.
		await page.keyboard.press('Escape');
		await expect(flyout).toHaveCount(0);

		// Focus is the keyboard equivalent of the hover, on the icon that is
		// already named — no new stop, just the same preview.
		await page.locator('.rail-nav .nav-part').nth(1).focus();
		await expect(flyout).toBeVisible();

		// EXPANDED: the inline labels are the preview now, and two label systems
		// on screen at once is the regression this gate exists to prevent.
		await page.locator('.head-toggle').click();
		await expect(panel).toHaveClass(/is-open/);
		await expect(flyout).toHaveCount(0);
		await page.mouse.move(ICON_X, (await row.boundingBox())!.y + 10);
		await expect(flyout).toHaveCount(0);
	});

	/**
	 * `overflow: hidden` hides a scrollbar; it does not make a box unscrollable.
	 * Collapsed, `.rail-inner` is 249.5px inside a 52px panel, so there are
	 * ~200px of invisible inline overflow and any `scrollIntoView` that centres
	 * a row will consume them — dragging the icon column to negative x, which
	 * every endpoint assertion in this file would miss because it settles there
	 * and stays. The panel pins its own scrollLeft; this proves it.
	 */
	test('the inline axis cannot be scrolled out from under the icon column', async ({ page }) => {
		const glyph = page.locator('.rail-nav .nav-glyph').first();

		const after = await page.evaluate(async () => {
			const row = document.querySelectorAll('.rail-nav .nav-item')[3];
			row.scrollIntoView({ block: 'nearest', inline: 'center' });
			await new Promise((r) => setTimeout(r, 120));
			return {
				panel: (document.querySelector('.sidebar-panel') as HTMLElement).scrollLeft,
				nav: (document.querySelector('.rail-nav') as HTMLElement).scrollLeft
			};
		});
		expect(after.panel).toBe(0);
		expect(after.nav).toBe(0);

		const box = await glyph.boundingBox();
		expect(box!.x + box!.width / 2).toBeCloseTo(ICON_X, 1);
	});

	test('reduced motion makes the morph instant, not slow', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.reload();
		const panel = page.locator('.sidebar-panel');
		// The same hydration wait the beforeEach does: `is-open` arriving is the
		// signal that onMount has run and the toggle click below will collapse
		// rather than race the auto-open.
		await expect(panel).toHaveClass(/is-open/);

		// COLLAPSE FIRST. At >=1024px the panel auto-opens on load, and the
		// `.is-open` rule hardcodes `visibility 0s` — so an assertion taken here
		// reads zero no matter what `--morph-ms` is, and passes even when the
		// preference is being ignored entirely. The collapsed state is the one
		// where the delay is load-bearing, because that is when labels are being
		// taken OUT of the tab order.
		await page.locator('.head-toggle').click();
		await expect(panel).not.toHaveClass(/is-open/);

		const timing = await page.evaluate(() => {
			const ms = (v: string) =>
				Math.max(...v.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 1 : 1000)));
			const el = document.querySelector('.sidebar-panel')!;
			const panel = getComputedStyle(el);
			const label = getComputedStyle(document.querySelector('.nav-label')!);
			return {
				// The custom property itself — the thing a stylesheet override
				// cannot fix. It is written INLINE on the panel, so a rule under
				// `@media (prefers-reduced-motion)` cannot win against it however
				// it is scoped. Assert the computed value, not a symptom of it.
				morphMs: ms(panel.getPropertyValue('--morph-ms')),
				width: ms(panel.transitionDuration),
				// layout.css clamps every transition-DURATION globally with
				// !important but says nothing about DELAYS, so this is the half a
				// naive override misses: the `visibility` step that removes a hidden
				// label from the tab order would still wait out the full morph.
				labelDelay: ms(label.transitionDelay)
			};
		});

		expect(timing.morphMs).toBeLessThan(5);
		expect(timing.width).toBeLessThan(5);
		expect(timing.labelDelay).toBeLessThan(5);
	});
});
