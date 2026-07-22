import { expect, test, type Page } from '@playwright/test';

// The search input is server-rendered, so a fast worker can type into it
// BEFORE hydration attaches its input listener — the keystrokes land in the
// DOM, the dropdown never opens, and the test times out. The heading anchors
// are created in +page's onMount, so their presence proves the page's
// interactivity is live before any test starts typing.
async function gotoHydrated(page: Page) {
	await page.goto('/');
	await page.locator('.heading-anchor').first().waitFor({ state: 'attached' });
}

test.describe('Command search', () => {
	test('finds git stash commands instead of chapter titles', async ({ page }) => {
		await gotoHydrated(page);

		const search = page.getByPlaceholder('Search commands...');
		await search.focus();
		await search.fill('git stash');

		// Scoped to the dropdown: the header's course timeline is a listbox too,
		// and its marks legitimately carry chapter and playground names — the
		// claim under test is about what SEARCH returns, not the whole header.
		const results = page.locator('.search-dropdown');
		await expect(results.getByRole('option', { name: /git stash/i }).first()).toBeVisible();
		await expect(results.getByRole('option', { name: /Advanced Workflows$/ })).toHaveCount(0);
		await expect(results.getByRole('option', { name: /Core Safety Loop/ })).toHaveCount(0);
	});

	test('navigates to the stash lesson from search', async ({ page }) => {
		await gotoHydrated(page);

		const search = page.getByPlaceholder('Search commands...');
		await search.fill('git stash pop');
		await page
			.getByRole('option', { name: /git stash pop/i })
			.first()
			.click();

		await expect(page).toHaveURL(/#section-5-1/, { timeout: 5000 });
	});

	test('shows empty state for nonsense queries', async ({ page }) => {
		await gotoHydrated(page);

		const search = page.getByPlaceholder('Search commands...');
		await search.fill('xyzzynotacommand');
		await expect(page.getByText(/No commands match/)).toBeVisible();
	});
});
