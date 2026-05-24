import { expect, test } from '@playwright/test';

test.describe('Command search', () => {
	test('finds git stash commands instead of chapter titles', async ({ page }) => {
		await page.goto('/');

		const search = page.getByPlaceholder('Search commands...');
		await search.focus();
		await search.fill('git stash');

		await expect(page.getByRole('option', { name: /git stash/i }).first()).toBeVisible();
		await expect(page.getByRole('option', { name: /Advanced Workflows$/ })).toHaveCount(0);
		await expect(page.getByRole('option', { name: /Core Safety Loop/ })).toHaveCount(0);
	});

	test('navigates to the stash lesson from search', async ({ page }) => {
		await page.goto('/');

		const search = page.getByPlaceholder('Search commands...');
		await search.fill('git stash pop');
		await page.getByRole('option', { name: /git stash pop/i }).first().click();

		await expect(page).toHaveURL(/#section-5-1/, { timeout: 5000 });
	});

	test('shows empty state for nonsense queries', async ({ page }) => {
		await page.goto('/');

		const search = page.getByPlaceholder('Search commands...');
		await search.fill('xyzzynotacommand');
		await expect(page.getByText(/No commands match/)).toBeVisible();
	});
});
