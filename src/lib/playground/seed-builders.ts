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

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/ai-experiment', checkout: true });
	await engine.commitFiles('AI change', [{ path: 'src/model.py', content: 'x = 10\n# AI refactor\n' }]);

	await git.checkout({ fs: engine.fs, dir: engine.dir, ref: 'main' });
	await engine.commitFiles('Teammate change', [{ path: 'src/model.py', content: 'x = 5\n# teammate fix\n' }]);

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
			await engine.writeFile('src/model.py', '<<<<<<< HEAD\nx = 10\n# AI refactor\n=======\nx = 5\n# teammate fix\n>>>>>>> main\n');
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

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/sync-practice', checkout: true });
	await engine.commitFiles('My feature commit', [{ path: 'src/feature.py', content: 'my work\n' }]);
}

/** Undo toolkit with pushed bad commit for revert practice */
export async function buildUndoRepo(engine: GitEngine): Promise<void> {
	await engine.commitFiles('Initial commit', [{ path: 'src/model.py', content: 'v1\n' }]);

	await git.branch({ fs: engine.fs, dir: engine.dir, ref: 'feature/experiment', checkout: true });
	await engine.commitFiles('feat: experiment', [{ path: 'src/model.py', content: 'v2\n' }]);
	await engine.commitFiles('bad: broken AI refactor', [{ path: 'src/model.py', content: 'broken ai\n' }]);

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
	await engine.commitFiles('Initial commit', [{ path: 'src/main.py', content: 'def main():\n    pass\n' }]);
	await engine.commitFiles('Stable feature A', [{ path: 'src/main.py', content: 'def main():\n    run()\n' }]);

	const mainOid = await engine.getCommitOid('main', 0);
	engine.remote.setBranch('main', mainOid);
	await writeRemoteTrackingRef(engine, 'origin', 'main', mainOid);

	await engine.writeFile('src/main.py', 'def main():\n    run_ai_pipeline()\n');
	await engine.writeFile('src/utils.py', 'def helper():\n    return 42\n');
}
