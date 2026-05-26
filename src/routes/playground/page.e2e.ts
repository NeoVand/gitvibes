import { expect, test } from '@playwright/test';

async function runCommand(
	page: import('@playwright/test').Page,
	input: import('@playwright/test').Locator,
	command: string
) {
	await input.fill(command);
	await input.press('Enter');
}

async function openPlaygroundPanel(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.getByLabel('Open Git Playground').click();
	await expect(page.getByRole('complementary', { name: 'Git Playground' })).toBeVisible();
}

function playgroundPanel(page: import('@playwright/test').Page) {
	return page.getByRole('complementary', { name: 'Git Playground' });
}

test.describe('Git Playground', () => {
	test('opens in sidebar and runs git status', async ({ page }) => {
		await openPlaygroundPanel(page);

		const panel = playgroundPanel(page);
		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });

		await runCommand(page, input, 'git status');
		await expect(panel.getByText('On branch')).toBeVisible();
	});

	test('scenario switch resets terminal', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });

		await select.selectOption('stash');
		await expect(page.getByText('Uncommitted work on feature/A')).toBeVisible();
	});

	test('supports stash commands', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('stash');

		const input = panel.locator('input[placeholder="git status"]');
		await runCommand(page, input, 'git stash push -m "WIP test"');
		await expect(page.getByText('Saved working directory')).toBeVisible();
	});

	test('supports git add -p patch mode', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });

		await runCommand(page, input, 'git add -p');
		await expect(page.getByText('Stage changes in')).toBeVisible();

		await runCommand(page, input, 'y');
		await expect(page.getByText(/Done staging|Stage changes in/)).toBeVisible();
	});

	test('supports fetch and remote on sync scenario', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('sync-remote');
		await expect(page.getByText('# Your feature branch is ready')).toBeVisible({ timeout: 15000 });

		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled();
		await runCommand(page, input, 'git fetch origin');
		await expect(page.getByText('From https://github.com/your-org/project.git')).toBeVisible();

		await runCommand(page, input, 'git remote -v');
		await expect(page.getByText(/origin\s+https:\/\/github.com\/your-org\/project.git/)).toBeVisible();
	});

	test('supports push on branching scenario', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('branching');

		const input = panel.locator('input[placeholder="git status"]');
		await runCommand(page, input, 'git switch -c feature/ai-experiment');
		await runCommand(page, input, 'git add .');
		await runCommand(page, input, 'git commit -m "feat: AI refactor"');
		await runCommand(page, input, 'git push -u origin feature/ai-experiment');
		await expect(page.getByText('set up to track')).toBeVisible();
	});

	test('help lists new commands', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });

		await runCommand(page, input, 'help');
		await expect(panel.getByText('git fetch origin')).toBeVisible();
		await expect(panel.getByText('git revert')).toBeVisible();
	});

	test('legacy /playground URL opens sidebar on home', async ({ page }) => {
		await page.goto('/playground');
		await expect(page).toHaveURL(/\/$/);
		await expect(playgroundPanel(page)).toBeVisible({ timeout: 15000 });
	});
});

test.describe('Tutorial', () => {
	test('homepage loads with hero', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /Git for/ })).toBeVisible();
	});

	test('playground link in header', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByLabel('Open Git Playground')).toBeVisible();
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

	test('sync-remote lesson activity loads in part 3', async ({ page }) => {
		await page.goto('/#section-3-2');
		const activity = page.locator('#sync-remote');
		await expect(activity.getByText('# Your feature branch is ready')).toBeVisible({ timeout: 15000 });

		const input = activity.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled();
		await runCommand(page, input, 'git fetch origin');
		await expect(activity.getByText('From https://github.com/your-org/project.git')).toBeVisible();
	});
});
