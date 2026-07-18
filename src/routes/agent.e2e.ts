import { expect, test } from '@playwright/test';

test.describe('Agent panel', () => {
	test('opens from the header, answers with a citation chip, closes on ESC', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		await expect(panel).toHaveAttribute('aria-hidden', 'false');

		const input = page.getByLabel('Ask the agent');
		await input.fill('what does git status show');
		await input.press('Enter');

		// The mock streams word by word; the citation chip is the last thing
		// to render, so waiting for it covers the whole answer.
		const chip = panel.locator('a[href="#section-2-1"]');
		await expect(chip).toBeVisible({ timeout: 15000 });
		await expect(chip).toContainText('2.1 git status');

		// Citation chips navigate to the section without closing the panel.
		await chip.click();
		await expect(page).toHaveURL(/#section-2-1/);
		await expect(panel).toHaveAttribute('aria-hidden', 'false');

		await page.keyboard.press('Escape');
		await expect(panel).toHaveAttribute('aria-hidden', 'true');
	});

	test('is mutually exclusive with the playground panel', async ({ page }) => {
		await page.goto('/');

		const agentPanel = page.locator('aside[aria-label="Agent"]');
		const playgroundPanel = page.locator('aside[aria-label="Git Playground"]');

		await page.getByRole('button', { name: 'Open Git Playground' }).click();
		await expect(playgroundPanel).toHaveAttribute('aria-hidden', 'false');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		await expect(agentPanel).toHaveAttribute('aria-hidden', 'false');
		await expect(playgroundPanel).toHaveAttribute('aria-hidden', 'true');

		await page.getByRole('button', { name: 'Open Git Playground' }).click();
		await expect(playgroundPanel).toHaveAttribute('aria-hidden', 'false');
		await expect(agentPanel).toHaveAttribute('aria-hidden', 'true');
	});

	test('shows starter chips and the honest scripted-guide notice', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');

		await expect(panel.getByText(/scripted guide/i)).toBeVisible();
		await expect(
			panel.getByRole('button', { name: 'What does rebase actually do?' })
		).toBeVisible();

		await panel.getByRole('button', { name: 'What does rebase actually do?' }).click();
		await expect(panel.locator('[data-role="assistant"]').first()).toContainText(/rebase/i, {
			timeout: 15000
		});
	});

	test('offers the local model download with the size disclosed (never auto-starts)', async ({
		page
	}) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');

		// Both models offered side by side, sizes disclosed on the cards.
		const smallCard = panel.locator('.agent-model-tan');
		const bigCard = panel.locator('.agent-model-amber');
		await expect(smallCard).toBeVisible();
		await expect(smallCard).toContainText('LFM2.5 1.2B');
		await expect(smallCard).toContainText('~760 MB');
		await expect(bigCard).toBeVisible();
		await expect(bigCard).toContainText('Qwen3.5 2B');
		await expect(bigCard).toContainText('1.3 GB');

		// Each card carries its OWN download button with the size on it —
		// download gates activation, and only an explicit click starts it
		// (which CI must never do).
		const smallDl = smallCard.getByRole('button', { name: /Download · 760 MB/ });
		await expect(smallDl).toBeVisible();
		await expect(bigCard.getByRole('button', { name: /Download · 1\.3 GB/ })).toBeVisible();
		await expect(panel.getByText('runs entirely in your browser')).toBeVisible();

		// Dismissing keeps the scripted guide working.
		await panel.getByRole('button', { name: 'Use scripted mode' }).click();
		await expect(smallDl).not.toBeVisible();
	});

	test('header gear opens the settings popover with the model picker', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');

		await panel.getByRole('button', { name: 'Agent settings' }).click();
		const settings = page.getByRole('dialog', { name: 'Agent settings' });
		await expect(settings).toBeVisible();
		await expect(settings.getByText('Model')).toBeVisible();
		await expect(settings.locator('.agent-model-tan')).toContainText('LFM2.5 1.2B');
		await expect(settings.locator('.agent-model-amber')).toContainText('Qwen3.5 2B');
		await expect(
			settings.locator('.agent-model-tan').getByRole('button', { name: /Download · 760 MB/ })
		).toBeVisible();

		await page.getByRole('button', { name: 'Close settings' }).click();
		await expect(settings).not.toBeVisible();
	});

	test('gated demo: DENY runs nothing, ALLOW executes into the agent terminal', async ({
		page
	}) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		const input = page.getByLabel('Ask the agent');
		const terminal = panel.locator('[data-testid="agent-terminal"]');
		const card = panel.locator('[data-testid="approval-card"]');

		// ── Turn 1: deny everything — the sandbox must stay untouched. ──
		await input.fill('demo: status');
		await input.press('Enter');
		await expect(card).toBeVisible({ timeout: 15000 });
		await expect(panel.locator('[data-testid="approval-cmd"]')).toContainText('git status');
		await card.getByRole('button', { name: /Deny/ }).click();
		await expect(panel.locator('[data-testid="approval-cmd"]')).toContainText('git diff', {
			timeout: 15000
		});
		await card.getByRole('button', { name: /Deny/ }).click();
		await expect(panel.getByText(/nothing was run/i)).toBeVisible({ timeout: 15000 });
		await expect(terminal).toHaveCount(0);

		// ── Turn 2: approve everything — commands + output land in the terminal. ──
		await panel.getByRole('button', { name: 'Send question' }).waitFor({ timeout: 15000 });
		await input.fill('demo: status');
		await input.press('Enter');
		await expect(card).toBeVisible({ timeout: 15000 });
		await card.getByRole('button', { name: /Allow/ }).click();
		await expect(card.locator('[data-testid="approval-cmd"]')).toContainText('git diff', {
			timeout: 15000
		});
		await card.getByRole('button', { name: /Allow/ }).click();

		await expect(terminal).toBeVisible({ timeout: 15000 });
		await expect(terminal).toContainText('git status');
		await expect(terminal).toContainText('On branch main');

		// The wrap-up answer carries a Sources row of chips.
		const sources = panel.locator('.agent-sources').last();
		await expect(sources).toBeVisible({ timeout: 15000 });
		await expect(sources).toContainText('Sources');
		await expect(sources.locator('a[href="#section-2-1"]')).toBeVisible();
	});

	test('the agent terminal is seeded: log and branches show the demo repo', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		const input = page.getByLabel('Ask the agent');

		await input.fill('demo: sandbox');
		await input.press('Enter');
		const card = panel.locator('[data-testid="approval-card"]');
		await expect(card).toBeVisible({ timeout: 15000 });
		await expect(panel.locator('[data-testid="approval-cmd"]')).toContainText('git log --oneline');
		await card.getByRole('button', { name: /Allow/ }).click();
		await expect(card.locator('[data-testid="approval-cmd"]')).toContainText('git branch', {
			timeout: 15000
		});
		await card.getByRole('button', { name: /Allow/ }).click();

		// The seeded repo, not an empty sandbox: history and branches are there
		// for the agent to demonstrate on.
		const terminal = panel.locator('[data-testid="agent-terminal"]');
		await expect(terminal).toBeVisible({ timeout: 15000 });
		await expect(terminal).toContainText('fix: trim whitespace in names');
		await expect(terminal).toContainText('feature/ideas');
	});

	test('contextual suggestions stream in for the section being read', async ({ page }) => {
		// Test breadcrumb: force the mock backend to serve suggestions (the
		// product rule is "downloaded + ready local model only").
		await page.addInitScript(() => localStorage.setItem('tv-agent-suggest-mock', '1'));
		await page.goto('/#section-2-1');

		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		const chips = panel.locator('[data-testid="agent-chip"]');

		// Four questions materialize, grounded in the chmod section.
		await expect(chips).toHaveCount(4, { timeout: 15000 });
		await expect(chips.first()).toContainText('git status');
		await expect(panel.getByText('questions for 2.1 git status')).toBeVisible();

		// The refresh affordance regenerates for wherever the user is NOW.
		const refresh = panel.locator('[data-testid="suggest-refresh"]');
		await expect(refresh).toBeVisible();
		await refresh.click();
		await expect(chips).toHaveCount(4, { timeout: 15000 });
		await expect(chips.first()).toContainText('git status');

		// Clicking a chip asks it like any typed question.
		await chips.first().click();
		await expect(panel.locator('[data-role="assistant"]').first()).toContainText(/status/i, {
			timeout: 15000
		});
	});

	test('no model, no breadcrumb: the static starters stay untouched', async ({ page }) => {
		await page.goto('/#section-2-1');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		const chips = panel.locator('[data-testid="agent-chip"]');
		await expect(chips).toHaveCount(3);
		await expect(
			panel.getByRole('button', { name: 'What does rebase actually do?' })
		).toBeVisible();
		await expect(panel.locator('[data-testid="suggest-refresh"]')).toHaveCount(0);
	});

	test('teaching answers render markdown with a code block and a sources row', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');

		await panel.getByRole('button', { name: 'What does rebase actually do?' }).click();
		const answer = panel.locator('[data-role="assistant"]').first();
		// The fenced example renders as a real code block, tokenized.
		await expect(answer.locator('pre.agent-md-code')).toBeVisible({ timeout: 15000 });
		await expect(answer.locator('pre.agent-md-code')).toContainText('git rebase origin/main');
		// Citations live in the sources row, not mid-sentence.
		await expect(answer).not.toContainText('[[section');
		await expect(answer.locator('.agent-sources')).toContainText('Sources');
	});

	test('downloaded flag means chat — no intro banner, no cards in the chat area', async ({
		page
	}) => {
		// First run: the intro banner + model cards ARE the chat area's empty state.
		await page.goto('/');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');
		await expect(panel.locator('[data-testid="agent-intro"]')).toBeVisible();

		// Downloaded (flag only, nothing selected → no auto-warm, no network):
		// the banner and cards never render again; models live behind the gear.
		await page.evaluate(() =>
			localStorage.setItem(
				'tv-agent-downloaded',
				JSON.stringify(['LiquidAI/LFM2.5-1.2B-Instruct-ONNX'])
			)
		);
		await page.reload();
		await page.getByRole('button', { name: 'Open Agent' }).click();
		await expect(panel.locator('[data-testid="agent-intro"]')).toHaveCount(0);
		await expect(panel.locator('.agent-model-card')).toHaveCount(0);

		// The gear still offers the model management.
		await panel.getByRole('button', { name: 'Agent settings' }).click();
		const settings = page.getByRole('dialog', { name: 'Agent settings' });
		await expect(settings.locator('.agent-model-card')).toHaveCount(2);
		await expect(
			settings.locator('.agent-model-tan').getByRole('button', { name: 'Use this model' })
		).toBeVisible();
	});

	test('desktop reading mode: the panel reshapes the page instead of covering it', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		const main = page.locator('main#main-content');

		// Sidebar starts open at desktop widths.
		await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();

		await page.getByRole('button', { name: 'Open Agent' }).click();

		// Sidebar auto-collapses; main gains a right margin equal to the panel.
		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
		await expect
			.poll(async () => main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight)))
			.toBeGreaterThan(300);

		// The course text reflows — no horizontal overflow anywhere.
		const overflow1280 = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow1280).toBeLessThanOrEqual(0);

		// Closing restores the sidebar and the margin.
		await page.keyboard.press('Escape');
		await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
		await expect
			.poll(async () => main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight)))
			.toBe(0);

		// Same reflow guarantee at a wide desktop.
		await page.setViewportSize({ width: 1680, height: 900 });
		await page.getByRole('button', { name: 'Open Agent' }).click();
		await expect
			.poll(async () => main.evaluate((el) => parseFloat(getComputedStyle(el).marginRight)))
			.toBeGreaterThan(300);
		const overflow1680 = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow1680).toBeLessThanOrEqual(0);

		// The content column stays comfortably readable next to the panel.
		const contentWidth = await page
			.locator('main .max-w-4xl')
			.first()
			.evaluate((el) => el.getBoundingClientRect().width);
		expect(contentWidth).toBeGreaterThan(500);
	});
});
