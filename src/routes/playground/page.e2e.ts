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
		await expect(panel.getByText(/mid-refactor on feature\/A/)).toBeVisible({ timeout: 15000 });
	});

	test('supports stash commands', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('stash');

		const input = panel.locator('input[placeholder="git status"]');
		await runCommand(page, input, 'git stash push -m "WIP test"');
		await expect(panel.getByText('Saved working directory')).toBeVisible();
	});

	test('supports git add -p patch mode', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled({ timeout: 15000 });

		await runCommand(page, input, 'git add -p');
		await expect(panel.getByText('Stage changes in')).toBeVisible();

		await runCommand(page, input, 'y');
		await expect(panel.getByText(/Done staging|Stage changes in/)).toBeVisible();
	});

	test('supports fetch and remote on sync scenario', async ({ page }) => {
		await openPlaygroundPanel(page);
		const panel = playgroundPanel(page);
		const select = panel.locator('select');
		await expect(select).toBeEnabled({ timeout: 15000 });
		await select.selectOption('sync-remote');
		await expect(panel.getByText(/teammates have pushed new commits/)).toBeVisible({
			timeout: 15000
		});

		const input = panel.locator('input[placeholder="git status"]');
		await expect(input).toBeEnabled();
		await runCommand(page, input, 'git fetch origin');
		await expect(panel.getByText('From https://github.com/your-org/project.git')).toBeVisible();

		await runCommand(page, input, 'git remote -v');
		await expect(
			panel.getByText(/origin\s+https:\/\/github.com\/your-org\/project.git/)
		).toBeVisible();
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
		await expect(panel.getByText('set up to track')).toBeVisible();
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

	// Lesson playgrounds initialize when scrolled into view, and the page's own
	// deep-link scroll can race a programmatic scroll during hydration — so
	// keep re-scrolling until the playground materializes.
	async function scrollActivityIntoView(
		activity: import('@playwright/test').Locator,
		input: import('@playwright/test').Locator
	) {
		await expect(async () => {
			await activity.scrollIntoViewIfNeeded();
			await expect(input).toBeEnabled({ timeout: 2000 });
		}).toPass({ timeout: 20000 });
	}

	test('lesson activity loads embedded playground', async ({ page }) => {
		await page.goto('/#section-2-3');
		const activity = page.locator('[data-lesson-activity="core-loop"]');
		const input = activity.locator('input[placeholder="git status"]');
		await scrollActivityIntoView(activity, input);

		await runCommand(page, input, 'git status');
		await expect(activity.getByText('On branch')).toBeVisible();
	});

	test('sync-remote lesson activity loads in part 3', async ({ page }) => {
		await page.goto('/#section-3-2');
		const activity = page.locator('[data-lesson-activity="sync-remote"]');
		const input = activity.locator('input[placeholder="git status"]');
		await scrollActivityIntoView(activity, input);

		await expect(activity.getByText(/teammates have pushed new commits/)).toBeVisible();
		await runCommand(page, input, 'git fetch origin');
		await expect(activity.getByText('From https://github.com/your-org/project.git')).toBeVisible();
	});
});
