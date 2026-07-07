import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine } from './git-engine';
import { runGitCommand } from './commands';
import { buildGitGraph } from './git-graph';
import { getScenario, loadScenarioSeed } from './scenarios';

let engine: GitEngine;

async function run(command: string) {
	return runGitCommand(engine, command);
}

async function seed(id: string) {
	await loadScenarioSeed(engine, getScenario(id));
}

beforeEach(() => {
	engine = new GitEngine('unit-test-graph');
});

describe('truthful commit graph', () => {
	it('draws the fork at the real fork point, not at main’s tip', async () => {
		await seed('rebase-merge'); // A,B shared → feature C,D · main E,F
		const graph = await buildGitGraph(engine);
		const lines = graph.split('\n').map((l) => l.trim());

		const branchIdx = lines.findIndex((l) => l === 'branch feature');
		const bIdx = lines.findIndex((l) => l.includes('B - shared history'));
		const eIdx = lines.findIndex((l) => l.includes('E - teammate'));
		// fork is created right after B (the true fork parent), before main's E/F
		expect(branchIdx).toBeGreaterThan(bIdx);
		expect(branchIdx).toBeLessThan(eIdx);
	});

	it('renders a real merge node when a merge commit exists', async () => {
		await seed('rebase-merge');
		await run('git merge main'); // merge main INTO feature
		const graph = await buildGitGraph(engine);
		expect(graph).toContain('merge main');
	});

	it('the resolved conflict scenario produces a merge node too', async () => {
		await seed('conflicts');
		await run("echo 'x = 10' > src/model.py");
		await run('git add src/model.py');
		await run('git commit -m "fix: resolve"');
		const graph = await buildGitGraph(engine);
		expect(graph).toContain('merge main');
	});

	it('tags decorate the tagged commit', async () => {
		await seed('release-tags');
		await run('git tag -a v1.1.0 -m "release"');
		const graph = await buildGitGraph(engine);
		expect(graph).toContain('tag: "v1.0.0"');
		expect(graph).toContain('tag: "v1.1.0"');
	});

	it('shows the remote-TRACKING position, not the true remote', async () => {
		await seed('sync-remote');
		const before = await buildGitGraph(engine);
		// Unfetched teammate commits must NOT appear
		expect(before).not.toContain('Teammate commit F');
		// The stale tracking pointer is visible as a label
		expect(before).toContain('origin/main');

		await run('git fetch origin');
		const after = await buildGitGraph(engine);
		expect(after).toContain('Teammate commit F');
	});

	it('merging a fetched origin/main draws a merge edge from its lane', async () => {
		await seed('sync-remote');
		await run('git fetch origin');
		await run('git merge origin/main');
		const graph = await buildGitGraph(engine);
		expect(graph).toContain('merge origin/main');
		// the teammate commits live on the origin/main lane, not the feature lane
		const lines = graph.split('\n').map((l) => l.trim());
		const laneIdx = lines.findIndex((l) => l === 'branch origin/main');
		expect(laneIdx).toBeGreaterThan(-1);
	});

	it('marks a detached HEAD', async () => {
		await seed('detached-head');
		await run('git checkout HEAD~2');
		const graph = await buildGitGraph(engine);
		expect(graph).toContain('tag: "HEAD"');
	});

	it('every emitted line is a structurally valid gitGraph statement', async () => {
		await seed('rebase-merge');
		await run('git merge main');
		await run('git switch main');
		await run('git tag -a v9 -m x');
		const graph = await buildGitGraph(engine);
		const [header, ...body] = graph.split('\n');
		expect(header).toBe('gitGraph');
		for (const line of body) {
			expect(line).toMatch(
				/^ {2}(commit id: ".+"( tag: ".+")?|branch \S+|checkout \S+|merge \S+( tag: ".+")?)$/
			);
		}
	});
});
