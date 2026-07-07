import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine, git } from './git-engine';
import { runGitCommand } from './commands';
import {
	buildDetachedHeadRepo,
	buildForcePushRepo,
	buildMergeConflictRepo,
	buildReleaseRepo,
	buildSyncRemoteRepo
} from './seed-builders';

let engine: GitEngine;

async function run(command: string) {
	return runGitCommand(engine, command);
}

beforeEach(async () => {
	engine = new GitEngine('unit-test-fixes');
	await engine.reset({
		commits: [
			{ message: 'Initial commit', files: [{ path: 'README.md', content: '# Project\n' }] },
			{ message: 'Add config', files: [{ path: 'config.json', content: '{}\n' }] }
		]
	});
});

describe('reset semantics', () => {
	it('bare git reset --hard resets to HEAD, keeping the last commit', async () => {
		await engine.writeFile('README.md', 'scribbles\n');
		const result = await run('git reset --hard');
		expect(result.error).toBeFalsy();
		const log = await git.log({ fs: engine.fs, dir: engine.dir });
		expect(log).toHaveLength(2); // no commit deleted
		expect(await engine.readFile('README.md')).toBe('# Project\n'); // tree cleaned
	});

	it('git reset HEAD <file> unstages only that file', async () => {
		await engine.writeFile('a.txt', 'a\n');
		await engine.writeFile('b.txt', 'b\n');
		await run('git add a.txt b.txt');
		const result = await run('git reset HEAD a.txt');
		expect(result.error).toBeFalsy();
		const status = await run('git status');
		// a.txt back to untracked, b.txt still staged
		expect(status.output).toContain('Untracked');
		expect(status.output).toContain('a.txt');
		expect(status.output).toContain('to be committed');
		expect(status.output).toContain('b.txt');
	});

	it('git reset <file> works without naming HEAD', async () => {
		await engine.writeFile('a.txt', 'a\n');
		await run('git add a.txt');
		const result = await run('git reset a.txt');
		expect(result.error).toBeFalsy();
		const status = await run('git status');
		expect(status.output).toContain('Untracked');
	});
});

describe('branch creation with a start point', () => {
	it('git switch -c <name> <hash> creates the branch AT the hash with the right name', async () => {
		const firstOid = await engine.getCommitOid('main', 1);
		const result = await run(`git switch -c rescue ${firstOid.slice(0, 7)}`);
		expect(result.error).toBeFalsy();
		expect(result.output).toContain("Switched to a new branch 'rescue'");
		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		expect(branches).toContain('rescue');
		expect(branches).not.toContain(firstOid.slice(0, 7));
		const tip = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'refs/heads/rescue' });
		expect(tip).toBe(firstOid);
	});

	it('git branch <name> <start> honors the start point', async () => {
		const firstOid = await engine.getCommitOid('main', 1);
		await run(`git branch old-state ${firstOid.slice(0, 7)}`);
		const tip = await git.resolveRef({
			fs: engine.fs,
			dir: engine.dir,
			ref: 'refs/heads/old-state'
		});
		expect(tip).toBe(firstOid);
	});

	it('strips quotes from branch names', async () => {
		const result = await run('git switch -c "fix/quoted"');
		expect(result.error).toBeFalsy();
		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		expect(branches).toContain('fix/quoted');
	});

	it('git switch - returns to the previous branch', async () => {
		await run('git switch -c feature/one');
		await run('git switch main');
		const result = await run('git switch -');
		expect(result.output).toContain("Switched to branch 'feature/one'");
	});
});

describe('commit -a and stash', () => {
	it('git commit -am stages tracked changes and commits', async () => {
		await engine.writeFile('README.md', 'updated\n');
		const result = await run('git commit -am "fix: update readme"');
		expect(result.error).toBeFalsy();
		expect(result.output).toContain('fix: update readme');
		const status = await run('git status');
		expect(status.output).toContain('working tree clean');
	});

	it('commit -a does not sweep in untracked files', async () => {
		await engine.writeFile('README.md', 'updated\n');
		await engine.writeFile('scratch.txt', 'untracked\n');
		await run('git commit -am "fix: update readme"');
		const status = await run('git status');
		expect(status.output).toContain('scratch.txt');
		expect(status.output).toContain('Untracked');
	});

	it('bare git stash and git stash pop round-trip', async () => {
		await engine.writeFile('README.md', 'wip\n');
		const stash = await run('git stash');
		expect(stash.error).toBeFalsy();
		expect(await engine.readFile('README.md')).toBe('# Project\n');
		const pop = await run('git stash pop');
		expect(pop.error).toBeFalsy();
		expect(await engine.readFile('README.md')).toBe('wip\n');
	});

	it('stash pop with nothing stashed fails helpfully, not with a raw error', async () => {
		const result = await run('git stash pop');
		expect(result.error).toBe(true);
		expect(result.output).toContain('stash@{0}');
	});
});

describe('add flags', () => {
	it('git add -u stages tracked modifications but not untracked files', async () => {
		await engine.writeFile('README.md', 'modified\n');
		await engine.writeFile('brand-new.txt', 'new\n');
		const result = await run('git add -u');
		expect(result.error).toBeFalsy();
		const status = await run('git status');
		expect(status.output).toContain('to be committed');
		expect(status.output).toContain('README.md');
		expect(status.output).toContain('Untracked');
		expect(status.output).toContain('brand-new.txt');
	});

	it('flag-only add with nothing recognized errors instead of silently succeeding', async () => {
		const result = await run('git add -x');
		expect(result.error).toBe(true);
		expect(result.output).toContain('Nothing specified');
	});
});

describe('restore and checkout --', () => {
	it('git restore --staged . unstages everything', async () => {
		await engine.writeFile('a.txt', 'a\n');
		await engine.writeFile('b.txt', 'b\n');
		await run('git add .');
		const result = await run('git restore --staged .');
		expect(result.error).toBeFalsy();
		const status = await run('git status');
		expect(status.output).not.toContain('to be committed');
	});

	it('git checkout -- <file> restores the working tree from the index', async () => {
		await engine.writeFile('README.md', 'staged version\n');
		await run('git add README.md');
		await engine.writeFile('README.md', 'newer scribbles\n');
		const result = await run('git checkout -- README.md');
		expect(result.error).toBeFalsy();
		expect(await engine.readFile('README.md')).toBe('staged version\n');
	});
});

describe('remote honesty (tracking refs, not the true remote)', () => {
	beforeEach(async () => {
		await engine.resetWith(buildSyncRemoteRepo);
	});

	it('git log --all hides unfetched remote commits until git fetch', async () => {
		const before = await run('git log --oneline --all');
		expect(before.output).not.toContain('Teammate commit F');
		const fetch = await run('git fetch origin');
		expect(fetch.output).toContain('From');
		const after = await run('git log --oneline --all');
		expect(after.output).toContain('Teammate commit F');
	});

	it('merging origin/main twice is idempotent, not an AlreadyExists crash', async () => {
		await run('git fetch origin');
		await run('git merge origin/main');
		const second = await run('git merge origin/main');
		expect(second.error).toBeFalsy();
		expect(second.output).toContain('Already up to date');
		// and no phantom local branch named origin/main
		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		expect(branches).not.toContain('origin/main');
	});

	it('fetch --prune does not invent a remote named --prune', async () => {
		const result = await run('git fetch --prune');
		expect(result.error).toBeFalsy();
		const tracking = await git.listBranches({ fs: engine.fs, dir: engine.dir, remote: 'origin' });
		expect(tracking).toContain('main');
		const bogus = await git
			.listBranches({ fs: engine.fs, dir: engine.dir, remote: '--prune' })
			.catch(() => []);
		expect(bogus).toHaveLength(0);
	});
});

describe('merge conflict lifecycle', () => {
	beforeEach(async () => {
		await engine.resetWith(buildMergeConflictRepo);
	});

	it('status reports unmerged paths during the conflict', async () => {
		const status = await run('git status');
		expect(status.output).toContain('Unmerged paths');
		expect(status.output).toContain('src/model.py');
	});

	it('the ours marker reads HEAD, exactly as lesson 5.3 teaches', async () => {
		const content = await engine.readFile('src/model.py');
		expect(content).toContain('<<<<<<< HEAD');
		expect(content).toContain('>>>>>>> main');
	});

	it('commit is blocked until the conflict is staged', async () => {
		const blocked = await run('git commit -m "too early"');
		expect(blocked.error).toBe(true);
		expect(blocked.output).toContain('unmerged files');
	});

	it('the resolution commit has two parents and ends the merge', async () => {
		await engine.writeFile('src/model.py', 'x = 10\n');
		await run('git add src/model.py');
		const commit = await run('git commit -m "fix: resolve conflict"');
		expect(commit.error).toBeFalsy();
		const head = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
		const { commit: c } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid: head });
		expect(c.parent).toHaveLength(2);
		// merge is over: --abort must now refuse instead of rewinding history
		const abort = await run('git merge --abort');
		expect(abort.error).toBe(true);
		expect(abort.output).toContain('no merge to abort');
	});

	it('merge --abort during the conflict restores the pre-merge state', async () => {
		const abort = await run('git merge --abort');
		expect(abort.error).toBeFalsy();
		expect(await engine.readFile('src/model.py')).toBe('x = 10\n# AI refactor\n');
		const status = await run('git status');
		expect(status.output).toContain('working tree clean');
	});
});

describe('detached HEAD', () => {
	beforeEach(async () => {
		await engine.resetWith(buildDetachedHeadRepo);
	});

	it('status says detached, log walks from HEAD (not main)', async () => {
		await run('git checkout HEAD~2');
		const status = await run('git status');
		expect(status.output).toContain('HEAD detached at');
		expect(status.output).not.toContain('On branch HEAD');
		const log = await run('git log --oneline');
		expect(log.output).toContain('version 0.2');
		expect(log.output).not.toContain('version 0.4');
	});
});

describe('tags', () => {
	beforeEach(async () => {
		await engine.resetWith(buildReleaseRepo);
	});

	it('annotated tags decorate the log at the tagged commit', async () => {
		await run('git tag -a v1.1.0 -m "Release"');
		const log = await run('git log --oneline');
		expect(log.output).toContain('tag: v1.1.0');
	});

	it('git push origin <tag> pushes the tag, and --tags pushes them all', async () => {
		await run('git tag -a v1.1.0 -m "Release"');
		const single = await run('git push origin v1.1.0');
		expect(single.error).toBeFalsy();
		expect(single.output).toContain('[new tag]');
		expect(engine.remote.tags.has('v1.1.0')).toBe(true);
		const all = await run('git push origin --tags');
		expect(all.error).toBeFalsy();
		expect(engine.remote.tags.has('v1.0.0')).toBe(true);
	});
});

describe('force push lease with the new suggested flow', () => {
	beforeEach(async () => {
		await engine.resetWith(buildForcePushRepo);
	});

	it('plain push is rejected after a reset, force-with-lease succeeds', async () => {
		await run('git reset --hard HEAD~2');
		const plain = await run('git push origin feature/cleanup');
		expect(plain.error).toBe(true);
		expect(plain.output).toContain('non-fast-forward');
		const lease = await run('git push --force-with-lease origin feature/cleanup');
		expect(lease.error).toBeFalsy();
		expect(lease.output).toContain('force-with-lease');
	});
});

describe('revert guards', () => {
	it('reverts HEAD~1 via real revision syntax when files are untouched since', async () => {
		await engine.writeFile('feature.txt', 'v1\n');
		await run('git add . && git commit -m "feat: feature"');
		await engine.writeFile('other.txt', 'x\n');
		await run('git add other.txt && git commit -m "feat: other"');
		const result = await run('git revert HEAD~1');
		expect(result.error).toBeFalsy();
		expect(result.output).toContain('Revert');
		expect(await engine.readFile('feature.txt')).toBeNull();
	});

	it('refuses to clobber uncommitted changes', async () => {
		// HEAD ('Add config') touches config.json — dirty it, then revert HEAD
		await engine.writeFile('config.json', '{"dirty":true}\n');
		const result = await run('git revert HEAD');
		expect(result.error).toBe(true);
		expect(result.output).toContain('local changes');
	});

	it('refuses when a later commit changed the same file', async () => {
		await engine.writeFile('config.json', '{"v":2}\n');
		await run('git add . && git commit -m "feat: v2"');
		// Reverting the older config commit would clobber v2
		const result = await run('git revert HEAD~1');
		expect(result.error).toBe(true);
		expect(result.output).toContain('changed in a later commit');
	});
});

describe('teaching messages and misc', () => {
	it('git rebase -i opens the interactive session (q aborts cleanly)', async () => {
		const start = await run('git rebase -i HEAD~1');
		expect(start.error).toBeFalsy();
		expect(start.output).toContain('Interactive rebase');
		const quit = await run('q');
		expect(quit.output).toContain('aborted');
	});

	it('cherry-pick ranges explain the a..b exclusivity gotcha', async () => {
		const result = await run('git cherry-pick abc123..def456');
		expect(result.error).toBe(true);
		expect(result.output).toContain('EXCLUDES');
	});

	it('git help works like help', async () => {
		const result = await run('git help');
		expect(result.error).toBeFalsy();
		expect(result.output).toContain('Supported commands');
	});

	it('git clean -n previews without deleting', async () => {
		await engine.writeFile('junk.txt', 'x\n');
		const dry = await run('git clean -n');
		expect(dry.output).toContain('Would remove junk.txt');
		expect(await engine.readFile('junk.txt')).toBe('x\n');
		await run('git clean -fd');
		expect(await engine.readFile('junk.txt')).toBeNull();
	});

	it('git diff --stat summarizes and git diff a..b compares revisions', async () => {
		await engine.writeFile('README.md', '# Project\nmore\n');
		await run('git add . && git commit -m "docs: expand readme"');
		const between = await run('git diff HEAD~1..HEAD');
		expect(between.output).toContain('README.md');
		expect(between.output).toContain('+more');
		const stat = await run('git diff --stat HEAD~1..HEAD');
		expect(stat.output).toContain('1 file changed');
		expect(stat.output).toContain('1 insertion');
	});

	it('git log <ref> starts the walk at that ref', async () => {
		await run('git switch -c feature/log-test');
		await engine.writeFile('extra.txt', 'x\n');
		await run('git add . && git commit -m "feat: extra"');
		const log = await run('git log --oneline main');
		expect(log.output).not.toContain('feat: extra');
		expect(log.output).toContain('Add config');
	});
});
