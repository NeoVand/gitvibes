import { describe, expect, it } from 'vitest';
import { AGENT_REPO_SEED, createGitBridge, type TerminalLine } from './git-bridge';

describe('git bridge (gate → engine transcript)', () => {
	it('runs an approved command and records prompt + output lines', async () => {
		const lines: TerminalLine[] = [];
		const bridge = await createGitBridge({ onLine: (l) => lines.push(l) });

		const pending = bridge.propose('git status');
		expect(bridge.gate.pending).toBe('git status');
		bridge.gate.resolve('allow');
		const verdict = await pending;
		expect(verdict.decision).toBe('allow');

		const result = await bridge.run(verdict.cmd);
		expect(result.output).toContain('On branch main');
		expect(result.error).toBe(false);

		expect(lines[0]).toMatchObject({ type: 'input', text: 'git status', promptCwd: 'main' });
		expect(lines[1].type).toBe('output');
	});

	it('a denied proposal runs nothing — the transcript stays empty', async () => {
		const lines: TerminalLine[] = [];
		const bridge = await createGitBridge({ onLine: (l) => lines.push(l) });

		const pending = bridge.propose('git reset --hard HEAD~2');
		bridge.gate.resolve('deny', { reason: 'absolutely not' });
		const verdict = await pending;
		expect(verdict.decision).toBe('deny');
		expect(lines).toEqual([]);
	});

	it('edit rewrites the command before it reaches the engine', async () => {
		const lines: TerminalLine[] = [];
		const bridge = await createGitBridge({ onLine: (l) => lines.push(l) });

		const pending = bridge.propose('git log');
		bridge.gate.resolve('edit', { cmd: 'git log --oneline' });
		const verdict = await pending;
		await bridge.run(verdict.cmd);
		expect(lines[0].text).toBe('git log --oneline');
	});

	it('state persists across commands (a commit made stays made)', async () => {
		const bridge = await createGitBridge({});
		await bridge.run("echo 'demo' > demo.txt");
		await bridge.run('git add demo.txt');
		const commit = await bridge.run('git commit -m "feat: add demo file"');
		expect(commit.error).toBe(false);
		const { output } = await bridge.run('git log --oneline -n 1');
		expect(output).toContain('feat: add demo file');
	});

	it('command errors come back as error output, not exceptions', async () => {
		const bridge = await createGitBridge({});
		const result = await bridge.run('cat no-such-file.txt');
		expect(result.error).toBe(true);
		expect(result.output).toContain('No such file');
	});
});

describe('agent sandbox seed (demo-friendly repo)', () => {
	it('git status shows the seeded modified + untracked files', async () => {
		const bridge = await createGitBridge({});
		const { output, error } = await bridge.run('git status');
		expect(error).toBe(false);
		expect(output).toContain('src/greet.py');
		expect(output).toContain('notes.txt');
	});

	it('the seed rewards log and branch demos', async () => {
		const bridge = await createGitBridge({});
		const log = await bridge.run('git log --oneline');
		expect(log.output).toContain('fix: trim whitespace in names');
		const branches = await bridge.run('git branch');
		expect(branches.output).toContain('feature/ideas');
		expect(branches.output).toContain('main');
	});

	it('the seed itself stays small and on-message', () => {
		expect(AGENT_REPO_SEED.branch).toBe('main');
		expect(AGENT_REPO_SEED.commits.length).toBe(3);
		expect(AGENT_REPO_SEED.commits[1].message).toMatch(/^feat:/);
		expect(AGENT_REPO_SEED.commits[2].message).toMatch(/^fix:/);
		expect(AGENT_REPO_SEED.workingFiles?.map((f) => f.path)).toContain('notes.txt');
	});
});

describe('repo listing (system-prompt injection)', () => {
	it('reports branch, staged, modified, untracked, log, and branches', async () => {
		const bridge = await createGitBridge({});
		const listing = bridge.listing();
		expect(listing).toContain('branch: main');
		expect(listing).toContain('modified: src/greet.py');
		expect(listing).toContain('untracked: notes.txt');
		expect(listing).toContain('fix: trim whitespace in names');
		expect(listing).toContain('branches: ');
		expect(listing).toContain('feature/ideas');
	});

	it('stays fresh: the listing reflects the agent’s own commands', async () => {
		const bridge = await createGitBridge({});
		expect(bridge.listing()).toContain('untracked: notes.txt');
		await bridge.run('git add notes.txt');
		expect(bridge.listing()).toMatch(/staged: .*notes\.txt/);
		await bridge.run('git switch feature/ideas');
		expect(bridge.listing()).toContain('branch: feature/ideas');
	});
});
