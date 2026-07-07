import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine } from './git-engine';
import { runGitCommand } from './commands';
import { getScenario, loadScenarioSeed } from './scenarios';

let engine: GitEngine;

beforeEach(() => {
	engine = new GitEngine('unit-test-checks');
});

async function seed(id: string) {
	const scenario = getScenario(id);
	expect(scenario.id).toBe(id);
	await loadScenarioSeed(engine, scenario);
	return scenario;
}

async function run(commands: string[]) {
	for (const command of commands) {
		const result = await runGitCommand(engine, command);
		if (result.error) {
			throw new Error(`command failed: ${command}\n${result.output}`);
		}
	}
}

/**
 * For every lesson scenario: the check must be false on the fresh seed and
 * true after the intended solution — which also proves the solution path
 * itself works end to end in the engine.
 */
const CASES: { id: string; solution: string[] }[] = [
	{
		id: 'core-loop',
		solution: ['git add src/auth.py', 'git commit -m "feat: add user authentication"']
	},
	{
		id: 'branching',
		solution: [
			'git switch -c feature/ai-experiment',
			'git add .',
			'git commit -m "feat: AI refactor attempt 1"',
			'git push -u origin feature/ai-experiment'
		]
	},
	{
		id: 'sync-remote',
		solution: ['git fetch origin', 'git merge origin/main']
	},
	{
		id: 'undo',
		solution: ['git restore src/model.py', 'git restore --staged src/utils.py', 'git revert HEAD']
	},
	{
		id: 'stash',
		solution: [
			'git stash push -u -m "WIP: pipeline refactor"',
			'git switch main',
			'git switch -c hotfix/urgent-bug',
			'git switch feature/A',
			'git stash pop'
		]
	},
	{
		id: 'rebase-merge',
		solution: ['git merge main']
	},
	{
		id: 'conflicts',
		solution: [
			"echo 'x = 10' > src/model.py",
			'git add src/model.py',
			'git commit -m "fix: resolve merge conflict in model.py"'
		]
	},
	{
		id: 'wrong-branch',
		solution: ['git branch feature/payments', 'git reset --hard HEAD~1']
	},
	{
		id: 'accidental-stage',
		solution: [
			'git restore --staged .env',
			'git restore --staged src/debug.py',
			'git commit -m "feat: add server runner and new feature"'
		]
	},
	{
		id: 'force-push',
		solution: ['git reset --hard HEAD~2', 'git push --force-with-lease origin feature/cleanup']
	},
	{
		id: 'reflog-rescue',
		solution: ['git reset --hard HEAD@{1}']
	},
	{
		id: 'cherry-pick',
		solution: ['git cherry-pick experiment']
	},
	{
		id: 'detached-head',
		solution: ['git checkout HEAD~2', 'git switch -c inspect-v02']
	},
	{
		id: 'release-tags',
		solution: ['git tag -a v1.1.0 -m "Release: import support"']
	},
	{
		id: 'capstone',
		solution: [
			'git restore --staged .env',
			'git branch feature/payments',
			'git reset --hard HEAD~1',
			'git tag -a v1.0.0 -m "First stable release"'
		]
	}
];

describe('scenario success checks', () => {
	for (const { id, solution } of CASES) {
		it(`${id}: false on seed, true after the intended solution`, async () => {
			const scenario = await seed(id);
			expect(scenario.check, `${id} must define a check`).toBeDefined();
			expect(await scenario.check!(engine)).toBe(false);
			await run(solution);
			expect(await scenario.check!(engine)).toBe(true);
		});
	}

	it('rebase-conflict: resolving and continuing completes the check', async () => {
		const scenario = await seed('rebase-conflict');
		expect(await scenario.check!(engine)).toBe(false);
		const rebase = await runGitCommand(engine, 'git rebase main');
		expect(rebase.error).toBe(true); // pauses on the conflict
		await run([
			"echo 'TIMEOUT = 120' > src/config.py",
			'git add src/config.py',
			'git rebase --continue'
		]);
		expect(await scenario.check!(engine)).toBe(true);
	});

	it('capstone: leaking the secret onto the branch fails the check', async () => {
		const scenario = await seed('capstone');
		// Commit everything including the staged .env — the lazy path
		await run([
			'git commit -m "feat: everything"',
			'git branch feature/payments',
			'git reset --hard HEAD~1',
			'git tag -a v1.0.0 -m "release"'
		]);
		expect(await scenario.check!(engine)).toBe(false);
	});

	it('clean-slate has no check (free play)', async () => {
		const scenario = getScenario('clean-slate');
		expect(scenario.check).toBeUndefined();
	});
});
