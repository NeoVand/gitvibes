import { describe, expect, it } from 'vitest';
import { GitEngine, git } from './git-engine';

async function seededEngine(): Promise<GitEngine> {
	const engine = new GitEngine('unit-test');
	await engine.reset({
		commits: [
			{ message: 'Initial commit', files: [{ path: 'README.md', content: '# Hello\n' }] },
			{ message: 'Add app', files: [{ path: 'src/app.ts', content: 'export {};\n' }] }
		]
	});
	return engine;
}

describe('GitEngine', () => {
	it('seeds commits onto main', async () => {
		const engine = await seededEngine();
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(log.map((c) => c.commit.message.trim())).toEqual(['Add app', 'Initial commit']);
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('main');
	});

	it('seeds branches from a given commit', async () => {
		const engine = new GitEngine('unit-test');
		await engine.reset({
			commits: [{ message: 'one' }, { message: 'two' }],
			branches: [{ name: 'feature', atCommit: 1, commits: [{ message: 'feat work' }] }],
			branch: 'main'
		});
		const featureLog = await git.log({ fs: engine.fs, dir: engine.dir, ref: 'feature' });
		expect(featureLog.map((c) => c.commit.message.trim())).toEqual(['feat work', 'one']);
	});

	it('writes and reads working files, listing them recursively', async () => {
		const engine = await seededEngine();
		await engine.writeFile('deep/nested/file.txt', 'content');
		expect(await engine.readFile('deep/nested/file.txt')).toBe('content');
		expect(await engine.listWorkingFiles()).toContain('deep/nested/file.txt');
		expect(await engine.readFile('missing.txt')).toBeNull();
	});

	it('resolves HEAD and HEAD~n revisions', async () => {
		const engine = await seededEngine();
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(await engine.resolveHead('HEAD')).toBe(log[0].oid);
		expect(await engine.resolveHead('HEAD~1')).toBe(log[1].oid);
		await expect(engine.resolveHead('HEAD~5')).rejects.toThrow(/unknown revision/);
	});

	it('isolates state across resets', async () => {
		const engine = await seededEngine();
		await engine.writeFile('scratch.txt', 'temp');
		await engine.reset({ commits: [{ message: 'fresh start' }] });
		expect(await engine.readFile('scratch.txt')).toBeNull();
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(log).toHaveLength(1);
	});
});
