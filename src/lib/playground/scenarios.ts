import git from 'isomorphic-git';
import type { RepoSeed, GitEngine } from './git-engine';
import { readFileAtCommit } from './tree-utils';
import {
	buildBisectRepo,
	buildBranchingRepo,
	buildCapstoneRepo,
	buildCherryPickRepo,
	buildDetachedHeadRepo,
	buildHooksRepo,
	buildInteractiveRebaseRepo,
	buildWorktreesRepo,
	buildMergeConflictRepo,
	buildMergeRebaseRepo,
	buildRebaseConflictRepo,
	buildReflogRescueRepo,
	buildReleaseRepo,
	buildReleaseRobotRepo,
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
	/** One line naming the goal state, shown when the check passes. */
	goal?: string;
	/**
	 * Returns true once the repo has reached the scenario's goal state. Run
	 * after every command; keep it cheap and side-effect free.
	 */
	check?: (engine: GitEngine) => Promise<boolean>;
}

/* ── check helpers ─────────────────────────────────────────────── */

async function tipOid(engine: GitEngine, branch: string): Promise<string | null> {
	return git
		.resolveRef({ fs: engine.fs, dir: engine.dir, ref: `refs/heads/${branch}` })
		.catch(() => null);
}

async function tipMessage(engine: GitEngine, branch: string): Promise<string | null> {
	const oid = await tipOid(engine, branch);
	if (!oid) return null;
	const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
	return commit.message.trim();
}

async function headMessage(engine: GitEngine): Promise<string | null> {
	const oid = await git
		.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' })
		.catch(() => null);
	if (!oid) return null;
	const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
	return commit.message.trim();
}

/** Is `message` the subject of any commit reachable from `ref`? */
async function logContains(engine: GitEngine, ref: string, message: string): Promise<boolean> {
	const log = await git.log({ fs: engine.fs, dir: engine.dir, ref, depth: 50 }).catch(() => []);
	return log.some((e) => e.commit.message.trim().startsWith(message));
}

async function fileAtHead(engine: GitEngine, filepath: string): Promise<string | null> {
	const oid = await git
		.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' })
		.catch(() => null);
	if (!oid) return null;
	return readFileAtCommit(engine, oid, filepath);
}

export const playgroundScenarios: PlaygroundScenario[] = [
	{
		id: 'config',
		title: 'Introduce yourself to Git',
		description:
			'Your first playground! This is a real Git repository running in your browser. Every commit records WHO made it — and right now this repo only knows the sandbox default, "Vibe Coder". Set your own identity, make a commit, and watch the log credit you.',
		hint: 'git config user.name "Your Name" and git config user.email set your identity (--global does the same across the sandbox). git config --list shows what is set. Then stage the waiting file and commit — git log shows exactly who made each save point.',
		suggestedCommands: [
			'git log',
			'git config user.name "Ada Lovelace"',
			'git config user.email "ada@example.com"',
			'git config --list',
			'git add notes.txt',
			'git commit -m "chore: introduce myself"',
			'git log'
		],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [
						{
							path: 'README.md',
							content: '# my-first-repo\nA sandbox for meeting Git in person.\n'
						}
					]
				}
			],
			workingFiles: [
				{ path: 'notes.txt', content: 'Git records who, what, and when - for every commit.\n' }
			]
		},
		goal: 'A commit in the log carries YOUR name, not the sandbox default',
		check: async (engine) => {
			const oid = await git
				.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' })
				.catch(() => null);
			if (!oid) return false;
			const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
			return commit.author.name !== 'Vibe Coder' && commit.author.email !== 'vibe@gitvibes.dev';
		}
	},
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
			'git commit -m "feat: add user authentication"'
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
		},
		goal: 'Review the changes and commit the files you trust',
		check: async (engine) => {
			const log = await git
				.log({ fs: engine.fs, dir: engine.dir, ref: 'HEAD', depth: 5 })
				.catch(() => []);
			if (log.length < 2) return false;
			const committed = await Promise.all(
				['src/auth.py', 'src/routes.py', 'src/middleware.py', 'tests/test_auth.py'].map((f) =>
					fileAtHead(engine, f)
				)
			);
			return committed.some((c) => c !== null);
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
		seedFn: buildBranchingRepo,
		goal: 'Commit the AI work on its own branch and push it',
		check: async (engine) => {
			for (const [branch, oid] of engine.remote.branches) {
				if (branch === 'main') continue;
				const local = await tipOid(engine, branch);
				if (local && local === oid) return true;
			}
			return false;
		}
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
		seedFn: buildSyncRemoteRepo,
		goal: "Fetch the teammates' commits and merge them into your branch",
		check: async (engine) => (await fileAtHead(engine, 'src/shared.py')) === 'ef\n'
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
		seedFn: buildUndoRepo,
		goal: 'Clean the working tree and revert the pushed commit',
		check: async (engine) => (await headMessage(engine))?.startsWith('Revert') ?? false
	},
	{
		id: 'stash',
		title: 'Urgent hotfix — stash AI work first',
		description:
			"You're mid-refactor on feature/A when a critical bug report comes in. Stash your work-in-progress, switch to main, create a hotfix branch, then come back.",
		hint: 'Use git stash push -u -m "message" to save work (-u takes brand-new files along too), switch branches freely, then git stash pop to restore. Use git stash list to see saved stashes.',
		suggestedCommands: [
			'git status',
			'git stash push -u -m "WIP: pipeline refactor"',
			'git stash list',
			'git switch main',
			'git switch -c hotfix/urgent-bug',
			'git switch feature/A',
			'git stash pop'
		],
		goal: 'Create the hotfix branch, then restore your stashed work on feature/A',
		check: async (engine) => {
			const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
			if (!branches.some((b) => b.startsWith('hotfix/'))) return false;
			const current = await git.currentBranch({ fs: engine.fs, dir: engine.dir });
			if (current !== 'feature/A') return false;
			return (await engine.readFile('src/pipeline.py')) === 'wip pipeline changes\n';
		},
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
		seedFn: buildMergeRebaseRepo,
		goal: "Bring main's commits into your feature branch (merge or rebase)",
		check: async (engine) => {
			const current = await git.currentBranch({ fs: engine.fs, dir: engine.dir });
			if (current !== 'feature') return false;
			return (await fileAtHead(engine, 'src/main.py')) === 'teammate f\n';
		}
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
			'git commit -m "fix: resolve merge conflict in model.py"'
		],
		seedFn: buildMergeConflictRepo,
		goal: 'Resolve the conflict and complete the merge commit',
		check: async (engine) => {
			if (engine.mergeState !== null) return false;
			const oid = await git
				.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' })
				.catch(() => null);
			if (!oid) return false;
			const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
			if (commit.parent.length !== 2) return false;
			const content = await fileAtHead(engine, 'src/model.py');
			return content !== null && !content.includes('<<<<<<<');
		}
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
		seedFn: buildWrongBranchRepo,
		goal: 'Payment commit lives on a feature branch; main is clean again',
		check: async (engine) => {
			if ((await tipMessage(engine, 'main')) !== 'feat: add user model') return false;
			const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
			for (const b of branches) {
				if (b === 'main') continue;
				if ((await tipMessage(engine, b))?.startsWith('feat: add payment')) return true;
			}
			return false;
		}
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
			'git commit -m "feat: add server runner and new feature"'
		],
		seedFn: buildAccidentalStageRepo,
		goal: 'Commit the real work — with the secret and the debug file left out',
		check: async (engine) => {
			const log = await git
				.log({ fs: engine.fs, dir: engine.dir, ref: 'HEAD', depth: 5 })
				.catch(() => []);
			if (log.length < 2) return false;
			const [env, debug, feature] = await Promise.all([
				fileAtHead(engine, '.env'),
				fileAtHead(engine, 'src/debug.py'),
				fileAtHead(engine, 'src/feature.py')
			]);
			return env === 'SECRET_KEY=old_key\n' && debug === null && feature !== null;
		}
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
		seedFn: buildForcePushRepo,
		goal: 'The remote branch matches your cleaned-up local history',
		check: async (engine) => {
			const local = await tipOid(engine, 'feature/cleanup');
			if (!local || engine.remote.getBranch('feature/cleanup') !== local) return false;
			const log = await git
				.log({ fs: engine.fs, dir: engine.dir, ref: 'feature/cleanup', depth: 10 })
				.catch(() => []);
			return log.length === 2;
		}
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
		seedFn: buildReflogRescueRepo,
		goal: 'The lost commits are back at the tip of main',
		check: async (engine) => (await headMessage(engine)) === 'feat: add caching layer'
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
		seedFn: buildRebaseConflictRepo,
		goal: 'Rebase completed with the conflict resolved in favor of the higher timeout',
		check: async (engine) => {
			if (engine.replayState !== null) return false;
			if ((await fileAtHead(engine, 'src/config.py')) !== 'TIMEOUT = 120\n') return false;
			return logContains(engine, 'HEAD', 'fix: lower timeout');
		}
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
		seedFn: buildCherryPickRepo,
		goal: 'The rounding fix is on main; the junk stays on experiment',
		check: async (engine) =>
			(await tipMessage(engine, 'main'))?.startsWith('fix: round currency') ?? false
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
		seedFn: buildDetachedHeadRepo,
		goal: 'Time-travel to the old commit, then escape back onto a branch',
		check: async (engine) => {
			const detachedOnce = engine.reflog.some((e) => /checkout: moving to HEAD~\d/.test(e.message));
			if (!detachedOnce) return false;
			return (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) != null;
		}
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
		seedFn: buildReleaseRepo,
		goal: 'v1.1.0 exists as an ANNOTATED tag at the release commit',
		check: async (engine) => {
			const tagOid = await git
				.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'refs/tags/v1.1.0' })
				.catch(() => null);
			if (!tagOid) return false;
			const tag = await git
				.readTag({ fs: engine.fs, dir: engine.dir, oid: tagOid })
				.catch(() => null);
			return tag !== null;
		}
	},
	{
		id: 'interactive-rebase',
		title: 'Squash the WIP — interactive rebase',
		description:
			'Your feature branch works, but its history is three "wip" commits nobody should ever read. Use git rebase -i to fold them into one well-named commit before the PR.',
		hint: 'git rebase -i main lists the three commits oldest-first and asks p/s/r/d for each. Classic cleanup: r (reword) the first one to a proper message like "feat: add onboarding form", then s (squash) the other two into it. git log --oneline afterwards shows one clean commit.',
		suggestedCommands: [
			'git log --oneline',
			'git rebase -i main',
			'r',
			'feat: add onboarding form',
			's',
			's',
			'git log --oneline'
		],
		seedFn: buildInteractiveRebaseRepo,
		goal: 'Three wip commits became one clean commit — same final code',
		check: async (engine) => {
			const current = await git.currentBranch({ fs: engine.fs, dir: engine.dir });
			if (current !== 'feature/onboarding') return false;
			const log = await git
				.log({ fs: engine.fs, dir: engine.dir, ref: 'feature/onboarding', depth: 10 })
				.catch(() => []);
			if (log.length !== 2) return false;
			const form = await fileAtHead(engine, 'src/form.py');
			return form === 'def onboarding_form():\n    return render("onboarding.html")\n';
		}
	},
	{
		id: 'bisect',
		title: 'Find the commit that broke it — git bisect',
		description:
			'The tests fail on main, but they passed at v1.0 — eight commits ago, half of them agent refactors. Instead of reading every diff, let git bisect binary-search the history for the culprit.',
		hint: 'run-tests to confirm the breakage. Then: git bisect start, git bisect bad (HEAD is broken), git bisect good v1.0. Git checks out a midpoint — run-tests, answer git bisect good or git bisect bad, repeat. When it names the first bad commit, git bisect reset returns you home.',
		suggestedCommands: [
			'run-tests',
			'git bisect start',
			'git bisect bad',
			'git bisect good v1.0',
			'run-tests',
			'git bisect bad',
			'git bisect good',
			'git bisect reset'
		],
		seedFn: buildBisectRepo,
		goal: 'Bisect identified the exact commit that introduced the failure',
		check: async (engine) => {
			if (!engine.lastBisectResult) return false;
			const log = await git
				.log({ fs: engine.fs, dir: engine.dir, ref: 'main', depth: 20 })
				.catch(() => []);
			const culprit = log.find((e) =>
				e.commit.message.startsWith('refactor: simplify discount math')
			);
			return culprit !== undefined && engine.lastBisectResult === culprit.oid;
		}
	},
	{
		id: 'hooks',
		title: 'The hooks say no — fix it properly',
		description:
			'This repo has husky hooks installed: pre-commit runs lint + tests, commit-msg enforces Conventional Commits. An agent left a BREAKPOINT in src/app.py. Try to commit and watch the hooks veto it — then fix it for real.',
		hint: 'cat .husky/pre-commit to see what runs. Committing is blocked while BREAKPOINT is in src/app.py — overwrite the file with a clean version using echo, stage it, and commit. Mind the message: the commit-msg hook wants "fix: ..." style. (--no-verify would bypass both — and leave the bug in.)',
		suggestedCommands: [
			'git status',
			'cat .husky/pre-commit',
			'git add src/app.py',
			'git commit -m "remove debug"',
			"echo 'def main():\\n    return serve()' > src/app.py",
			'git add src/app.py',
			'git commit -m "fix: remove leftover debug statement"'
		],
		seedFn: buildHooksRepo,
		goal: 'A clean, conventionally-named commit made it past both hooks',
		check: async (engine) => {
			const msg = await headMessage(engine);
			if (!msg || msg === 'chore: install husky hooks') return false;
			if (!/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/.test(msg)) {
				return false;
			}
			const app = await fileAtHead(engine, 'src/app.py');
			return app !== null && !app.includes('BREAKPOINT');
		}
	},
	{
		id: 'worktrees',
		title: 'One repo, three working directories',
		description:
			'Agent A should refactor auth while Agent B builds payments — in parallel, in the same repository. Give each agent its own worktree, run into the branch-exclusivity guard on purpose, then clean up.',
		hint: 'git worktree add ../proj-auth feature/auth-refactor gives Agent A a directory; do the same for feature/payments. Then try adding a worktree for main — Git refuses, because a branch can be checked out in only ONE worktree (that guarantee is the whole point). git worktree list shows the fleet, git worktree remove <path> cleans up.',
		suggestedCommands: [
			'git worktree add ../proj-auth feature/auth-refactor',
			'git worktree add ../proj-payments feature/payments',
			'git worktree list',
			'git worktree add ../oops main',
			'git worktree remove ../proj-auth',
			'git worktree list'
		],
		seedFn: buildWorktreesRepo,
		goal: 'Ran two parallel worktrees, then cleaned up after the agents',
		check: async (engine) =>
			engine.worktreeHighWater >= 2 && engine.worktrees.length < engine.worktreeHighWater
	},
	{
		id: 'bot-pr',
		title: "Review the robot's PR — merge the bot branch",
		description:
			'A branch named dependabot/npm-lodash-4.17.21 appeared: the dependency bot proposing an upgrade. Review exactly what it changes, merge it into main, and clean up the branch — the same moves the Merge button makes on GitHub.',
		hint: 'git log --oneline --all shows the bot branch. git diff main..dependabot/npm-lodash-4.17.21 shows its exact change — read it like any diff. Merge it into main (you are already on main), then delete the merged branch with git branch -d (the safe -d refuses if work is unmerged).',
		suggestedCommands: [
			'git log --oneline --all',
			'git diff main..dependabot/npm-lodash-4.17.21',
			'git merge dependabot/npm-lodash-4.17.21',
			'git branch -d dependabot/npm-lodash-4.17.21',
			'git log --oneline'
		],
		seed: {
			commits: [
				{
					message: 'Initial commit',
					files: [
						{
							path: 'package.json',
							content: '{\n  "dependencies": {\n    "lodash": "4.17.20"\n  }\n}\n'
						},
						{ path: 'src/app.js', content: 'const _ = require("lodash");\n' }
					]
				},
				{
					message: 'feat: add search endpoint',
					files: [{ path: 'src/search.js', content: 'module.exports = (q) => q.trim();\n' }]
				}
			],
			branches: [
				{
					name: 'dependabot/npm-lodash-4.17.21',
					commits: [
						{
							message: 'chore(deps): bump lodash from 4.17.20 to 4.17.21',
							files: [
								{
									path: 'package.json',
									content: '{\n  "dependencies": {\n    "lodash": "4.17.21"\n  }\n}\n'
								}
							]
						}
					]
				}
			],
			branch: 'main'
		},
		goal: "The bot's bump is on main and the merged branch is cleaned up",
		check: async (engine) => {
			if (!(await logContains(engine, 'main', 'chore(deps): bump lodash'))) return false;
			const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
			return !branches.some((b) => b.startsWith('dependabot/'));
		}
	},
	{
		id: 'release-robot',
		title: 'Be release-please for a day',
		description:
			"Since v1.0.0, main has gained a feat and a fix. Do the release bot's bookkeeping by hand: read the log, decide the next version, update the changelog, commit the paperwork, and cut the annotated tag.",
		hint: 'git log --oneline shows the conventional commits since the v1.0.0 tag — a feat: means the next release is a MINOR bump: v1.1.0. Rewrite CHANGELOG.md with echo, commit it as "chore(main): release 1.1.0", then git tag -a v1.1.0 -m "Release 1.1.0". (Real release-please prepends to the changelog; the playground keeps it to one line.)',
		suggestedCommands: [
			'git log --oneline',
			"echo '## 1.1.0 - csv export + fixes' > CHANGELOG.md",
			'git add CHANGELOG.md',
			'git commit -m "chore(main): release 1.1.0"',
			'git tag -a v1.1.0 -m "Release 1.1.0"',
			'git log --oneline'
		],
		seedFn: buildReleaseRobotRepo,
		goal: 'Changelog committed and v1.1.0 tagged (annotated) at the release commit',
		check: async (engine) => {
			const tagOid = await git
				.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'refs/tags/v1.1.0' })
				.catch(() => null);
			if (!tagOid) return false;
			const tag = await git
				.readTag({ fs: engine.fs, dir: engine.dir, oid: tagOid })
				.catch(() => null);
			if (!tag) return false;
			if ((await engine.peelTag(tagOid)) !== (await tipOid(engine, 'main'))) return false;
			const msg = await tipMessage(engine, 'main');
			if (!msg?.startsWith('chore')) return false;
			const changelog = await fileAtHead(engine, 'CHANGELOG.md');
			return changelog !== null && changelog.includes('1.1.0');
		}
	},
	{
		id: 'capstone',
		title: 'The Final Challenge — three messes, one repo',
		description:
			'Everything at once: a payment feature was committed straight to main, a live Stripe key is sitting STAGED, and the cleaned-up main still needs its v1.0.0 release tag. Fix all three.',
		hint: 'Three tasks, any order: (1) unstage .env so the secret never gets committed; (2) move the payment commit to a feature branch (create the branch, then reset main back one commit); (3) put an annotated v1.0.0 tag on the cleaned-up main. Everything you need is in Parts 2-5.',
		suggestedCommands: [
			'git status',
			'git log --oneline',
			'git restore --staged .env',
			'git branch feature/payments',
			'git reset --hard HEAD~1',
			'git tag -a v1.0.0 -m "First stable release"'
		],
		seedFn: buildCapstoneRepo,
		goal: 'Secret unstaged, payment commit on its own branch, main tagged v1.0.0',
		check: async (engine) => {
			// 1. The secret never made it into history, and isn't staged now
			const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
			const envRow = matrix.find(([f]) => f === '.env');
			if (envRow && (envRow[3] === 2 || envRow[3] === 3)) return false;

			// 2. Payment commit moved to a branch; main reset underneath it
			if ((await tipMessage(engine, 'main')) !== 'feat: add user model') return false;
			const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
			let paymentsBranch: string | null = null;
			for (const b of branches) {
				if (b === 'main') continue;
				if ((await tipMessage(engine, b))?.startsWith('feat: add payment')) paymentsBranch = b;
			}
			if (!paymentsBranch) return false;
			const paymentsTip = await tipOid(engine, paymentsBranch);
			if (paymentsTip && (await readFileAtCommit(engine, paymentsTip, '.env')) !== null) {
				return false; // committed the secret onto the branch — not a pass
			}

			// 3. Annotated v1.0.0 on the clean main tip
			const tagOid = await git
				.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'refs/tags/v1.0.0' })
				.catch(() => null);
			if (!tagOid) return false;
			const tag = await git
				.readTag({ fs: engine.fs, dir: engine.dir, oid: tagOid })
				.catch(() => null);
			if (!tag) return false;
			return (await engine.peelTag(tagOid)) === (await tipOid(engine, 'main'));
		}
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
	'config',
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
	'release-tags',
	'interactive-rebase',
	'bisect',
	'hooks',
	'worktrees',
	'bot-pr',
	'release-robot',
	'capstone'
] as const;

export type LessonScenarioId = (typeof lessonScenarioIds)[number];

export function isLessonScenario(id: string): id is LessonScenarioId {
	return (lessonScenarioIds as readonly string[]).includes(id);
}

export const PLAYGROUND_COMMANDS_HELP = `Supported commands:
  git status | git log [--oneline] [--all] [-n <k>] [<ref>]
  git diff [--staged] [--stat] [<rev>] [<a>..<b>] | git show [<commit>] | git reflog
  git add <file|glob> | git add . | git add -u | git add -p  (hunk staging)
  git commit [-a] -m "msg" | git commit --amend [-m "msg"]
  git branch [-d|-m|-v|-a] [<name> [<start>]] | git switch [-c] <branch> [<start>] | git switch -
  git checkout [-b] <branch> | git checkout <commit>  (detached HEAD)
  git checkout [<commit>] -- <file> | git restore [--staged|--source <rev>] <file|.>
  git reset [--soft|--mixed|--hard] [<rev>] | git reset [HEAD] <file>
  git merge <branch> [--abort] | git rebase <branch> [--abort|--continue]
  git rebase -i <upstream>   (interactive: pick/squash/reword/drop per commit)
  git cherry-pick <commit> [--abort|--continue]
  git bisect start | good <rev> | bad [<rev>] | reset   (+ run-tests)
  git worktree add <path> <branch> | add -b <new> <path> | list | remove | prune
  git config [--global] <key> [<value>] | git config --list
  git tag [-a <name> -m "msg"] [<name>] [-d <name>]
  git stash [push [-u] [-m "msg"]] | pop | apply | list | drop | clear  (stash@{n} ok)
  git fetch origin [--prune] | git pull [--rebase] origin <branch>
  git push [-u|--force-with-lease|--force] origin [branch|tag] | git push --tags
  git remote -v | git revert <commit> | git rm [--cached] <file>
  git clean -n | -f [-d]   (n = dry run, d = directories)
  echo "content" > file | cat <file> | ls | run-tests
  y | n | a | d | q  (responses during git add -p)
  p | s | r | d | q  (responses during git rebase -i)

Other: clear, help, undo, redo, share  (share copies a link to this exact state)
       agent "<task>"  (run the AI agent in this terminal — see the Agent panel)`;
