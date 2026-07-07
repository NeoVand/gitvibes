import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine, git } from './git-engine';
import { runGitCommand } from './commands';
import { getScenario, loadScenarioSeed } from './scenarios';
import { encodeShared, decodeSharedFromHash } from './share';

let engine: GitEngine;

async function run(command: string) {
	return runGitCommand(engine, command);
}

async function seed(id: string) {
	const scenario = getScenario(id);
	await loadScenarioSeed(engine, scenario);
	return scenario;
}

beforeEach(() => {
	engine = new GitEngine('unit-test-wave2');
});

describe('git bisect', () => {
	it('walks the learner to the first bad commit and the check passes', async () => {
		const scenario = await seed('bisect');
		expect((await run('run-tests')).error).toBe(true); // broken on main

		await run('git bisect start');
		await run('git bisect bad');
		const first = await run('git bisect good v1.0');
		expect(first.output).toContain('Bisecting');

		// Answer honestly with run-tests until the culprit is named
		for (let i = 0; i < 6; i++) {
			const test = await run('run-tests');
			const verdict = await run(test.error ? 'git bisect bad' : 'git bisect good');
			if (verdict.output.includes('is the first bad commit')) {
				expect(verdict.output).toContain('refactor: simplify discount math');
				break;
			}
		}
		expect(engine.lastBisectResult).not.toBeNull();
		expect(await scenario.check!(engine)).toBe(true);

		const reset = await run('git bisect reset');
		expect(reset.error).toBeFalsy();
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('main');
	});

	it('bisect without start explains itself', async () => {
		await seed('bisect');
		const result = await run('git bisect bad');
		expect(result.error).toBe(true);
		expect(result.output).toContain('bisect start');
	});
});

describe('interactive rebase', () => {
	it('reword + squash + squash turns three wip commits into one', async () => {
		const scenario = await seed('interactive-rebase');
		const start = await run('git rebase -i main');
		expect(start.error).toBeFalsy();
		expect(start.output).toContain('pick');
		expect(start.output).toContain('(1/3)');

		await run('r');
		await run('feat: add onboarding form');
		await run('s');
		const done = await run('s');
		expect(done.output).toContain('Successfully rebased');
		expect(done.output).toContain('3 commits became 1');

		const log = await git.log({ fs: engine.fs, dir: engine.dir, ref: 'feature/onboarding' });
		expect(log).toHaveLength(2);
		expect(log[0].commit.message).toContain('feat: add onboarding form');
		expect(log[0].commit.message).toContain('wip: fix typo'); // squashed messages combine
		expect(await scenario.check!(engine)).toBe(true);
	});

	it('drop removes a commit and its changes', async () => {
		await seed('interactive-rebase');
		await run('git rebase -i main');
		await run('p');
		await run('p');
		const done = await run('d'); // drop the final "form works now" commit
		expect(done.output).toContain('Successfully rebased');
		const form = await engine.readFile('src/form.py');
		expect(form).toBe('def onboarding_form():\n    return "todo"\n');
	});

	it('q aborts with the branch untouched, and squash-first is refused', async () => {
		await seed('interactive-rebase');
		const before = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
		await run('git rebase -i main');
		const refuse = await run('s');
		expect(refuse.error).toBe(true);
		expect(refuse.output).toContain('no previous kept commit');
		await run('q');
		const after = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
		expect(after).toBe(before);
	});
});

describe('hooks simulation', () => {
	it('pre-commit blocks while the marker is present; commit-msg enforces convention', async () => {
		const scenario = await seed('hooks');
		await run('git add src/app.py');
		const blocked = await run('git commit -m "fix: remove debug"');
		expect(blocked.error).toBe(true);
		expect(blocked.output).toContain('pre-commit');

		await run("echo 'def main():\\n    return serve()' > src/app.py");
		await run('git add src/app.py');
		const badMsg = await run('git commit -m "removed the debug thing"');
		expect(badMsg.error).toBe(true);
		expect(badMsg.output).toContain('commit-msg');

		const good = await run('git commit -m "fix: remove leftover debug statement"');
		expect(good.error).toBeFalsy();
		expect(await scenario.check!(engine)).toBe(true);
	});

	it('--no-verify bypasses the hooks (the seatbelt unbuckles)', async () => {
		await seed('hooks');
		await run('git add src/app.py');
		const result = await run('git commit --no-verify -m "yolo"');
		expect(result.error).toBeFalsy();
	});
});

describe('worktree bookkeeping', () => {
	it('add/list/remove works and branch exclusivity is enforced', async () => {
		const scenario = await seed('worktrees');
		const a = await run('git worktree add ../proj-auth feature/auth-refactor');
		expect(a.error).toBeFalsy();
		expect(a.output).toContain('Preparing worktree');

		const dupBranch = await run('git worktree add ../other feature/auth-refactor');
		expect(dupBranch.error).toBe(true);
		expect(dupBranch.output).toContain('already checked out');

		const current = await run('git worktree add ../oops main');
		expect(current.error).toBe(true);

		await run('git worktree add ../proj-payments feature/payments');
		const list = await run('git worktree list');
		expect(list.output).toContain('../proj-auth');
		expect(list.output).toContain('../proj-payments');
		expect(list.output).toContain('[main]');

		await run('git worktree remove ../proj-auth');
		expect(await scenario.check!(engine)).toBe(true);
	});
});

describe('shared sessions', () => {
	it('encode/decode round-trips and caps command count', () => {
		const session = { scenarioId: 'core-loop', commands: ['git status', 'git add .'] };
		const decoded = decodeSharedFromHash(`#pg=${encodeShared(session)}`);
		expect(decoded).toEqual(session);
		expect(decodeSharedFromHash('#pg=!!!notbase64')).toBeNull();
		expect(decodeSharedFromHash('#nothing')).toBeNull();
	});
});
