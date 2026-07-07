import type { RepoSeed, GitEngine } from './git-engine';
import {
	buildBranchingRepo,
	buildCherryPickRepo,
	buildDetachedHeadRepo,
	buildMergeConflictRepo,
	buildMergeRebaseRepo,
	buildRebaseConflictRepo,
	buildReflogRescueRepo,
	buildReleaseRepo,
	buildSyncRemoteRepo,
	buildUndoRepo,
	buildWrongBranchRepo,
	buildAccidentalStageRepo,
	buildForcePushRepo
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
		title: 'AI changed 4 files — review before commit',
		description:
			"Your AI assistant just modified three files and created one new file. Don't blindly git add . — review each change and stage only what you trust.",
		hint: 'Start with git status, then git diff to see what changed. Use git add -p to review hunks interactively, or git add <file> to stage specific files you trust.',
		suggestedCommands: [
			'git status',
			'git diff',
			'git add -p',
			'y',
			'n',
			'git add src/auth.py',
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
		title: 'Isolate AI work on a branch',
		description:
			'Main is stable and pushed. Your AI just generated new code in the working directory. Create a branch to isolate the experiment before committing.',
		hint: 'Always branch before committing AI work. Use git switch -c <name> to create and switch, then stage, commit, and push with -u to set upstream tracking.',
		suggestedCommands: [
			'git status',
			'git diff',
			'git switch -c feature/ai-experiment',
			'git add .',
			'git commit -m "feat: AI refactor attempt 1"',
			'git push -u origin feature/ai-experiment'
		],
		seedFn: buildBranchingRepo
	},
	{
		id: 'sync-remote',
		title: 'Teammates pushed — sync before PR',
		description:
			"You're on a feature branch ready to open a PR, but your teammates have pushed new commits to origin/main. You need to incorporate their changes first.",
		hint: 'Fetch first to download remote changes without merging. Then merge origin/main into your branch. Alternatively, use git pull origin main to fetch + merge in one step.',
		suggestedCommands: [
			'git log --oneline --all',
			'git fetch origin',
			'git log --oneline --all',
			'git merge origin/main',
			'git log --oneline'
		],
		seedFn: buildSyncRemoteRepo
	},
	{
		id: 'undo',
		title: 'AI broke everything — undo it all',
		description:
			'The AI made a mess: bad working directory changes, a file accidentally staged, and a broken commit already pushed. Practice every undo tool in your toolkit.',
		hint: 'Use git restore <file> to discard working changes, git restore --staged <file> to unstage, and git revert HEAD to safely undo a pushed commit without rewriting history.',
		suggestedCommands: [
			'git status',
			'git diff',
			'git restore src/model.py',
			'git restore --staged src/utils.py',
			'git log --oneline',
			'git revert HEAD'
		],
		seedFn: buildUndoRepo
	},
	{
		id: 'stash',
		title: 'Urgent hotfix — stash AI work first',
		description:
			"You're mid-refactor on feature/A when a critical bug report comes in. Stash your work-in-progress, switch to main, create a hotfix branch, then come back.",
		hint: 'Use git stash push -m "message" to save work, switch branches freely, then git stash pop to restore. Use git stash list to see saved stashes.',
		suggestedCommands: [
			'git status',
			'git stash push -m "WIP: pipeline refactor"',
			'git stash list',
			'git switch main',
			'git switch -c hotfix/urgent-bug',
			'git switch feature/A',
			'git stash pop'
		],
		seed: {
			commits: [
				{ message: 'Last commit on main', files: [{ path: 'src/app.py', content: 'stable\n' }] }
			],
			branches: [
				{
					name: 'feature/A',
					commits: [
						{ message: 'Start AI refactor', files: [{ path: 'src/pipeline.py', content: 'v1\n' }] }
					]
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
		title: 'Rebase vs merge — choose your strategy',
		description:
			'Your feature branch and main have diverged. Try both strategies: git merge main keeps a merge commit, git rebase main replays your work on top for a linear history.',
		hint: 'Run git log --oneline --all to see the divergence. Try git merge main first. Reset and try git rebase main to compare. Rebase = cleaner history, merge = safer for shared branches.',
		suggestedCommands: [
			'git log --oneline --all',
			'git merge main',
			'git log --oneline --all',
			'git reset --hard HEAD~1',
			'git rebase main'
		],
		seedFn: buildMergeRebaseRepo
	},
	{
		id: 'conflicts',
		title: 'Resolve a merge conflict',
		description:
			'A merge left a conflict in src/model.py — the file has <<<<<<< and >>>>>>> markers. You need to pick the right version, stage it, and complete the merge commit.',
		hint: 'Check git status to see conflicted files. Use echo to write the resolved content, then git add the file and git commit to finalize the merge.',
		suggestedCommands: [
			'git status',
			'git diff',
			"echo 'x = 10' > src/model.py",
			'git add src/model.py',
			'git commit -m "fix: Resolve merge conflict in model.py"'
		],
		seedFn: buildMergeConflictRepo
	},
	{
		id: 'wrong-branch',
		title: 'Oops — committed to main instead of a branch',
		description:
			'You accidentally committed a payment feature directly to main instead of creating a feature branch first. The commit is local (not pushed). Move it to the right branch.',
		hint: 'Create the feature branch (it will include your commit), then switch to main and git reset --hard HEAD~1 to remove it from main. Switch back to the feature branch to verify.',
		suggestedCommands: [
			'git log --oneline',
			'git branch feature/payments',
			'git reset --hard HEAD~1',
			'git switch feature/payments',
			'git log --oneline'
		],
		seedFn: buildWrongBranchRepo
	},
	{
		id: 'accidental-stage',
		title: 'Staged secrets and debug files — unstage them',
		description:
			'You ran git add . too quickly and staged everything — including .env with credentials and a debug file with pdb. Unstage the dangerous files before committing.',
		hint: "Use git status to see what is staged. Use git restore --staged <file> to unstage files you don't want to commit. Use git diff --staged to verify what remains.",
		suggestedCommands: [
			'git status',
			'git diff --staged',
			'cat .env',
			'git restore --staged .env',
			'git restore --staged src/debug.py',
			'git status',
			'git commit -m "feat: Add server runner and new feature"'
		],
		seedFn: buildAccidentalStageRepo
	},
	{
		id: 'force-push',
		title: 'Reset and force push — rewrite pushed history',
		description:
			'You pushed two bad commits to your feature branch. Nobody else is working on it. Reset to before the bad commits and force push to clean up the remote.',
		hint: 'Use git log to find the good commit, git reset --hard to go back, then git push --force-with-lease — the safe force that refuses if a teammate pushed in the meantime. Never do this on shared branches like main!',
		suggestedCommands: [
			'git log --oneline',
			'git reset --hard HEAD~2',
			'git push origin feature/cleanup',
			'git push --force-with-lease origin feature/cleanup'
		],
		seedFn: buildForcePushRepo
	},
	{
		id: 'reflog-rescue',
		title: 'The agent reset --hard — rescue lost commits',
		description:
			'An agent ran git reset --hard HEAD~2 and two commits vanished from the log. Nothing is truly lost: the reflog remembers every place HEAD has been. Find the lost commit and bring it back.',
		hint: 'git log shows only what is reachable — git reflog shows everything HEAD touched. Find the hash from before the reset, then git reset --hard <hash> to restore it (or cherry-pick individual commits).',
		suggestedCommands: [
			'git log --oneline',
			'git reflog',
			'git reset --hard HEAD@{1}',
			'git log --oneline'
		],
		seedFn: buildReflogRescueRepo
	},
	{
		id: 'rebase-conflict',
		title: 'Rebase hits a conflict — resolve or abort',
		description:
			'Your feature branch raised TIMEOUT in src/config.py, but main lowered it. Rebasing onto main stops at a conflict. Read the markers, resolve, and continue — or abort and return to safety.',
		hint: 'Run git rebase main, then cat src/config.py to read the <<<<<<< markers. Overwrite the file with the value you want using echo, git add it, then git rebase --continue. Lost? git rebase --abort restores everything.',
		suggestedCommands: [
			'git log --oneline --all',
			'git rebase main',
			'cat src/config.py',
			"echo 'TIMEOUT = 120' > src/config.py",
			'git add src/config.py',
			'git rebase --continue'
		],
		seedFn: buildRebaseConflictRepo
	},
	{
		id: 'cherry-pick',
		title: 'Grab the one good commit from a messy branch',
		description:
			'The experiment branch is mostly half-finished work, but it contains one gem: a currency rounding fix. Bring exactly that commit to main and leave the rest behind.',
		hint: 'git log --oneline --all shows the experiment commits. git cherry-pick <hash> (or cherry-pick experiment for the branch tip) copies a single commit onto your current branch.',
		suggestedCommands: [
			'git log --oneline --all',
			'git cherry-pick experiment',
			'git log --oneline',
			'cat src/billing.py'
		],
		seedFn: buildCherryPickRepo
	},
	{
		id: 'detached-head',
		title: 'Time-travel to an old commit — and escape safely',
		description:
			"Version 0.4 is misbehaving and you want to inspect how 0.2 looked. Checking out an old commit puts you in 'detached HEAD' state — look around, then escape with your work intact.",
		hint: 'git checkout HEAD~2 detaches HEAD at the old commit — cat files to inspect. To keep any work made there, git switch -c <branch>. To just leave, git switch main.',
		suggestedCommands: [
			'git log --oneline',
			'git checkout HEAD~2',
			'cat src/app.py',
			'git switch -c inspect-v02',
			'git switch main'
		],
		seedFn: buildDetachedHeadRepo
	},
	{
		id: 'release-tags',
		title: 'Cut a release — tag and inspect it',
		description:
			'v1.0.0 shipped two commits ago and the import feature is ready. Mark the current commit as v1.1.0 with an annotated tag, then inspect what each release points at.',
		hint: 'git tag -a v1.1.0 -m "message" creates an annotated tag at HEAD. Plain git tag lists tags, git show v1.1.0 inspects one, and git log --oneline shows tag decorations.',
		suggestedCommands: [
			'git log --oneline',
			'git tag -a v1.1.0 -m "Release: import support"',
			'git tag',
			'git log --oneline',
			'git show v1.1.0'
		],
		seedFn: buildReleaseRepo
	},
	{
		id: 'clean-slate',
		title: 'Playground — start from scratch',
		description:
			'An empty repo for free experimentation. Create files, branches, commits — try anything. Type help to see all supported commands.',
		hint: 'Use echo "content" > filename to create files, then git add and git commit. Try creating branches with git switch -c.',
		suggestedCommands: [
			'help',
			'echo "hello world" > README.md',
			'git add .',
			'git commit -m "Initial commit"',
			'git switch -c experiment'
		],
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

export async function loadScenarioSeed(
	engine: GitEngine,
	scenario: PlaygroundScenario
): Promise<void> {
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
	'conflicts',
	'wrong-branch',
	'accidental-stage',
	'force-push',
	'reflog-rescue',
	'rebase-conflict',
	'cherry-pick',
	'detached-head',
	'release-tags'
] as const;

export type LessonScenarioId = (typeof lessonScenarioIds)[number];

export function isLessonScenario(id: string): id is LessonScenarioId {
	return (lessonScenarioIds as readonly string[]).includes(id);
}

export const PLAYGROUND_COMMANDS_HELP = `Supported commands:
  git status | git diff [--staged] | git log [--oneline] [--all] [-n <k>]
  git show [<commit>] | git reflog
  git add <file|glob> | git add . | git add -p  (hunk-by-hunk staging)
  git commit -m "msg" | git commit --amend [-m "msg"]
  git branch [-d|-m|-v|-a] | git switch [-c] <branch>
  git checkout [-b] <branch> | git checkout <commit>  (detached HEAD)
  git checkout <commit> -- <file> | git restore [--staged|--source <rev>] <file>
  git reset --soft|--mixed|--hard <rev>   (rev: HEAD~N, HEAD^, HEAD@{n}, hash)
  git merge <branch> [--abort] | git rebase <branch> [--abort|--continue]
  git cherry-pick <commit> [--abort|--continue]
  git tag [-a <name> -m "msg"] [<name>] [-d <name>]
  git stash push -m "msg" | pop | apply | list | drop | clear
  git fetch origin | git pull [--rebase] origin <branch>
  git push [-u|--force-with-lease|--force] origin [branch]
  git remote -v | git revert <commit> | git rm [--cached] <file> | git clean -f
  echo "content" > file | cat <file> | ls
  y | n | a | d | q  (responses during git add -p)

Other: clear, help`;
