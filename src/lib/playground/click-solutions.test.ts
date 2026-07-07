import { beforeEach, describe, expect, it } from 'vitest';
import { GitEngine } from './git-engine';
import { runGitCommand } from './commands';
import {
	getScenario,
	loadScenarioSeed,
	lessonScenarioIds,
	type LessonScenarioId
} from './scenarios';

/**
 * Every lesson scenario must be solvable by CLICKING alone: the "Try these"
 * chips fill the terminal input verbatim, so a complete solution path has to
 * exist inside suggestedCommands. Each path below (1) uses only chip strings —
 * asserted command-by-command — and (2) reaches the scenario's goal check.
 *
 * Some chips fail on purpose (teaching moments: the vetoed commit in hooks,
 * the rejected plain push in force-push, the third worktree in worktrees).
 * They stay in the path, and errors are tolerated exactly like a learner
 * clicking through them.
 */
const CLICK_PATHS: Record<LessonScenarioId, string[]> = {
	'core-loop': [
		'git status',
		'git diff',
		'git add src/auth.py',
		'git commit -m "feat: add user authentication"'
	],
	branching: [
		'git status',
		'git diff',
		'git switch -c feature/ai-experiment',
		'git add .',
		'git commit -m "feat: AI refactor attempt 1"',
		'git push -u origin feature/ai-experiment'
	],
	'sync-remote': [
		'git log --oneline --all',
		'git fetch origin',
		'git log --oneline --all',
		'git merge origin/main',
		'git log --oneline'
	],
	undo: [
		'git status',
		'git diff',
		'git restore src/model.py',
		'git restore --staged src/utils.py',
		'git log --oneline',
		'git revert HEAD'
	],
	stash: [
		'git status',
		'git stash push -u -m "WIP: pipeline refactor"',
		'git stash list',
		'git switch main',
		'git switch -c hotfix/urgent-bug',
		'git switch feature/A',
		'git stash pop'
	],
	// Exercises BOTH strategies: merge, back out, then rebase
	'rebase-merge': [
		'git log --oneline --all',
		'git merge main',
		'git log --oneline --all',
		'git reset --hard HEAD~1',
		'git rebase main'
	],
	conflicts: [
		'git status',
		'git diff',
		"echo 'x = 10' > src/model.py",
		'git add src/model.py',
		'git commit -m "fix: resolve merge conflict in model.py"'
	],
	'wrong-branch': [
		'git log --oneline',
		'git branch feature/payments',
		'git reset --hard HEAD~1',
		'git switch feature/payments',
		'git log --oneline'
	],
	'accidental-stage': [
		'git status',
		'git diff --staged',
		'cat .env',
		'git restore --staged .env',
		'git restore --staged src/debug.py',
		'git status',
		'git commit -m "feat: add server runner and new feature"'
	],
	// The plain push is rejected (non-fast-forward) — that's the lesson
	'force-push': [
		'git log --oneline',
		'git reset --hard HEAD~2',
		'git push origin feature/cleanup',
		'git push --force-with-lease origin feature/cleanup'
	],
	'reflog-rescue': [
		'git log --oneline',
		'git reflog',
		'git reset --hard HEAD@{1}',
		'git log --oneline'
	],
	// git rebase main pauses on the conflict (error result) — expected
	'rebase-conflict': [
		'git log --oneline --all',
		'git rebase main',
		'cat src/config.py',
		"echo 'TIMEOUT = 120' > src/config.py",
		'git add src/config.py',
		'git rebase --continue'
	],
	'cherry-pick': [
		'git log --oneline --all',
		'git cherry-pick experiment',
		'git log --oneline',
		'cat src/billing.py'
	],
	'detached-head': [
		'git log --oneline',
		'git checkout HEAD~2',
		'cat src/app.py',
		'git switch -c inspect-v02',
		'git switch main'
	],
	'release-tags': [
		'git log --oneline',
		'git tag -a v1.1.0 -m "Release: import support"',
		'git tag',
		'git log --oneline',
		'git show v1.1.0'
	],
	'interactive-rebase': [
		'git log --oneline',
		'git rebase -i main',
		'r',
		'feat: add onboarding form',
		's',
		's',
		'git log --oneline'
	],
	// The true search path over this seed: midpoints land on the culprit
	// (bad), then docs (good), then tidy (good) — both answer chips needed
	bisect: [
		'run-tests',
		'git bisect start',
		'git bisect bad',
		'git bisect good v1.0',
		'run-tests',
		'git bisect bad',
		'run-tests',
		'git bisect good',
		'run-tests',
		'git bisect good',
		'git bisect reset'
	],
	// The first commit attempt is vetoed by the pre-commit hook — the lesson
	hooks: [
		'git status',
		'cat .husky/pre-commit',
		'git add src/app.py',
		'git commit -m "remove debug"',
		"echo 'def main():\\n    return serve()' > src/app.py",
		'git add src/app.py',
		'git commit -m "fix: remove leftover debug statement"'
	],
	// The ../oops add is refused (branch exclusivity) — the lesson
	worktrees: [
		'git worktree add ../proj-auth feature/auth-refactor',
		'git worktree add ../proj-payments feature/payments',
		'git worktree list',
		'git worktree add ../oops main',
		'git worktree remove ../proj-auth',
		'git worktree list'
	],
	capstone: [
		'git status',
		'git log --oneline',
		'git restore --staged .env',
		'git branch feature/payments',
		'git reset --hard HEAD~1',
		'git tag -a v1.0.0 -m "First stable release"'
	]
};

let engine: GitEngine;

beforeEach(() => {
	engine = new GitEngine('unit-test-click');
});

describe('click-only solvability', () => {
	for (const id of lessonScenarioIds) {
		it(`${id}: the chips alone reach the goal`, async () => {
			const scenario = getScenario(id);
			expect(scenario.id).toBe(id);
			expect(scenario.check, `${id} must define a check`).toBeDefined();
			await loadScenarioSeed(engine, scenario);

			const path = CLICK_PATHS[id];
			const chips = new Set(scenario.suggestedCommands);
			for (const cmd of path) {
				expect(chips.has(cmd), `"${cmd}" is not a clickable chip of ${id}`).toBe(true);
			}

			for (const cmd of path) {
				await runGitCommand(engine, cmd).catch(() => {});
			}
			expect(await scenario.check!(engine)).toBe(true);
		});
	}
});
