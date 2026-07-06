import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine, git } from './git-engine';
import { runGitCommand } from './commands';

let engine: GitEngine;

async function run(command: string) {
	return runGitCommand(engine, command);
}

function stripTags(html: string): string {
	return html.replace(/<[^>]+>/g, '');
}

beforeEach(async () => {
	engine = new GitEngine('unit-test-advanced');
	await engine.reset({
		commits: [
			{
				message: 'Initial commit',
				files: [{ path: 'app.js', content: 'const a = 1;\nconst b = 2;\nconst c = 3;\n' }]
			},
			{
				message: 'Add readme',
				files: [{ path: 'README.md', content: '# Project\n' }]
			}
		]
	});
});

describe('git diff output format', () => {
	it('emits unified hunks with interleaved changes', async () => {
		await engine.writeFile('app.js', 'const a = 1;\nconst b = 99;\nconst c = 3;\n');
		const result = await run('git diff');
		const text = stripTags(result.output);
		expect(text).toContain('diff --git a/app.js b/app.js');
		expect(text).toContain('@@ -1,3 +1,3 @@');
		const lines = text.split('\n');
		const delIdx = lines.findIndex((l) => l.startsWith('-const b = 2;'));
		const addIdx = lines.findIndex((l) => l.startsWith('+const b = 99;'));
		expect(delIdx).toBeGreaterThan(0);
		expect(addIdx).toBe(delIdx + 1);
	});

	it('diff --staged shows index vs HEAD, not the working tree', async () => {
		await engine.writeFile('app.js', 'const a = 1;\nconst b = 99;\nconst c = 3;\n');
		await run('git add app.js');
		await engine.writeFile('app.js', 'const a = 1;\nconst b = 100;\nconst c = 3;\n');
		const staged = stripTags((await run('git diff --staged')).output);
		expect(staged).toContain('+const b = 99;');
		expect(staged).not.toContain('+const b = 100;');
		const unstaged = stripTags((await run('git diff')).output);
		expect(unstaged).toContain('-const b = 99;');
		expect(unstaged).toContain('+const b = 100;');
	});
});

describe('revision syntax', () => {
	it('resolves HEAD^ and HEAD~1 identically', async () => {
		expect(await engine.resolveRevision('HEAD^')).toBe(await engine.resolveRevision('HEAD~1'));
	});

	it('resolves HEAD@{n} through the reflog', async () => {
		const before = await engine.resolveRevision('HEAD');
		await engine.writeFile('x.txt', 'x');
		await run('git add . && git commit -m "third"');
		expect(await engine.resolveRevision('HEAD@{0}')).toBe(await engine.resolveRevision('HEAD'));
		expect(await engine.resolveRevision('HEAD@{1}')).toBe(before);
	});

	it('reset works with HEAD^', async () => {
		await run('git reset --hard HEAD^');
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(log).toHaveLength(1);
	});
});

describe('reflog and recovery', () => {
	it('records commits and resets, enabling recovery', async () => {
		const lostOid = await engine.resolveRevision('HEAD');
		await run('git reset --hard HEAD~1');
		const reflog = stripTags((await run('git reflog')).output);
		expect(reflog).toContain('reset: moving to HEAD~1');
		expect(reflog).toContain('commit: Add readme');

		await run(`git reset --hard ${lostOid.slice(0, 7)}`);
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(log[0].oid).toBe(lostOid);
	});
});

describe('git show', () => {
	it('shows the commit header, message, and diff', async () => {
		const result = await run('git show HEAD');
		const text = stripTags(result.output);
		expect(text).toContain('Author: Vibe Coder');
		expect(text).toContain('Add readme');
		expect(text).toContain('+# Project');
	});
});

describe('git tag', () => {
	it('creates, lists, decorates, and deletes tags', async () => {
		await run('git tag v1.0.0');
		expect((await run('git tag')).output).toContain('v1.0.0');
		const log = stripTags((await run('git log --oneline')).output);
		expect(log).toContain('tag: v1.0.0');
		const del = await run('git tag -d v1.0.0');
		expect(del.output).toContain("Deleted tag 'v1.0.0'");
		expect((await run('git tag')).output).toBe('');
	});

	it('creates annotated tags with a message', async () => {
		const result = await run('git tag -a v2.0.0 -m "Release two"');
		expect(result.error).toBeFalsy();
		expect((await run('git tag')).output).toContain('v2.0.0');
	});
});

describe('cherry-pick', () => {
	it('applies a commit from another branch', async () => {
		await run('git switch -c feature');
		await engine.writeFile('feature.txt', 'feature work\n');
		await run('git add . && git commit -m "feat: feature work"');
		await run('git switch main');
		const featureOid = await engine.resolveRevision('feature');
		const result = await run(`git cherry-pick ${featureOid.slice(0, 7)}`);
		expect(result.error).toBeFalsy();
		expect(result.output).toContain('feat: feature work');
		expect(await engine.readFile('feature.txt')).toBe('feature work\n');
	});

	it('pauses on conflict and supports --abort', async () => {
		await run('git switch -c feature');
		await engine.writeFile('README.md', '# Feature\n');
		await run('git add . && git commit -m "feature readme"');
		await run('git switch main');
		await engine.writeFile('README.md', '# Main\n');
		await run('git add . && git commit -m "main readme"');

		const result = await run('git cherry-pick feature');
		expect(result.error).toBe(true);
		expect(result.output).toContain('--continue');
		expect(engine.replayState?.kind).toBe('cherry-pick');

		const beforeAbort = await engine.resolveRevision('HEAD');
		const abort = await run('git cherry-pick --abort');
		expect(abort.error).toBeFalsy();
		expect(await engine.resolveRevision('HEAD')).toBe(beforeAbort);
		expect(engine.replayState).toBeNull();
	});
});

describe('rebase with conflicts', () => {
	async function divergedRepos() {
		await run('git switch -c feature');
		await engine.writeFile('README.md', '# Feature version\n');
		await run('git add . && git commit -m "feature readme"');
		await run('git switch main');
		await engine.writeFile('README.md', '# Main version\n');
		await run('git add . && git commit -m "main readme"');
		await run('git switch feature');
	}

	it('pauses on conflict, then --continue finishes the rebase', async () => {
		await divergedRepos();
		const result = await run('git rebase main');
		expect(result.error).toBe(true);
		expect(result.output).toContain('CONFLICT');
		expect(engine.replayState?.kind).toBe('rebase');

		await engine.writeFile('README.md', '# Merged version\n');
		await run('git add README.md');
		const cont = await run('git rebase --continue');
		expect(cont.error).toBeFalsy();
		expect(cont.output).toContain('Successfully rebased');
		expect(engine.replayState).toBeNull();

		const log = await git.log({ fs: engine.fs, dir: engine.dir, ref: 'feature' });
		expect(log.map((e) => e.commit.message.trim())).toContain('main readme');
		expect(log[0].commit.message.trim()).toBe('feature readme');
	});

	it('--abort restores the original branch tip', async () => {
		await divergedRepos();
		const before = await engine.resolveRevision('feature');
		await run('git rebase main');
		const abort = await run('git rebase --abort');
		expect(abort.error).toBeFalsy();
		expect(await engine.resolveRevision('feature')).toBe(before);
		expect(await engine.readFile('README.md')).toBe('# Feature version\n');
	});
});

describe('force-with-lease', () => {
	it('rejects when the remote moved since the last fetch', async () => {
		await run('git push -u origin main');
		// Someone else pushes: the remote moves without us fetching
		const strangerOid = await engine.resolveRevision('HEAD~1');
		engine.remote.setBranch('main', strangerOid);

		await run('git commit --amend -m "rewritten"');
		const lease = await run('git push --force-with-lease origin main');
		expect(lease.error).toBe(true);
		expect(lease.output).toContain('stale info');

		// After fetching, the lease is fresh and the push is allowed
		await run('git fetch origin');
		const retry = await run('git push --force-with-lease origin main');
		expect(retry.error).toBeFalsy();
	});
});

describe('status ahead/behind', () => {
	it('reports how far the branch is ahead of upstream', async () => {
		await run('git push -u origin main');
		await engine.writeFile('new.txt', 'new');
		await run('git add . && git commit -m "local work"');
		const status = stripTags((await run('git status')).output);
		expect(status).toContain("ahead of 'origin/main' by 1 commit");
	});
});

describe('detached HEAD and file checkout', () => {
	it('warns when checking out a commit directly', async () => {
		const oid = await engine.resolveRevision('HEAD~1');
		const result = await run(`git checkout ${oid.slice(0, 7)}`);
		expect(result.output).toContain('detached HEAD');
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBeUndefined();
	});

	it('restores a single file from another commit', async () => {
		await engine.writeFile('app.js', 'clobbered\n');
		await run('git add . && git commit -m "clobber app"');
		const result = await run('git checkout HEAD~1 -- app.js');
		expect(result.error).toBeFalsy();
		expect(await engine.readFile('app.js')).toBe('const a = 1;\nconst b = 2;\nconst c = 3;\n');
	});
});

describe('hunk-level add -p', () => {
	it('stages one hunk and leaves the other unstaged', async () => {
		const original = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n') + '\n';
		await engine.writeFile('big.txt', original);
		await run('git add big.txt && git commit -m "add big file"');

		const edited = original.replace('line 2', 'LINE 2').replace('line 27', 'LINE 27');
		await engine.writeFile('big.txt', edited);

		const start = await run('git add -p big.txt');
		expect(stripTags(start.output)).toContain('Stage this hunk');
		expect(stripTags(start.output)).toContain('+LINE 2');

		await run('y');
		const done = await run('n');
		expect(stripTags(done.output)).toContain('Done staging');

		const staged = stripTags((await run('git diff --staged')).output);
		expect(staged).toContain('+LINE 2\n');
		expect(staged).not.toContain('+LINE 27');
		const unstaged = stripTags((await run('git diff')).output);
		expect(unstaged).toContain('+LINE 27');
		expect(unstaged).not.toContain('+LINE 2\n');

		// The working tree keeps both edits
		const work = await engine.readFile('big.txt');
		expect(work).toContain('LINE 2');
		expect(work).toContain('LINE 27');
	});
});

describe('misc new commands', () => {
	it('supports glob pathspecs in add', async () => {
		await engine.writeFile('a.py', 'a');
		await engine.writeFile('b.py', 'b');
		await engine.writeFile('c.js', 'c');
		const result = await run('git add *.py');
		expect(result.error).toBeFalsy();
		const status = stripTags((await run('git status')).output);
		expect(status).toContain('a.py');
		expect(status).toContain('b.py');
		expect(status.split('Untracked')[1]).toContain('c.js');
	});

	it('git rm --cached untracks without deleting', async () => {
		const result = await run('git rm --cached README.md');
		expect(result.error).toBeFalsy();
		expect(await engine.readFile('README.md')).toBe('# Project\n');
		const status = stripTags((await run('git status')).output);
		expect(status).toContain('README.md');
	});

	it('branch -m renames the current branch', async () => {
		await run('git branch -m trunk');
		expect(await git.currentBranch({ fs: engine.fs, dir: engine.dir })).toBe('trunk');
	});

	it('log -n limits the output', async () => {
		const result = stripTags((await run('git log --oneline -n 1')).output);
		expect(result.trim().split('\n')).toHaveLength(1);
	});

	it('merge --abort returns to the pre-merge state', async () => {
		await run('git switch -c feature');
		await engine.writeFile('README.md', '# Feature\n');
		await run('git add . && git commit -m "feature readme"');
		await run('git switch main');
		await engine.writeFile('README.md', '# Main\n');
		await run('git add . && git commit -m "main readme"');
		const merge = await run('git merge feature');
		expect(merge.error).toBe(true);
		expect(merge.output).toContain('Merge conflict in README.md');
		const abort = await run('git merge --abort');
		expect(abort.error).toBeFalsy();
		expect(await engine.readFile('README.md')).toBe('# Main\n');
	});

	it('pull --rebase rebases onto the fetched branch', async () => {
		await run('git push -u origin main');
		// Remote gains a commit we don't have
		await engine.writeFile('remote-file.txt', 'from teammate\n');
		await run('git add . && git commit -m "teammate work"');
		await run('git push origin main');
		await run('git reset --hard HEAD~1');
		// Local diverges with different work
		await engine.writeFile('local.txt', 'local\n');
		await run('git add . && git commit -m "local work"');

		const result = await run('git pull --rebase origin main');
		expect(result.error).toBeFalsy();
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		const messages = log.map((e) => e.commit.message.trim());
		expect(messages[0]).toBe('local work');
		expect(messages).toContain('teammate work');
	});
});
