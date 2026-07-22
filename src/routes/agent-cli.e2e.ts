import { expect, test, type Page } from '@playwright/test';

/**
 * The CLI agent (`agent "<task>"`) inside the panel playground, driven
 * end-to-end against the deterministic mock backend: the downloaded flag is
 * set without a selected model, so no weights load and no network is touched
 * — exactly the scripted-demo path real browsers get before activation.
 */

const COMMIT_TASK = 'agent "commit a note about your visit"';
const DOWNLOADED_FLAG = ['LiquidAI/LFM2.5-1.2B-Instruct-ONNX'];

// The header buttons are server-rendered, so a fast worker can click them
// BEFORE hydration attaches their handlers — the click lands, nothing opens,
// and the test times out. The heading anchors are created in +page's onMount,
// so their presence proves the page's interactivity is live.
async function gotoHydrated(page: Page, path = '/') {
	await page.goto(path);
	await page.locator('.heading-anchor').first().waitFor({ state: 'attached' });
}

async function openPanelPlayground(page: Page) {
	await gotoHydrated(page);
	await page.getByRole('button', { name: 'Open Git Playground' }).click();
	const panel = page.locator('aside[aria-label="Git Playground"]');
	await expect(panel).toHaveAttribute('aria-hidden', 'false');
	const input = panel.getByLabel('Git command');
	await expect(input).toBeEnabled({ timeout: 15000 });
	return { panel, input, terminal: panel.locator('.pg-terminal') };
}

function markModelDownloaded(page: Page) {
	return page.addInitScript(
		(flag) => localStorage.setItem('tv-agent-downloaded', JSON.stringify(flag)),
		DOWNLOADED_FLAG
	);
}

test.describe('CLI agent in the playground terminal', () => {
	test('bare `agent` teaches usage; a task without a model teaches the download path', async ({
		page
	}) => {
		const { panel, terminal, input } = await openPanelPlayground(page);

		await input.fill('agent');
		await input.press('Enter');
		await expect(terminal).toContainText('an AI agent that lives in this terminal');
		await expect(terminal).toContainText('agent "<task>"');

		await input.fill(COMMIT_TASK);
		await input.press('Enter');
		await expect(terminal).toContainText('no local model is downloaded yet');
		await expect(terminal).toContainText('Agent panel');
		// Never auto-downloads: no session started, prompt is a normal shell.
		await expect(panel.getByTestId('agent-approval')).toHaveCount(0);
	});

	test('`agent` is a first-class citizen: help lists it', async ({ page }) => {
		const { terminal, input } = await openPanelPlayground(page);

		await input.fill('help');
		await input.press('Enter');
		await expect(terminal).toContainText('AI agent');
	});

	test('allow flow: propose → y → execute → VFS + file tree update → done', async ({ page }) => {
		await markModelDownloaded(page);
		const { panel, terminal, input } = await openPanelPlayground(page);

		// The TRY THESE chip appears once a model is downloaded; it pre-fills
		// the prompt with the invocation.
		const chip = panel.getByTestId('agent-try-chip');
		await expect(chip).toBeVisible();
		await chip.click();
		await expect(input).toHaveValue(COMMIT_TASK);
		await input.press('Enter');

		// Demo-mode honesty note, then the first syntax-highlighted proposal
		// with the single-keystroke approval prompt.
		await expect(terminal).toContainText('scripted demo agent');
		const proposal = terminal.getByTestId('agent-proposal');
		await expect(proposal.first()).toContainText("echo 'agent was here' > agent-notes.md", {
			timeout: 15000
		});
		await expect(panel.getByTestId('agent-approval')).toContainText('[y] yes');

		await input.press('y');
		await expect(proposal.nth(1)).toContainText('git add agent-notes.md', { timeout: 15000 });
		await input.press('y');
		await expect(proposal.nth(2)).toContainText('git commit', { timeout: 15000 });
		await input.press('y');

		// The closing summary, the executed commands as normal history, and
		// the live file tree all reflect the same VFS.
		await expect(terminal).toContainText(
			'✔ agent: Committed agent-notes.md with a conventional message.',
			{ timeout: 15000 }
		);
		await expect(terminal).toContainText('git add agent-notes.md');

		// The session is over: a normal shell prompt again.
		await input.fill('git log --oneline');
		await input.press('Enter');
		await expect(terminal).toContainText('docs: add agent notes');
	});

	test('deny flow: n skips the command, the agent adjusts and still wraps up', async ({ page }) => {
		await markModelDownloaded(page);
		const { panel, terminal, input } = await openPanelPlayground(page);

		await input.fill(COMMIT_TASK);
		await input.press('Enter');
		await expect(panel.getByTestId('agent-approval')).toBeVisible({ timeout: 15000 });

		await input.press('n');
		await expect(terminal).toContainText('skipping', { timeout: 15000 });
		await expect(terminal.getByTestId('agent-proposal').nth(1)).toBeVisible({ timeout: 15000 });
		await input.press('n');
		await expect(terminal.getByTestId('agent-proposal').nth(2)).toBeVisible({ timeout: 15000 });
		await input.press('n');

		await expect(terminal).toContainText('Nothing was run', { timeout: 15000 });
		// Denied commands never touched the repo: the file was never written.
		await input.fill('cat agent-notes.md');
		await input.press('Enter');
		await expect(terminal).toContainText('No such file');
		void panel;
	});

	test('edit flow: e pre-fills the input, the edited command is what runs', async ({ page }) => {
		await markModelDownloaded(page);
		const { panel, terminal, input } = await openPanelPlayground(page);

		await input.fill(COMMIT_TASK);
		await input.press('Enter');
		await expect(panel.getByTestId('agent-approval')).toBeVisible({ timeout: 15000 });

		await input.press('e');
		await expect(input).toHaveValue("echo 'agent was here' > agent-notes.md");
		await expect(panel.getByTestId('agent-edit')).toBeVisible();
		await input.fill("echo 'agent was here' > visit-log.md");
		await input.press('Enter');

		// The edited command executed against this terminal's repo.
		await expect(terminal.getByTestId('agent-proposal').nth(1)).toBeVisible({ timeout: 15000 });
		await input.press('n');
		await expect(terminal.getByTestId('agent-proposal').nth(2)).toBeVisible({ timeout: 15000 });
		await input.press('n');
		await expect(terminal).toContainText('agent:', { timeout: 15000 });
		await input.fill('cat visit-log.md');
		await input.press('Enter');
		await expect(terminal).toContainText('agent was here');
		void panel;
	});

	test('Ctrl+C interrupts the session with ^C and a SIGINT notice', async ({ page }) => {
		await markModelDownloaded(page);
		const { panel, terminal, input } = await openPanelPlayground(page);
		void panel;

		await input.fill(COMMIT_TASK);
		await input.press('Enter');
		await expect(panel.getByTestId('agent-approval')).toBeVisible({ timeout: 15000 });

		await input.press('Control+c');
		await expect(terminal).toContainText('^C');
		await expect(terminal).toContainText('caught SIGINT');

		// The shell is back: the prompt runs normal commands again.
		await input.fill('git status');
		await input.press('Enter');
		await expect(terminal).toContainText('On branch');
	});
});
