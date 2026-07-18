#!/usr/bin/env node
/**
 * REAL-MODEL smoke test — not part of CI (CI never downloads weights).
 *
 * Boots the dev server, opens Chromium with a persistent profile under
 * .smoke-cache/ (so the ~450 MB download happens once), clicks the actual
 * download button in the Agent panel, waits for the model to go live, asks
 * "What does chmod 755 mean?", and reports:
 *   - which device ran (webgpu or wasm) + warm-up probe latency
 *   - bytes observed from huggingface.co (download size check)
 *   - TTFT, total answer time, rough chars/sec
 *   - whether search_course was called, and the full answer text
 *
 * Flags:
 *   --check-2b   additionally probe the 2B multimodal repo init and report
 *                which files transformers.js requests (vision skipped or not),
 *                aborting before the big shards finish.
 *
 * Usage: node scripts/smoke-local-model.mjs [--check-2b]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = Number(process.env.SMOKE_PORT) || 4293;
const BASE = `http://localhost:${PORT}`;
const PROFILE = new URL('../.smoke-cache/profile', import.meta.url).pathname;
const CHECK_2B = process.argv.includes('--check-2b');

function log(...args) {
	console.log('[smoke]', ...args);
}

async function waitForServer(url, timeoutMs = 120_000) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`dev server did not come up on ${url}`);
}

async function main() {
	mkdirSync(PROFILE, { recursive: true });

	log(`starting dev server on :${PORT}`);
	const server = spawn('npm', ['run', 'dev'], {
		env: { ...process.env, PORT: String(PORT) },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	server.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`));
	const killServer = () => {
		try {
			server.kill('SIGTERM');
		} catch {
			/* already gone */
		}
	};
	process.on('exit', killServer);

	try {
		await waitForServer(BASE);
		log('dev server up');

		const context = await chromium.launchPersistentContext(PROFILE, {
			headless: true,
			viewport: { width: 1400, height: 950 },
			// WebGPU in headless Chromium wants these; if the adapter still
			// refuses, the app's warm-up probe cascades to wasm on its own.
			args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal']
		});
		const page = await context.newPage();
		page.on('console', (msg) => {
			const t = msg.text();
			if (/error|failed|webgpu|wasm|onnx/i.test(t)) log(`console: ${t.slice(0, 200)}`);
		});

		// Tally the actual bytes that come off huggingface.co.
		let hfBytes = 0;
		const hfFiles = new Set();
		page.on('response', (res) => {
			const url = res.url();
			if (!/huggingface\.co|hf\.co|cdn-lfs/.test(url)) return;
			const file = url.split('?')[0].split('/').slice(-1)[0];
			hfFiles.add(file);
			const len = Number(res.headers()['content-length'] ?? 0);
			if (len > 0) hfBytes += len;
		});
		// Requests served from Cache Storage never hit the network layer, so a
		// route-level counter is the honest re-download detector for phase 2.
		let phase = 'first-load';
		let onnxAfterReload = 0;
		await context.route(/huggingface\.co|hf\.co|cdn-lfs/, (route) => {
			if (phase === 'reload' && /\.onnx/.test(route.request().url())) onnxAfterReload++;
			void route.continue();
		});

		await page.goto(BASE);
		await page.evaluate(() => {
			window.__tvAgentSearches = [];
		});

		log('opening Agent panel');
		await page.getByRole('button', { name: 'Open Agent' }).click();
		const panel = page.locator('aside[aria-label="Agent"]');

		// On a fresh profile the offer card shows the per-card download button;
		// on a revisit the app auto-warms from Cache Storage instead (no button,
		// no download). vite dev may also reload the page once while optimizing
		// new deps, closing the panel — so retry the open until content shows.
		const modeRow = panel.locator('.agent-mode-row');
		const btn = panel
			.locator('.agent-model-tan')
			.getByRole('button', { name: /Download · 760 MB/ });
		const downloadStart = Date.now();
		// Panel-open stage under the new state machine:
		//  - first run          → intro banner + tiles in the chat area → click Download
		//  - auto-warm running  → slim .agent-status line ("waking …")   → just wait
		//  - downloaded, idle   → nothing in the chat area               → gear → Use this model
		//  - already live       → mode row
		let first = null;
		for (let attempt = 0; attempt < 6 && !first; attempt++) {
			if ((await panel.getAttribute('aria-hidden')) !== 'false') {
				await page
					.getByRole('button', { name: 'Open Agent' })
					.click()
					.catch(() => {});
			}
			first = await Promise.race([
				btn
					.waitFor({ state: 'visible', timeout: 8_000 })
					.then(() => 'button')
					.catch(() => null),
				modeRow
					.waitFor({ state: 'visible', timeout: 8_000 })
					.then(() => 'mode')
					.catch(() => null),
				panel
					.locator('.agent-status')
					.waitFor({ state: 'visible', timeout: 8_000 })
					.then(() => 'warming')
					.catch(() => null)
			]);
			if (!first) {
				// Downloaded-but-idle state renders nothing in the chat area —
				// activation lives behind the gear.
				await panel
					.getByRole('button', { name: 'Agent settings' })
					.click()
					.catch(() => {});
				const gearUse = page
					.getByRole('dialog', { name: 'Agent settings' })
					.locator('.agent-model-tan')
					.getByRole('button', { name: /Use this model|Download · 760 MB/ });
				if (await gearUse.isVisible().catch(() => false)) {
					log('activating the default model from the gear settings');
					await gearUse.click();
					await page
						.getByRole('button', { name: 'Close settings' })
						.click()
						.catch(() => {});
					first = 'gear';
				} else {
					await page
						.getByRole('button', { name: 'Close settings' })
						.click()
						.catch(() => {});
					log(`panel content not visible yet (attempt ${attempt + 1}), retrying…`);
				}
			}
		}
		if (first === 'button') {
			log('clicking the LFM2.5 1.2B tile download button (q4f16)');
			await btn.click();
		} else if (first === 'warming') {
			log('slim status line visible — auto-warm in progress, no clicks needed');
		} else if (first === 'gear' || first === 'mode') {
			// nothing to do
		} else {
			throw new Error('Agent panel never reached a known model state');
		}

		log('waiting for the model to go live (download + load + warm-up probe)…');
		await modeRow.waitFor({ state: 'visible', timeout: 20 * 60_000 });
		const modeText = (await modeRow.textContent())?.trim();
		const setupSecs = ((Date.now() - downloadStart) / 1000).toFixed(0);
		log(`model live after ${setupSecs}s — mode row: "${modeText}"`);
		log(`observed from huggingface: ${(hfBytes / 1e6).toFixed(0)} MB across ${hfFiles.size} files`);
		log(`files: ${[...hfFiles].join(', ')}`);

		const device = await page.evaluate(() => window.__tvAgentDevice ?? null);
		const probeMs = await page.evaluate(() => window.__tvAgentProbeMs ?? null);
		log(`device: ${device} · warm-up probe: ${probeMs} ms`);

		// ── Ask the real question ──
		const question = 'What does chmod 755 mean?';
		log(`asking: "${question}"`);
		const input = page.getByLabel('Ask the agent');
		await input.fill(question);
		const t0 = Date.now();
		await input.press('Enter');

		const assistant = panel.locator('[data-role="assistant"]').last();
		await assistant.waitFor({ state: 'attached', timeout: 60_000 });

		// With "show, then explain" the model may pause at the approval gate
		// even on a plain question — approve anything it proposes while we
		// wait for the first visible content (TTFT) and the end of the turn.
		const gateCard = panel.locator('[data-testid="approval-card"]');
		const chatApprovals = [];
		const approveIfPending = async () => {
			if (!(await gateCard.isVisible().catch(() => false))) return false;
			const cmd = (
				await panel
					.locator('[data-testid="approval-cmd"]')
					.textContent()
					.catch(() => '')
			)?.trim();
			log(`approval card during chat: ${cmd} → ALLOW`);
			chatApprovals.push(cmd ?? '');
			await gateCard
				.getByRole('button', { name: /Allow/ })
				.click()
				.catch(() => {});
			await page.waitForTimeout(400);
			return true;
		};

		let ttftMs = -1;
		let ttStatusMs = -1;
		const statusLine = panel.locator('[data-testid="agent-activity"]');
		while (Date.now() - t0 < 10 * 60_000) {
			if (ttStatusMs < 0 && (await statusLine.isVisible().catch(() => false))) {
				ttStatusMs = Date.now() - t0;
			}
			if (await approveIfPending()) continue;
			const text = (await assistant.textContent().catch(() => '')) ?? '';
			if (text.trim().length > 0) {
				ttftMs = Date.now() - t0;
				break;
			}
			await page.waitForTimeout(100);
		}

		// Done when the send button returns (status left 'generating').
		const sendBack = panel.getByRole('button', { name: 'Send question' });
		while (Date.now() - t0 < 10 * 60_000) {
			if (await approveIfPending()) continue;
			if (await sendBack.isVisible().catch(() => false)) break;
			await page.waitForTimeout(300);
		}
		const totalMs = Date.now() - t0;

		const answer = (await assistant.textContent())?.trim() ?? '';
		const searches = await page.evaluate(() => window.__tvAgentSearches ?? []);
		const chars = answer.length;
		const genSecs = Math.max(0.001, (totalMs - ttftMs) / 1000);
		// The final answer streams to the UI after generation; approximate
		// throughput over the whole turn instead (chars/sec of wall time).
		const wallCps = (chars / (totalMs / 1000)).toFixed(1);

		log('──────── SMOKE RESULT ────────');
		log(`device:          ${device}`);
		log(`probe (tiny gen):${probeMs} ms`);
		log(`setup:           ${setupSecs}s (download+load+probe)`);
		log(`hf bytes:        ${(hfBytes / 1e6).toFixed(0)} MB`);
		log(`status visible:  ${ttStatusMs >= 0 ? (ttStatusMs / 1000).toFixed(2) + 's' : 'n/a'}`);
		log(`TTFT (visible):  ${(ttftMs / 1000).toFixed(1)}s`);
		log(`total turn:      ${(totalMs / 1000).toFixed(1)}s`);
		log(
			`answer chars:    ${chars} (~${wallCps} chars/s wall, stream window ${genSecs.toFixed(1)}s)`
		);
		log(
			`search_course:   ${searches.length ? `called with ${JSON.stringify(searches)}` : 'NOT called'}`
		);
		log(`bash during chat: ${chatApprovals.length ? JSON.stringify(chatApprovals) : 'none'}`);
		log(`answer: ${answer}`);
		log('──────────────────────────────');

		if (!answer) throw new Error('SMOKE FAIL: empty answer');
		if (!device) throw new Error('SMOKE FAIL: no device recorded');

		// ── The bash tool, live: THE metric behind the LFM swap. Run the
		//    file-creation ask three times plus one natural ask, approving
		//    every gated command, and report the tool-invocation rate. ──
		const sendBtn = panel.getByRole('button', { name: 'Send question' });
		const approvalCard = panel.locator('[data-testid="approval-card"]');
		const agentTerm = panel.locator('[data-testid="agent-terminal"]');
		const bashTasks = [
			"create a file called hello.txt containing hi, then show it's there",
			"create a file called hello2.txt containing hi, then show it's there",
			"create a file called hello3.txt containing hi, then show it's there",
			'show me how pipes work in your terminal'
		];
		const runs = [];
		for (const task of bashTasks) {
			log(`asking: "${task}"`);
			await sendBtn.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
			// Fresh conversation per run — a fair per-ask invocation measurement.
			await page.evaluate(() => window.__tvAgentClear?.());
			await page.waitForTimeout(300);
			await input.fill(task);
			await input.press('Enter');

			const approvals = [];
			const taskStart = Date.now();
			while (Date.now() - taskStart < 6 * 60_000) {
				if (await approvalCard.isVisible().catch(() => false)) {
					const cmd = (
						await panel
							.locator('[data-testid="approval-cmd"]')
							.textContent()
							.catch(() => '')
					)?.trim();
					log(`  approval card: ${cmd} → ALLOW`);
					approvals.push(cmd ?? '');
					await approvalCard
						.getByRole('button', { name: /Allow/ })
						.click()
						.catch(() => {});
					await page.waitForTimeout(400);
					continue;
				}
				if (await sendBtn.isVisible().catch(() => false)) break;
				await page.waitForTimeout(400);
			}
			const termText = (await agentTerm.textContent().catch(() => '')) ?? '';
			const answer =
				(await panel.locator('[data-role="assistant"]').last().textContent())?.trim() ?? '';
			runs.push({
				task,
				secs: ((Date.now() - taskStart) / 1000).toFixed(1),
				approvals,
				invoked: approvals.length > 0,
				termText,
				answer
			});
			log(
				`  → ${approvals.length} bash call(s) in ${((Date.now() - taskStart) / 1000).toFixed(0)}s`
			);
		}

		const invoked = runs.filter((r) => r.invoked).length;
		const fileRuns = runs.slice(0, 3);
		const fileInvoked = fileRuns.filter((r) => r.invoked).length;
		const lastTerm = runs[runs.length - 1].termText;

		log('──────── BASH TOOL RESULT ────────');
		log(
			`tool-invocation rate: ${invoked}/${runs.length} overall · ${fileInvoked}/3 on the file task`
		);
		for (const r of runs) {
			log(
				`  "${r.task.slice(0, 44)}…" → ${r.approvals.length} call(s) [${r.approvals.join(' ; ').slice(0, 120)}] in ${r.secs}s`
			);
		}
		log(`agent terminal: ${lastTerm ? 'visible' : 'ABSENT'}`);
		if (lastTerm) log(`terminal transcript: ${lastTerm.trim().replace(/\n/g, ' ⏎ ')}`);
		log(`last answer: ${runs[runs.length - 1].answer.slice(0, 400)}`);
		if (fileInvoked === 3 && /hello\.txt/.test(lastTerm)) {
			log('BASH TOOL: PASS — 3/3 invocation on the file task, hello.txt in the terminal');
		} else if (invoked > 0) {
			log(`BASH TOOL: PARTIAL — ${fileInvoked}/3 file-task invocation`);
		} else {
			log('BASH TOOL: model did not demonstrate via bash — noted for the report');
		}
		log('──────────────────────────────────');

		// ── Reload-without-redownload: the cache-persistence assertion. ──
		log('reloading the page — the model must come back WITHOUT re-downloading weights…');
		phase = 'reload';
		await page.reload();
		// SW/hydration churn after reload: retry the open until the panel reacts.
		for (let i = 0; i < 6; i++) {
			if ((await panel.getAttribute('aria-hidden').catch(() => 'true')) === 'false') break;
			await page
				.getByRole('button', { name: 'Open Agent' })
				.click({ timeout: 5000 })
				.catch(() => {});
			await page.waitForTimeout(1500);
		}
		const reloadLive = await modeRow
			.waitFor({ state: 'visible', timeout: 5 * 60_000 })
			.then(() => true)
			.catch(() => false);
		log('──────── CACHE RESULT ────────');
		log(`model live after reload: ${reloadLive}`);
		log(`.onnx network requests after reload: ${onnxAfterReload}`);
		if (!reloadLive) throw new Error('CACHE FAIL: model did not come back after reload');
		if (onnxAfterReload > 0) {
			throw new Error(
				`CACHE FAIL: ${onnxAfterReload} .onnx network request(s) after reload — weights re-downloaded`
			);
		}
		log('CACHE: PASS — reload served the weights from Cache Storage, zero .onnx fetches');
		log('──────────────────────────────');
		phase = 'done';

		// ── Optional: 2B multimodal prototype check ──
		if (CHECK_2B) {
			log('2B prototype check: watching which files the 2B init requests…');
			const page2 = await context.newPage();
			const files2 = new Map(); // file -> content-length
			page2.on('response', (res) => {
				const url = res.url();
				if (!/huggingface\.co|hf\.co|cdn-lfs/.test(url)) return;
				const file = url.split('?')[0].split('/').slice(-1)[0];
				files2.set(file, Number(res.headers()['content-length'] ?? 0));
			});
			await page2.goto(BASE);
			// Clear the remembered 0.8B so the offer card shows, then pick the 2B.
			await page2.evaluate(() => localStorage.removeItem('tv-agent-model'));
			await page2.reload();
			await page2.getByRole('button', { name: 'Open Agent' }).click();
			// The amber 2B card carries its own download button (disabled with a
			// reason when WebGPU is missing).
			await page2.getByRole('button', { name: 'Agent settings' }).click();
			const secondary = page2
				.locator('.agent-model-amber')
				.getByRole('button', { name: /Download · 1\.3 GB/ });
			await secondary.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
			if ((await secondary.isVisible().catch(() => false)) && (await secondary.isEnabled())) {
				await secondary.click();
				// Long enough for transformers.js to request every file it intends to.
				await page2.waitForTimeout(45_000);
				const names = [...files2.keys()];
				const vision = names.filter((n) => /vision/i.test(n));
				log(`2B requested files: ${names.join(', ') || '(none yet)'}`);
				log(
					vision.length
						? `2B CHECK: vision files WERE requested (${vision.join(', ')}) — text pipeline does NOT skip them`
						: '2B CHECK: no vision files requested — text-generation pipeline skips the vision encoder'
				);
			} else {
				log('2B CHECK: 2B download not offered/enabled (no WebGPU in this browser) — skipped');
			}
			await page2.close();
		}

		await context.close();
		log('smoke test PASSED');
	} finally {
		killServer();
	}
}

main().catch((e) => {
	console.error('[smoke] FAILED:', e);
	// Force-exit: a live playwright context would otherwise keep node alive.
	process.exit(1);
});
