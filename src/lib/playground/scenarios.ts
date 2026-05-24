import type { RepoSeed, GitEngine } from './git-engine';
import { buildMergeConflictRepo, buildMergeRebaseRepo } from './seed-builders';

export interface PlaygroundScenario {
	id: string;
	title: string;
	description: string;
	hint: string;
	suggestedCommands: string[];
	seed?: RepoSeed;
	seedFn?: (engine: GitEngine) => Promise<void>;
}

export const playgroundScenarios: PlaygroundScenario[] = [
	{
		id: 'core-loop',
		title: 'AI changed 4 files',
		description: 'The AI modified three files and created one new file. Review and commit safely.',
		hint: 'Start with git status, stage what you trust, then commit.',
		suggestedCommands: [
			'git status',
			'git add src/auth.py src/routes.py',
			'git add .',
			'git commit -m "feat: Add user authentication"'
		],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [
						{ path: 'README.md', content: '# My App\n' },
						{ path: 'src/app.py', content: 'print("hello")\n' }
					]
				}
			],
			workingFiles: [
				{ path: 'src/auth.py', content: 'def authenticate(user):\n    return True\n' },
				{
					path: 'src/routes.py',
					content: 'from auth import authenticate\n\n@app.route("/login")\ndef login():\n    pass\n'
				},
				{ path: 'tests/test_auth.py', content: 'def test_auth():\n    assert True\n' },
				{ path: 'src/middleware.py', content: 'def middleware():\n    pass\n' }
			]
		}
	},
	{
		id: 'branching',
		title: 'Branch for AI experiment',
		description: 'Main is stable. Create a branch and commit AI work without touching main.',
		hint: 'Create a branch with git switch -c, then commit on it.',
		suggestedCommands: [
			'git log --oneline',
			'git switch -c feature/ai-experiment',
			'git add .',
			'git commit -m "feat: AI refactor attempt 1"'
		],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [{ path: 'src/main.py', content: 'def main():\n    pass\n' }]
				},
				{ message: 'Stable feature A', files: [{ path: 'src/main.py', content: 'def main():\n    run()\n' }] }
			],
			workingFiles: [
				{ path: 'src/main.py', content: 'def main():\n    run_ai_pipeline()\n' },
				{ path: 'src/utils.py', content: 'def helper():\n    return 42\n' }
			]
		}
	},
	{
		id: 'undo',
		title: 'Undo toolkit',
		description: 'AI made a mess. Practice restore, unstage, amend, and soft reset.',
		hint: 'Try git restore on one file, git restore --staged to unstage, or git reset --soft HEAD~1.',
		suggestedCommands: [
			'git status',
			'git restore src/model.py',
			'git restore --staged src/utils.py',
			'git reset --soft HEAD~1'
		],
		seed: {
			commits: [{ message: 'Initial commit', files: [{ path: 'src/model.py', content: 'v1\n' }] }],
			branches: [
				{
					name: 'feature/experiment',
					commits: [{ message: 'feat: experiment', files: [{ path: 'src/model.py', content: 'v2\n' }] }]
				}
			],
			branch: 'feature/experiment',
			workingFiles: [
				{ path: 'src/model.py', content: 'messed up by ai\n' },
				{ path: 'src/utils.py', content: 'bad ai output\n' },
				{ path: 'src/config.py', content: 'wrong config\n' }
			],
			stagedFiles: ['src/utils.py']
		}
	},
	{
		id: 'stash',
		title: 'Stash workflow',
		description: 'Uncommitted work on feature/A — stash it, switch branches, then pop the stash.',
		hint: 'Use git stash push -m "message", switch branches, then git stash pop.',
		suggestedCommands: [
			'git status',
			'git stash push -m "WIP: pipeline refactor"',
			'git switch main',
			'git switch -c hotfix/urgent-bug',
			'git stash pop'
		],
		seed: {
			commits: [{ message: 'Last commit on main', files: [{ path: 'src/app.py', content: 'stable\n' }] }],
			branches: [
				{
					name: 'feature/A',
					commits: [{ message: 'Start AI refactor', files: [{ path: 'src/pipeline.py', content: 'v1\n' }] }]
				}
			],
			branch: 'feature/A',
			workingFiles: [
				{ path: 'src/pipeline.py', content: 'wip pipeline changes\n' },
				{ path: 'src/transform.py', content: 'wip transform\n' },
				{ path: 'src/loader.py', content: 'wip loader\n' }
			]
		}
	},
	{
		id: 'rebase-merge',
		title: 'Merge vs rebase',
		description: 'Your feature branch diverged from main. Try git merge main or git rebase main.',
		hint: 'Run git log --oneline --all first, then merge or rebase.',
		suggestedCommands: ['git log --oneline --all', 'git merge main', 'git rebase main'],
		seedFn: buildMergeRebaseRepo
	},
	{
		id: 'conflicts',
		title: 'Merge conflict',
		description: 'A merge is in progress with a conflict in src/model.py. Resolve and commit.',
		hint: 'Check git status, fix src/model.py with echo, then git add and commit.',
		suggestedCommands: [
			'git status',
			"echo 'x = 10' > src/model.py",
			'git add src/model.py',
			'git commit -m "fix: Resolve merge conflict in model.py"'
		],
		seedFn: buildMergeConflictRepo
	},
	{
		id: 'clean-slate',
		title: 'Clean slate',
		description: 'Empty repo — practice any Git commands from scratch.',
		hint: 'Type help to see all supported commands.',
		suggestedCommands: ['git status', 'git branch', 'help'],
		seed: { commits: [] }
	}
];

/** Backward-compatible aliases for standalone playground */
export const scenarioAliases: Record<string, string> = {
	'ai-changes': 'core-loop',
	'branch-experiment': 'branching',
	'undo-mistake': 'undo'
};

export function getScenario(id: string): PlaygroundScenario {
	const resolved = scenarioAliases[id] ?? id;
	return playgroundScenarios.find((s) => s.id === resolved) ?? playgroundScenarios[0];
}

export async function loadScenarioSeed(engine: GitEngine, scenario: PlaygroundScenario): Promise<void> {
	if (scenario.seedFn) {
		await engine.resetWith(scenario.seedFn);
	} else {
		await engine.reset(scenario.seed);
	}
}

/** Lesson sections that embed the playground */
export const lessonScenarioIds = [
	'core-loop',
	'branching',
	'undo',
	'stash',
	'rebase-merge',
	'conflicts'
] as const;

export type LessonScenarioId = (typeof lessonScenarioIds)[number];

export function isLessonScenario(id: string): id is LessonScenarioId {
	return (lessonScenarioIds as readonly string[]).includes(id);
}
