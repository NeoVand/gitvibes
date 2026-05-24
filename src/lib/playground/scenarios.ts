import type { RepoSeed, GitEngine } from './git-engine';
import {
	buildBranchingRepo,
	buildMergeConflictRepo,
	buildMergeRebaseRepo,
	buildSyncRemoteRepo,
	buildUndoRepo
} from './seed-builders';

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
		hint: 'Try git add -p to stage file-by-file, or git add on specific paths you trust.',
		suggestedCommands: [
			'git status',
			'git add -p',
			'y',
			'n',
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
		description: 'Main is stable. Create a branch, commit AI work, and push to origin.',
		hint: 'Create a branch, commit, then git push -u origin with your branch name.',
		suggestedCommands: [
			'git log --oneline',
			'git switch -c feature/ai-experiment',
			'git add .',
			'git commit -m "feat: AI refactor attempt 1"',
			'git push -u origin feature/ai-experiment'
		],
		seedFn: buildBranchingRepo
	},
	{
		id: 'sync-remote',
		title: 'Sync with teammates',
		description: 'Your feature branch is ready, but origin/main has new commits. Fetch and merge them.',
		hint: 'Use git fetch origin, then git merge origin/main — or git pull origin main in one step.',
		suggestedCommands: [
			'git fetch origin',
			'git log --oneline --all',
			'git merge origin/main'
		],
		seedFn: buildSyncRemoteRepo
	},
	{
		id: 'undo',
		title: 'Undo toolkit',
		description: 'AI made a mess. Practice restore, unstage, amend, soft reset, and revert.',
		hint: 'Try git revert HEAD for the pushed bad commit, or git commit --amend after staging a fix.',
		suggestedCommands: [
			'git status',
			'git restore src/model.py',
			'git log --oneline',
			'git revert HEAD',
			'git commit --amend -m "feat: experiment (fixed)"'
		],
		seedFn: buildUndoRepo
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
		hint: 'Use echo to write the resolved file, then git add and git commit.',
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
		description: 'Empty repo — type help to see all supported commands.',
		hint: 'Type help to see the full command list.',
		suggestedCommands: ['git status', 'git branch', 'help'],
		seed: { commits: [] }
	}
];

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

export const lessonScenarioIds = [
	'core-loop',
	'branching',
	'sync-remote',
	'undo',
	'stash',
	'rebase-merge',
	'conflicts'
] as const;

export type LessonScenarioId = (typeof lessonScenarioIds)[number];

export function isLessonScenario(id: string): id is LessonScenarioId {
	return (lessonScenarioIds as readonly string[]).includes(id);
}

export const PLAYGROUND_COMMANDS_HELP = `Supported commands:
  git status | git diff | git log [--oneline] [--all]
  git add <file> | git add . | git add -p [--patch]
  git commit -m "msg" | git commit --amend [--no-edit] [-m "msg"]
  git branch | git switch [-c] <branch> | git checkout [-b] <branch>
  git restore <file> | git restore --staged <file>
  git reset --soft|--mixed|--hard HEAD~N
  git merge <branch> | git rebase <branch>
  git stash push -m "msg" | git stash pop | git stash list
  git fetch origin | git pull origin <branch> | git push [-u] origin [branch]
  git remote -v | git revert <commit>
  echo "content" > file  (edit files / resolve conflicts)
  y | n | q | a  (responses during git add -p)

Other: clear, help`;
