import { test, expect } from '@playwright/test';

/**
 * The part pages exist to be shared and crawled, so what matters here is what
 * a link preview and a search engine see — not just that the page renders.
 */
test.describe('Standalone part pages', () => {
	test('carries its own title, description and social card', async ({ page }) => {
		await page.goto('/parts/undo-toolkit');

		await expect(page).toHaveTitle(/Undo Toolkit/);

		// Exactly one og:title: app.html must not also ship a set, or a crawler
		// takes the shell's and every part page looks identical.
		await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
			'content',
			/Undo Toolkit/
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			/\/parts\/undo-toolkit$/
		);
		// The card image is absolute — a relative one resolves against the
		// crawler's host, not ours.
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/^https:\/\//
		);
	});

	test('renders the real part content, not a stub', async ({ page }) => {
		await page.goto('/parts/undo-toolkit');
		await expect(page.locator('#part-4')).toBeVisible();
		await expect(page.locator('#section-4-1')).toBeAttached();
	});

	test('moves between neighbours and back to the full course', async ({ page }) => {
		await page.goto('/parts/undo-toolkit');

		const nav = page.getByRole('navigation', { name: 'Between parts' });
		await expect(nav.getByText('Previous part')).toBeVisible();
		await expect(nav.getByText('Next part')).toBeVisible();

		await nav.getByRole('link', { name: /Next part/ }).click();
		await expect(page).toHaveURL(/\/parts\/advanced-workflows/);
		await expect(page.locator('#part-5')).toBeVisible();
	});

	/**
	 * The reason CourseLink resolves its href from the route: on a standalone
	 * page an anchor in another part does not exist in the DOM, so the link has
	 * to travel back to the course page carrying its hash.
	 */
	test('a reference to another part leaves for the course page', async ({ page }) => {
		await page.goto('/parts/ci-bots-and-releases');
		const crossRef = page.getByRole('link', { name: /Automating with Hooks/ }).first();
		await expect(crossRef).toHaveAttribute('href', /\/#section-6-2$/);
	});

	test('the course page indexes every part page', async ({ page }) => {
		await page.goto('/');
		const index = page.getByRole('navigation', { name: 'Parts of this course' });
		await expect(index.getByRole('link')).toHaveCount(9);
		await index.getByRole('link', { name: /Undo Toolkit/ }).click();
		await expect(page).toHaveURL(/\/parts\/undo-toolkit/);
	});
});
