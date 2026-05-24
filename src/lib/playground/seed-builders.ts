import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

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

	const result = await git.merge({
		fs: engine.fs,
		dir: engine.dir,
		ours: 'feature/ai-experiment',
		theirs: 'main',
		author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
	});

	if (result?.alreadyMerged) {
		// force a conflict state by writing conflicting content if merge succeeded cleanly
		await engine.writeFile('src/model.py', '<<<<<<< HEAD\nx = 10\n=======\nx = 5\n>>>>>>> main\n');
	}
}
