import { expect, test } from '@playwright/test';

test.describe('Git Playground', () => {
	test('loads and runs git status', async ({ page }) => {
		await page.goto('/playground');
		await expect(page.getByRole('heading', { name: 'Try Git for real' })).toBeVisible();

		const input = page.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });

		await input.fill('git status');
		await input.press('Enter');

		await expect(page.getByText('On branch')).toBeVisible();
	});

	test('scenario switch resets terminal', async ({ page }) => {
		await page.goto('/playground');
		const select = page.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });

		await select.selectOption('branch-experiment');
		await expect(page.getByText('Scenario: Branch for AI experiment')).toBeVisible();
	});
});

test.describe('Tutorial', () => {
	test('homepage loads with hero', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /Git for/ })).toBeVisible();
	});

	test('playground link in header', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByLabel('Git Playground')).toBeVisible();
	});

	test('hash deep link scrolls to section', async ({ page }) => {
		await page.goto('/#part-2');
		await expect(page.locator('#part-2')).toBeInViewport({ timeout: 5000 });
	});
});
