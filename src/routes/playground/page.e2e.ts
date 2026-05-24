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

		await select.selectOption('stash');
		await expect(page.getByText('Uncommitted work on feature/A')).toBeVisible();
	});

	test('supports stash commands', async ({ page }) => {
		await page.goto('/playground');
		const select = page.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('stash');

		const input = page.locator('input[placeholder="git status"]');
		await input.fill('git stash push -m "WIP test"');
		await input.press('Enter');
		await expect(page.getByText('Saved working directory')).toBeVisible();
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

	test('lesson activity try-it-yourself tab loads playground', async ({ page }) => {
		await page.goto('/#section-2-3');
		const activity = page.locator('#core-loop');
		await activity.getByRole('tab', { name: 'Try it yourself' }).click();
		await expect(activity.getByText('real git')).toBeVisible({ timeout: 15000 });

		const input = activity.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });
	});
});
