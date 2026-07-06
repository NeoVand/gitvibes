import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine, git } from './git-engine';
import { runGitCommand } from './commands';

let engine: GitEngine;

async function run(command: string) {
	return runGitCommand(engine, command);
}

async function currentLog(): Promise<string[]> {
	const log = await git.log({ fs: engine.fs, dir: engine.dir });
	return log.map((c) => c.commit.message.trim());
}

beforeEach(async () => {
	engine = new GitEngine('unit-test-commands');
	await engine.reset({
		commits: [
			{ message: 'Initial commit', files: [{ path: 'README.md', content: '# Project\n' }] },
			{ message: 'Add config', files: [{ path: 'config.json', content: '{}\n' }] }
		]
	});
});

describe('status, add, commit', () => {
	it('reports a clean tree, then untracked and staged files', async () => {
		const clean = await run('git status');
		expect(clean.output).toContain('working tree clean');

		await engine.writeFile('new-file.txt', 'hello');
		const dirty = await run('git status');
		expect(dirty.output).toContain('new-file.txt');
		expect(dirty.output).toContain('Untracked');

		await run('git add new-file.txt');
		const staged = await run('git status');
		expect(staged.output).toContain('to be committed');
	});

	it('commits staged changes and reports the branch and message', async () => {
		await engine.writeFile('new-file.txt', 'hello');
		await run('git add .');
		const result = await run('git commit -m "feat: add file"');
		expect(result.error).toBeFalsy();
		expect(result.output).toContain('[main');
		expect(result.output).toContain('feat: add file');
		expect(await currentLog()).toContain('feat: add file');
	});

	it('rejects a commit without a message', async () => {
		const result = await run('git commit');
		expect(result.error).toBe(true);
	});
});

describe('branching', () => {
	it('creates and switches branches with switch -c', async () => {
		const result = await run('git switch -c feature/test');
		expect(result.output).toContain("Switched to a new branch 'feature/test'");
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('feature/test');
	});

	it('lists branches with the current one marked', async () => {
		await run('git switch -c feature/test');
		const result = await run('git branch');
		expect(result.output).toContain('* feature/test');
		expect(result.output).toContain('main');
	});

	it('supports checkout -b as well', async () => {
		await run('git checkout -b hotfix');
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('hotfix');
	});
});

describe('reset and revert', () => {
	it('reset --soft keeps changes staged', async () => {
		await run('git reset --soft HEAD~1');
		expect(await currentLog()).toEqual(['Initial commit']);
		const status = await run('git status');
		expect(status.output).toContain('to be committed');
	});

	it('reset --hard discards the commit and its files', async () => {
		await run('git reset --hard HEAD~1');
		expect(await currentLog()).toEqual(['Initial commit']);
		expect(await engine.readFile('config.json')).toBeNull();
		const status = await run('git status');
		expect(status.output).toContain('working tree clean');
	});

	it('reset moves the branch ref instead of detaching HEAD', async () => {
		await run('git reset --hard HEAD~1');
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('main');
		const branchOid = await git.resolveRef({
			fs: engine.fs,
			dir: engine.dir,
			ref: 'refs/heads/main'
		});
		const headOid = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
		expect(branchOid).toBe(headOid);

		await engine.writeFile('after-reset.txt', 'still on main');
		await run('git add . && git commit -m "after reset"');
		const newBranchOid = await git.resolveRef({
			fs: engine.fs,
			dir: engine.dir,
			ref: 'refs/heads/main'
		});
		const log = await git.log({ fs: engine.fs, dir: engine.dir, ref: 'main' });
		expect(newBranchOid).toBe(log[0].oid);
		expect(log[0].commit.message.trim()).toBe('after reset');
	});

	it('revert creates a new commit that undoes the target', async () => {
		const result = await run('git revert HEAD');
		expect(result.error).toBeFalsy();
		const log = await currentLog();
		expect(log).toHaveLength(3);
		expect(await engine.readFile('config.json')).toBeNull();
	});
});

describe('merge', () => {
	it('fast-forwards when possible', async () => {
		await run('git switch -c feature');
		await engine.writeFile('feature.txt', 'work');
		await run('git add . && git commit -m "feature work"');
		await run('git switch main');
		const result = await run('git merge feature');
		expect(result.output).toContain('Fast-forward');
		expect(await currentLog()).toContain('feature work');
	});

	it('reports a conflict when both branches touch the same lines', async () => {
		await run('git switch -c feature');
		await engine.writeFile('README.md', '# Feature version\n');
		await run('git add . && git commit -m "feature readme"');
		await run('git switch main');
		await engine.writeFile('README.md', '# Main version\n');
		await run('git add . && git commit -m "main readme"');
		const result = await run('git merge feature');
		expect(result.error).toBe(true);
		expect(result.output).toContain('CONFLICT');
	});
});

describe('remote operations', () => {
	it('push -u publishes the branch and sets upstream', async () => {
		await run('git switch -c feature/push-test');
		await engine.writeFile('x.txt', 'x');
		await run('git add . && git commit -m "x"');
		const result = await run('git push -u origin feature/push-test');
		expect(result.output).toContain('set up to track');
		expect(engine.remote.getBranch('feature/push-test')).toBeTruthy();
	});

	it('rejects a non-fast-forward push and accepts --force', async () => {
		await run('git push -u origin main');
		await run('git reset --hard HEAD~1');
		await engine.writeFile('other.txt', 'diverged');
		await run('git add . && git commit -m "diverged"');

		const rejected = await run('git push origin main');
		expect(rejected.error).toBe(true);
		expect(rejected.output).toContain('rejected');

		const forced = await run('git push --force origin main');
		expect(forced.error).toBeFalsy();
	});
});

describe('stash', () => {
	it('stashes and restores working changes', async () => {
		await engine.writeFile('README.md', '# WIP\n');
		const saved = await run('git stash push -m "WIP notes"');
		expect(saved.output).toContain('Saved working directory');
		expect(await engine.readFile('README.md')).toBe('# Project\n');

		const list = await run('git stash list');
		expect(list.output).toContain('stash@{0}');

		await run('git stash pop');
		expect(await engine.readFile('README.md')).toBe('# WIP\n');
	});
});

describe('shell conveniences', () => {
	it('chains commands with &&', async () => {
		await engine.writeFile('a.txt', 'a');
		const result = await run('git add . && git commit -m "chained"');
		expect(await currentLog()).toContain('chained');
		expect(result.error).toBeFalsy();
	});

	it('supports echo redirection, cat, and ls', async () => {
		await run('echo "hello world" > note.txt');
		const cat = await run('cat note.txt');
		expect(cat.output).toContain('hello world');
		const ls = await run('ls');
		expect(ls.output).toContain('note.txt');
	});

	it('errors honestly on unsupported git subcommands and unknown commands', async () => {
		const unsupported = await run('git bisect start');
		expect(unsupported.error).toBe(true);
		expect(unsupported.output).toContain('not supported');

		const unknown = await run('rm -rf /');
		expect(unknown.error).toBe(true);
	});
});
