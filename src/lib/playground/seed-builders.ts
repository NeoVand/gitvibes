import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';
import { writeRemoteTrackingRef } from './remote-state';

/** feature (C,D) diverged from main (E,F) after shared B */
export async function buildMergeRebaseRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('A - shared history', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('B - shared history', [{ path: 'src/app.py', content: 'base\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature', checkout: true });
	await engine.commitFiles('C - your work', [{ path: 'src/feature.py', content: 'feature c\n' }]);
	await engine.commitFiles('D - your work', [{ path: 'src/feature.py', content: 'feature d\n' }]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('E - teammate', [{ path: 'src/main.py', content: 'teammate e\n' }]);
	await engine.commitFiles('F - teammate', [{ path: 'src/main.py', content: 'teammate f\n' }]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature' });
}

/** feature branch mid-merge with conflict in src/model.py */
export async function buildMergeConflictRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'src/model.py', content: 'x = 1\n' }]);

	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'feature/ai-experiment',
		checkout: true
	});
	await engine.commitFiles('AI change', [
		{ path: 'src/model.py', content: 'x = 10\n# AI refactor\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('Teammate change', [
		{ path: 'src/model.py', content: 'x = 5\n# teammate fix\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature/ai-experiment' });

	try {
		await git.merge({
			fs: engine.fs,
			dir: engine.dir,
			ours: 'feature/ai-experiment',
			theirs: 'main',
			author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
		});
	} catch {
		const content = await engine.readFile('src/model.py');
		if (!content?.includes('<<<<<<<')) {
			await engine.writeFile(
				'src/model.py',
				'<<<<<<< HEAD\nx = 10\n# AI refactor\n=======\nx = 5\n# teammate fix\n>>>>>>> main\n'
			);
		}
	}
}

/** Local main behind origin/main; user on feature branch */
export async function buildSyncRemoteRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Shared history', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('Local main', [{ path: 'src/app.py', content: 'local main\n' }]);
	const localMainOid = await engine.getCommitOid('main', 0);

	await engine.commitFiles('Teammate commit E', [{ path: 'src/shared.py', content: 'e\n' }]);
	await engine.commitFiles('Teammate commit F', [{ path: 'src/shared.py', content: 'ef\n' }]);
	const remoteMainOid = await engine.getCommitOid('main', 0);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: localMainOid });
	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'main',
		object: localMainOid,
		checkout: true,
		force: true
	});

	engine.remote.setBranch('main', remoteMainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', localMainOid);

	await git.branch({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'feature/sync-practice',
		checkout: true
	});
	await engine.commitFiles('My feature commit', [{ path: 'src/feature.py', content: 'my work\n' }]);
}

/** Undo toolkit with pushed bad commit for revert practice */
export async function buildUndoRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'src/model.py', content: 'v1\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/experiment', checkout: true });
	await engine.commitFiles('feat: experiment', [{ path: 'src/model.py', content: 'v2\n' }]);
	await engine.commitFiles('bad: broken AI refactor', [
		{ path: 'src/model.py', content: 'broken ai\n' }
	]);

	const pushedOid = await engine.getCommitOid('feature/experiment', 0);
	engine.remote.setBranch('feature/experiment', pushedOid);
	engine.remote.upstream = 'feature/experiment';

	await engine.writeFile('src/model.py', 'messed up by ai\n');
	await engine.writeFile('src/utils.py', 'bad ai output\n');
	await engine.writeFile('src/config.py', 'wrong config\n');
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/utils.py' });
}

/** Branch ready to commit and push */
export async function buildBranchingRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/main.py', content: 'def main():\n    pass\n' }
	]);
	await engine.commitFiles('Stable feature A', [
		{ path: 'src/main.py', content: 'def main():\n    run()\n' }
	]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	await engine.writeFile('src/main.py', 'def main():\n    run_ai_pipeline()\n');
	await engine.writeFile('src/utils.py', 'def helper():\n    return 42\n');
}

/** Committed to wrong branch — need to move commit to a feature branch */
export async function buildWrongBranchRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('feat: Add user model', [
		{ path: 'src/models.py', content: 'class User:\n    pass\n' }
	]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	await engine.commitFiles('feat: Add payment processing', [
		{ path: 'src/payments.py', content: 'def process_payment():\n    return True\n' },
		{ path: 'src/billing.py', content: 'def create_invoice():\n    pass\n' }
	]);
}

/** Accidentally staged files that shouldn't be committed */
export async function buildAccidentalStageRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# My App\n' },
		{ path: 'src/app.py', content: 'def main():\n    pass\n' },
		{ path: '.env', content: 'SECRET_KEY=old_key\n' }
	]);

	await engine.writeFile('src/app.py', 'def main():\n    run_server()\n');
	await engine.writeFile('.env', 'SECRET_KEY=supersecret123\nDB_PASSWORD=admin\n');
	await engine.writeFile('src/debug.py', 'import pdb; pdb.set_trace()\n');
	await engine.writeFile('src/feature.py', 'def new_feature():\n    return True\n');

	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/app.py' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: '.env' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/debug.py' });
	await git.add({ fs: engine.fs, dir: engine.dir, filepath: 'src/feature.py' });
}

/** Diverged from remote — need to force push safely */
export async function buildForcePushRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# App\n' }]);
	await engine.commitFiles('feat: Add core logic', [{ path: 'src/core.py', content: 'v1\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/cleanup', checkout: true });
	await engine.commitFiles('bad: AI broke everything', [
		{ path: 'src/core.py', content: 'broken\n' }
	]);
	await engine.commitFiles('wip: trying to fix', [
		{ path: 'src/core.py', content: 'still broken\n' }
	]);

	const pushedOid = await engine.getCommitOid('feature/cleanup', 0);
	engine.remote.setBranch('feature/cleanup', pushedOid);
	engine.remote.upstream = 'feature/cleanup';
	await writeRemoteTrackingRef(engine, 'origin', 'feature/cleanup', pushedOid);
}

/** Three commits, then a disastrous reset --hard that "lost" two of them */
export async function buildReflogRescueRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'README.md', content: '# Search Service\n' }
	]);
	await engine.commitFiles('feat: add ranking algorithm', [
		{ path: 'src/ranking.py', content: 'def rank(results):\n    return sorted(results)\n' }
	]);
	await engine.commitFiles('feat: add caching layer', [
		{ path: 'src/cache.py', content: 'cache = {}\n' }
	]);

	// The "agent disaster": a hard reset two commits back
	const target = await engine.getCommitOid('main', 2);
	await git.writeRef({
		fs: engine.fs,
		dir: engine.dir,
		ref: 'refs/heads/main',
		value: target,
		force: true
	});
	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main', force: true });
	engine.recordReflog(target, 'reset: moving to HEAD~2 (--hard)');
}

/** feature branch diverged from main, both editing src/config.py */
export async function buildRebaseConflictRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/config.py', content: 'TIMEOUT = 30\nRETRIES = 3\n' }
	]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/tuning', checkout: true });
	await engine.commitFiles('feat: increase timeout for slow APIs', [
		{ path: 'src/config.py', content: 'TIMEOUT = 120\nRETRIES = 3\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('fix: lower timeout after load test', [
		{ path: 'src/config.py', content: 'TIMEOUT = 10\nRETRIES = 5\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'feature/tuning' });
}

/** experiment branch with one gem commit worth cherry-picking to main */
export async function buildCherryPickRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/billing.py', content: 'def total(items):\n    return sum(items)\n' }
	]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'experiment', checkout: true });
	await engine.commitFiles('wip: half-finished dashboard rewrite', [
		{ path: 'src/dashboard.py', content: '# TODO: everything\n' }
	]);
	await engine.commitFiles('fix: round currency to 2 decimal places', [
		{ path: 'src/billing.py', content: 'def total(items):\n    return round(sum(items), 2)\n' }
	]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
}

/** Linear history with a known-good older commit to explore */
export async function buildDetachedHeadRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [
		{ path: 'src/app.py', content: 'VERSION = "0.1"\n' }
	]);
	await engine.commitFiles('feat: version 0.2 — stable', [
		{ path: 'src/app.py', content: 'VERSION = "0.2"\n' }
	]);
	await engine.commitFiles('feat: version 0.3 — big refactor', [
		{ path: 'src/app.py', content: 'VERSION = "0.3"  # refactored\n' }
	]);
	await engine.commitFiles('feat: version 0.4 — experimental', [
		{ path: 'src/app.py', content: 'VERSION = "0.4"  # experimental\n' }
	]);
}

/** History ready for a release tag, with one previous release tagged */
export async function buildReleaseRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'README.md', content: '# CLI Tool\n' }]);
	await engine.commitFiles('feat: add export command', [
		{ path: 'src/export.py', content: 'def export():\n    pass\n' }
	]);
	const v1 = await engine.getCommitOid('main', 0);
	await git.tag({ fs: engine.fs, dir: engine.dir, ref: 'v1.0.0', object: v1 });
	await engine.commitFiles('feat: add import command', [
		{ path: 'src/import.py', content: 'def import_data():\n    pass\n' }
	]);
	await engine.commitFiles('fix: handle empty exports', [
		{ path: 'src/export.py', content: 'def export():\n    return []\n' }
	]);
}
