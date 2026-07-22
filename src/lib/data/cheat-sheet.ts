export interface CheatSheetCommand {
	command: string;
	description: string;
	/**
	 * One or two extra sentences — when to reach for it, the classic gotcha,
	 * the related command. Shown where there's room (the expanded modal and
	 * the PDF), not in the narrow side panel.
	 */
	detail?: string;
}

export interface CheatSheetCategory {
	label: string;
	icon: string; // lucide icon name for reference
	commands: CheatSheetCommand[];
}

export interface CheatSheetLegendEntry {
	/** The notation as it appears in the command column */
	notation: string;
	meaning: string;
}

export interface CheatSheetLegend {
	lead: string;
	entries: CheatSheetLegendEntry[];
}

/**
 * Placeholder notation used throughout the commands below. Rendered above the
 * list everywhere the cheat sheet appears — panel, expanded modal, and the
 * printed PDF — because a beginner who types the angle brackets gets an error
 * that names a path they never wrote.
 *
 * In `description`/`detail`/`meaning` strings, command mentions sit in
 * `backticks`; every surface renders those segments as syntax-highlighted
 * chips, the same treatment the command column gets.
 */
export const cheatSheetLegend: CheatSheetLegend = {
	lead: 'Some of these commands have a blank to fill in. Three notations mark one:',
	entries: [
		{
			notation: '<branch> <file> <url>',
			meaning:
				'Your own word goes here — `git switch <branch>` means `git switch main`. Never type the angle brackets.'
		},
		{
			notation: '<commit>',
			meaning:
				'Any way of naming one commit: a hash like `a1b2c3d`, a branch or tag name, or a walk back from where you are — `HEAD~2` is "two commits before HEAD".'
		},
		{
			notation: '<remote>',
			meaning:
				'The nickname for a repository elsewhere. It is almost always `origin`, the one `git clone` sets up for you.'
		}
	]
};

export const cheatSheet: CheatSheetCategory[] = [
	{
		label: 'Setup & Config',
		icon: 'settings',
		commands: [
			{
				command: 'git init',
				description: 'Initialize a new local repository',
				detail:
					'Creates the hidden .git folder that will hold all history. Safe to run in a folder that already has files — nothing is tracked until you add and commit.'
			},
			{
				command: 'git init <directory>',
				description: 'Create a new repo in the specified directory',
				detail:
					'Makes the directory (creating it if needed) and initializes it in one step — equivalent to mkdir + cd + git init.'
			},
			{
				command: 'git clone <url>',
				description: 'Clone a remote repository to your machine',
				detail:
					"Downloads the entire history, not just the latest files, and wires up 'origin' pointing back at the source so push and pull just work."
			},
			{
				command: 'git clone --depth 1 <url>',
				description: 'Shallow clone with only the latest commit',
				detail:
					"Grabs only the newest snapshot — much faster for huge repos when you don't need history. Deepen later with git fetch --unshallow."
			},
			{
				command: 'git config --global user.name "<name>"',
				description: 'Set your name for all repositories',
				detail:
					'Recorded into every commit you make on this machine. Use --local inside a repo to override it for that one project (e.g. a work identity).'
			},
			{
				command: 'git config --global user.email "<email>"',
				description: 'Set your email for all repositories',
				detail:
					'Match an email registered on your GitHub account or commits will not link to your profile. The same --local override applies per repo.'
			},
			{
				command: 'git config --global core.editor "<editor>"',
				description: 'Set default text editor for Git',
				detail:
					"The editor Git opens for commit messages, rebase plans and merges. 'code --wait' makes VS Code work — --wait keeps Git paused until you close the tab."
			},
			{
				command: 'git config --list',
				description: 'List all current configuration settings',
				detail:
					'Shows the merged result of system, global and local config. Add --show-origin to see which file each value comes from when settings fight.'
			},
			{
				command: 'git config --global credential.helper <helper>',
				description: 'Store HTTPS credentials (osxkeychain, manager, libsecret)',
				detail:
					'Lets HTTPS remotes remember your token so you authenticate once. macOS: osxkeychain · Windows: manager · Linux: libsecret.'
			},
			{
				command: 'ssh-keygen -t ed25519 -C "<email>"',
				description: 'Generate an SSH key pair for authentication',
				detail:
					'Creates a modern key pair in ~/.ssh. Paste the .pub half into GitHub → Settings → SSH keys; the private half never leaves your machine.'
			},
			{
				command: 'ssh -T git@github.com',
				description: 'Test your SSH connection to GitHub',
				detail:
					"Prints a greeting with your username when the key is set up. 'Permission denied (publickey)' means GitHub never saw your key — check ssh-add and the uploaded .pub."
			},
			{
				command: 'gh auth login',
				description: 'Sign in to GitHub from the terminal (browser flow, no tokens to manage)',
				detail:
					'The GitHub CLI stores credentials for both git-over-HTTPS and the API. The browser flow means no personal access token to create, scope, or rotate.'
			},
			{
				command: 'git config --global core.excludesFile ~/.gitignore_global',
				description: 'Global ignore file for OS and editor junk',
				detail:
					'One machine-wide list for .DS_Store, Thumbs.db and editor artifacts — so each project’s .gitignore stays about the project.'
			},
			{
				command: 'git config core.hooksPath .githooks',
				description: 'Use a versioned, shareable hooks directory',
				detail:
					'Points Git at a hooks folder that lives in the repo itself, so the whole team — and any AI agent that clones it — gets the same checks automatically.'
			}
		]
	},
	{
		label: 'Basic Workflow',
		icon: 'git-commit-horizontal',
		commands: [
			{
				command: 'git status',
				description: 'Show the working tree status',
				detail:
					'Your home base: staged, unstaged and untracked files at a glance. It even names the exact command to undo whatever it is showing you.'
			},
			{
				command: 'git add <file>',
				description: 'Stage a specific file for commit',
				detail:
					"Staging marks the file's CURRENT content for the next commit — edit the file again afterwards and the new edits are not included until you re-add."
			},
			{
				command: 'git add .',
				description: 'Stage all changes in the current directory',
				detail:
					'Convenient but indiscriminate: it grabs everything, including secrets and debug files. After an AI session, review git status first and stage selectively.'
			},
			{
				command: 'git add -p',
				description: 'Interactively stage hunks of changes',
				detail:
					'Shows every change hunk-by-hunk and asks y/n. The single best habit for reviewing AI-generated edits before they become history.'
			},
			{
				command: 'git commit -m "<message>"',
				description: 'Commit staged changes with a message',
				detail:
					"Write the subject in imperative mood ('fix login bug'), ideally under 50 characters. Conventional prefixes (feat:, fix:, chore:) make history scannable."
			},
			{
				command: 'git commit -am "<message>"',
				description: 'Stage and commit tracked files in one step',
				detail:
					'The -a stages every TRACKED file’s changes first. Brand-new files are not included — they still need an explicit git add.'
			},
			{
				command: 'git commit --amend',
				description: 'Modify the most recent commit',
				detail:
					'Folds whatever is staged (or just a new message) into the previous commit. It rewrites history: safe before pushing, never after.'
			},
			{
				command: 'git diff',
				description: 'Show unstaged changes in the working directory',
				detail:
					'The unstaged view — exactly what git restore would throw away. Narrow it to one area with a path: git diff src/.'
			},
			{
				command: 'git diff --staged',
				description: 'Show changes staged for the next commit',
				detail:
					'Exactly what the next commit will contain — the last checkpoint before git commit. Read this instead of trusting an AI’s summary of its own changes.'
			},
			{
				command: 'git rm --cached <file>',
				description: 'Stop tracking a file without deleting it (pair with .gitignore)',
				detail:
					'The file stays on disk but leaves the index — the way out after committing something that belongs in .gitignore, like .env or node_modules.'
			},
			{
				command: 'git commit --no-verify',
				description: 'Skip pre-commit and commit-msg hooks (use sparingly)',
				detail:
					'Bypasses the checks your hooks enforce. Defensible for a WIP commit on a private branch; a red flag anywhere near main or a PR.'
			}
		]
	},
	{
		label: 'Branching',
		icon: 'git-branch',
		commands: [
			{
				command: 'git branch',
				description: 'List all local branches',
				detail:
					'The current branch is starred. Add -v to see each branch’s tip commit and how far ahead or behind its upstream it sits.'
			},
			{
				command: 'git branch -a',
				description: 'List all branches including remote',
				detail:
					'The origin/* entries are your last-fetched snapshots of the server, not live views — run git fetch first for a current picture.'
			},
			{
				command: 'git branch <name>',
				description: 'Create a new branch',
				detail:
					'Creates the branch at your current commit but stays where you are (use switch -c to also move). A branch is just a tiny pointer — make them freely.'
			},
			{
				command: 'git branch -d <name>',
				description: 'Delete a fully merged branch',
				detail:
					'Refuses if the branch holds unmerged work — a built-in safety net. Deleting a merged branch removes only the label, never the commits.'
			},
			{
				command: 'git branch -D <name>',
				description: 'Force delete a branch regardless of merge status',
				detail:
					'Skips the merge check; the commits become unreachable (still recoverable via reflog for a few weeks). For experiments you truly abandon.'
			},
			{
				command: 'git switch <branch>',
				description: 'Switch to an existing branch',
				detail:
					'The modern, purpose-built half of the old checkout. It refuses to overwrite uncommitted changes — stash or commit first.'
			},
			{
				command: 'git switch -c <branch>',
				description: 'Create and switch to a new branch',
				detail:
					'Branch and move in one step. Add a start point (git switch -c fix main) to branch from somewhere other than where you stand.'
			},
			{
				command: 'git merge <branch>',
				description: 'Merge the specified branch into the current branch',
				detail:
					'Brings <branch> INTO the branch you are on — so switch to the receiving branch first. Fast-forwards when possible, otherwise creates a merge commit.'
			}
		]
	},
	{
		label: 'Remote',
		icon: 'cloud',
		commands: [
			{
				command: 'git remote -v',
				description: 'List all remote connections with URLs',
				detail:
					"Two URLs per remote (fetch and push, usually identical). The fastest answer to 'where does this repo actually push to?'"
			},
			{
				command: 'git remote add <name> <url>',
				description: 'Add a new remote repository',
				detail:
					"'origin' is only a convention. On a fork, add the original as 'upstream' and you can pull their updates alongside your own remote."
			},
			{
				command: 'git remote remove <name>',
				description: 'Remove a remote connection',
				detail:
					'Deletes only the local connection and its remote-tracking branches. The repository on the server is untouched.'
			},
			{
				command: 'git remote rename <old> <new>',
				description: 'Rename an existing remote',
				detail:
					'Renames the remote and rewrites every branch’s upstream reference to match — nothing to reconfigure afterwards.'
			},
			{
				command: 'git fetch <remote>',
				description: 'Download objects and refs from a remote',
				detail:
					'Downloads new commits into origin/* WITHOUT touching your working files. Always safe: look first (git log origin/main), merge second.'
			},
			{
				command: 'git fetch --prune',
				description: 'Fetch and remove stale remote-tracking branches',
				detail:
					'Also deletes local origin/* entries whose server branches are gone — the cure for a branch list full of ghosts after PRs merge.'
			},
			{
				command: 'git pull <remote> <branch>',
				description: 'Fetch and merge changes from a remote branch',
				detail:
					'Literally fetch + merge. If both you and the remote have new commits it produces a merge commit — or set pull.rebase true for linear pulls.'
			},
			{
				command: 'git pull --rebase',
				description: 'Fetch and replay your local commits on top (linear history)',
				detail:
					'Replays your unpushed commits onto the incoming ones — no merge-commit noise. The tidiest way to catch up on a busy shared branch.'
			},
			{
				command: 'git push <remote> <branch>',
				description: 'Push local commits to a remote branch',
				detail:
					'Refuses if the remote has commits you have not seen — fetch or pull first. Nothing on your machine leaves it until you push.'
			},
			{
				command: 'git push -u <remote> <branch>',
				description: 'Push and set the upstream tracking branch',
				detail:
					'The -u links the local and remote branch once; from then on plain git push and git pull need no arguments. Use it on each branch’s first push.'
			},
			{
				command: 'git push --force-with-lease',
				description: 'Force push, but abort if someone else pushed first (safe force)',
				detail:
					'Overwrites the remote only if it still matches your last fetch — a teammate’s surprise push makes it abort. Never plain --force on shared branches.'
			}
		]
	},
	{
		label: 'Stashing',
		icon: 'archive',
		commands: [
			{
				command: 'git stash',
				description: 'Stash tracked changes (staged and unstaged; add -u for untracked files)',
				detail:
					'Sweeps uncommitted changes into a side drawer and leaves a clean tree — the escape hatch when an urgent fix interrupts messy work.'
			},
			{
				command: 'git stash push -m "<message>"',
				description: 'Stash changes with a descriptive message',
				detail:
					"Unnamed stashes all look alike a week later. A message ('WIP: auth refactor') is the difference between a drawer and a junk pile."
			},
			{
				command: 'git stash list',
				description: 'List all stashed changesets',
				detail:
					'Shows the stack — stash@{0} is the newest. Inspect any entry’s contents with git stash show -p stash@{n} before applying it.'
			},
			{
				command: 'git stash pop',
				description: 'Apply the latest stash and remove it from the list',
				detail:
					'Apply + drop in one step. On a conflict the stash entry is kept — resolve the files, then git stash drop it yourself.'
			},
			{
				command: 'git stash apply',
				description: 'Apply the latest stash but keep it in the list',
				detail:
					'Applies but keeps the entry — the safer choice when you might want the same changes on another branch, or aren’t sure they fit here.'
			},
			{
				command: 'git stash apply stash@{n}',
				description: 'Apply a specific stash by index',
				detail:
					'Stashes are not branch-bound: stash on one branch, switch, and apply somewhere else entirely. Get n from git stash list.'
			},
			{
				command: 'git stash drop stash@{n}',
				description: 'Remove a specific stash entry',
				detail:
					'Deletes one entry and renumbers the rest. Dropped stashes are genuinely hard to recover — peek with show -p first.'
			},
			{
				command: 'git stash clear',
				description: 'Remove all stash entries',
				detail:
					'Empties the whole stack permanently — one of the rare Git deletions with no reflog trail. Be sure before you run it.'
			}
		]
	},
	{
		label: 'Undoing',
		icon: 'undo-2',
		commands: [
			{
				command: 'git restore <file>',
				description: 'Discard changes in the working directory',
				detail:
					'Overwrites the file with its last committed version — the discarded edits are gone for good. The one everyday command with no undo: git diff first.'
			},
			{
				command: 'git restore --staged <file>',
				description: 'Unstage a file while keeping changes',
				detail:
					'Pulls a file back out of the staging area; your edits stay in the file untouched. The move when git add . grabbed something it shouldn’t have.'
			},
			{
				command: 'git reset <file>',
				description: 'Unstage a file (same as restore --staged)',
				detail:
					'Identical effect to restore --staged — the older spelling you will still meet in documentation, Stack Overflow answers and AI suggestions.'
			},
			{
				command: 'git reset --soft HEAD~1',
				description: 'Undo last commit but keep changes staged',
				detail:
					"Uncommits but keeps everything staged, ready to recommit. For 'right changes, wrong packaging' — reshape one commit into several, or fix the message."
			},
			{
				command: 'git reset --mixed HEAD~1',
				description: 'Undo last commit and unstage changes',
				detail:
					'The default reset: uncommit and unstage, with all edits intact in your files. Good for reconsidering what the last commit should contain.'
			},
			{
				command: 'git reset --hard HEAD~1',
				description: 'Undo last commit and discard all changes',
				detail:
					'Erases the commit AND every uncommitted change. The commit itself is recoverable via reflog for weeks; uncommitted work lost with it is not.'
			},
			{
				command: 'git revert <commit>',
				description: 'Create a new commit that undoes a previous commit',
				detail:
					'The pushed-history undo: adds a NEW commit containing the inverse changes. Nothing is rewritten, so shared branches stay consistent for everyone.'
			},
			{
				command: 'git clean -fd',
				description: 'Remove untracked files and directories',
				detail:
					'Deletes untracked files — build junk, stray AI-generated files. Preview with git clean -nd first: untracked files have no history to recover from.'
			}
		]
	},
	{
		label: 'History & Inspection',
		icon: 'history',
		commands: [
			{
				command: 'git log',
				description: 'Show the full commit history',
				detail:
					'Authors, dates and full messages. Scope it to a path (git log src/auth/) to read just one area’s story.'
			},
			{
				command: 'git log --oneline',
				description: 'Show commit history in compact format',
				detail:
					'One commit per line — the skimmable view, and usually enough to find the hash you are about to reset, revert or cherry-pick.'
			},
			{
				command: 'git log --oneline --graph --all',
				description: 'Visualize branch history as an ASCII graph',
				detail:
					'Branches and merges drawn right in the terminal, across every branch at once — the closest thing to a commit-graph UI without leaving the shell.'
			},
			{
				command: 'git log -p <file>',
				description: 'Show commit history with diffs for a file',
				detail:
					"Every commit that touched the file, each with its diff — the answer to 'when did this function change, and what did the change look like?'"
			},
			{
				command: 'git log --author="<name>"',
				description: 'Filter commits by author',
				detail:
					'Filter history to one committer — including isolating (or excluding) an AI agent’s commits when it commits under its own identity.'
			},
			{
				command: 'git show <commit>',
				description: 'Display details and diff for a commit',
				detail:
					'The full story of one commit: message, author, and the complete diff. git show HEAD is a quick self-review of what you just committed.'
			},
			{
				command: 'git blame <file>',
				description: 'Show who last modified each line of a file',
				detail:
					'The last commit to touch every line, with author and date. Feed that hash to git show to learn the WHY behind a suspicious line.'
			},
			{
				command: 'git diff <branch1>..<branch2>',
				description: 'Show differences between two branches',
				detail:
					'What branch2 has that branch1 lacks. Run git diff main..feature before opening a PR to see the change exactly as reviewers will.'
			}
		]
	},
	{
		label: 'Rebase & Cherry-pick',
		icon: 'git-pull-request',
		commands: [
			{
				command: 'git rebase <branch>',
				description: 'Reapply commits on top of another branch',
				detail:
					'Lifts your commits and replays them onto the other branch’s tip — linear history, no merge commit. Golden rule: never rebase commits others already have.'
			},
			{
				command: 'git rebase -i HEAD~n',
				description: 'Interactively rebase the last n commits',
				detail:
					"The history editor: reorder, reword, squash or drop the last n commits. The standard cleanup between 'wip wip wip' and a reviewable PR."
			},
			{
				command: 'git rebase --continue',
				description: 'Continue after resolving rebase conflicts',
				detail:
					'After fixing a conflict, git add the files and continue — no commit needed mid-rebase. Git repeats the pause for each conflicting commit.'
			},
			{
				command: 'git rebase --abort',
				description: 'Cancel the rebase and return to original state',
				detail:
					'A guaranteed full rewind to the pre-rebase state. No shame in it: abort, breathe, then retry — or merge instead.'
			},
			{
				command: 'git cherry-pick <commit>',
				description: 'Apply a specific commit to the current branch',
				detail:
					'Copies one commit’s changes onto your branch as a new commit. Perfect for lifting the single good fix out of an abandoned experiment.'
			},
			{
				command: 'git cherry-pick <start>..<end>',
				description:
					'Apply a range of commits (excludes <start> itself; use <start>^.. to include it)',
				detail:
					'The range excludes <start> — a classic off-by-one. Write <start>^..<end> when <start> itself should come along.'
			},
			{
				command: 'git cherry-pick --continue',
				description: 'Resume a cherry-pick after resolving conflicts',
				detail:
					'Same rhythm as a conflicted rebase: fix the files, git add them, continue. The remaining commits in the range keep applying.'
			},
			{
				command: 'git cherry-pick --abort',
				description: 'Cancel a conflicted cherry-pick and restore the branch',
				detail:
					'Cancels the pick and restores the branch to where it stood — cleanly unwinding even a half-applied multi-commit range.'
			}
		]
	},
	{
		label: 'Tags',
		icon: 'tag',
		commands: [
			{
				command: 'git tag',
				description: 'List all tags',
				detail:
					"Alphabetical list. Filter with a pattern (git tag -l 'v2.*'), or add -n to print each tag's message beside it."
			},
			{
				command: 'git tag <name>',
				description: 'Create a lightweight tag at the current commit',
				detail:
					'A lightweight tag is just a pointer — fine as a private bookmark, too thin for a release: no author, no date, no message.'
			},
			{
				command: 'git tag -a <name> -m "<message>"',
				description: 'Create an annotated tag with a message',
				detail:
					'Annotated tags are full objects with tagger, date and message — what release tooling expects. The default choice for version numbers.'
			},
			{
				command: 'git tag -a <name> <commit>',
				description: 'Tag a specific commit',
				detail:
					'Tags retroactively — realized v1.2.0 actually shipped three commits ago? Find the hash in git log and tag it now.'
			},
			{
				command: 'git push <remote> <tag>',
				description: 'Push a specific tag to the remote',
				detail:
					'Tags do NOT ride along with a normal git push — each must be pushed explicitly, or see --tags for all at once.'
			},
			{
				command: 'git push <remote> --tags',
				description: 'Push all tags to the remote',
				detail:
					'Ships every local tag in one go — including your private bookmark tags, so explicit single-tag pushes keep the remote cleaner.'
			},
			{
				command: 'git tag -d <name>',
				description: 'Delete a local tag',
				detail:
					'Local only. If the tag was pushed, also run git push origin --delete <name> — and expect anyone who already fetched it to still have it.'
			}
		]
	},
	{
		label: 'Advanced',
		icon: 'wrench',
		commands: [
			{
				command: 'git bisect start',
				description: 'Begin a binary search to find a buggy commit',
				detail:
					'Mark one good and one bad commit and Git halves the suspect range each round — a thousand commits take about ten tests to narrow to one.'
			},
			{
				command: 'git bisect good <commit>',
				description: 'Mark a commit as good during bisect',
				detail:
					'Also your answer at each checked-out midpoint when the tests pass — bare (no argument) it marks the commit you are standing on.'
			},
			{
				command: 'git bisect bad <commit>',
				description: 'Mark a commit as bad during bisect',
				detail:
					'Bare, it marks the current checkout — so a plain git bisect bad is the usual answer when the midpoint fails your test.'
			},
			{
				command: 'git bisect reset',
				description: 'End the bisect session and return to original HEAD',
				detail:
					'Run it even after Git names the culprit — until you do, you are still detached at the last tested commit, not back on your branch.'
			},
			{
				command: 'git reflog',
				description: 'Show a log of all reference updates (recovery tool)',
				detail:
					"Every place HEAD has been for ~90 days — it survives resets, rebases and deleted branches. The panic button when work 'disappeared'."
			},
			{
				command: 'git reset --hard HEAD@{1}',
				description: 'Move the branch back to where HEAD was one move ago',
				detail:
					'The standard rescue after a wrong reset: HEAD@{1} means "wherever HEAD was one move ago". Read git reflog to pick the right index.'
			},
			{
				command: 'git submodule add <url> <path>',
				description: 'Add a repository as a submodule',
				detail:
					'Pins another repo at an exact commit inside yours. Powerful and famously fussy — for dependencies, a package manager is usually kinder.'
			},
			{
				command: 'git submodule update --init --recursive',
				description: 'Initialize and update all submodules',
				detail:
					'The incantation after cloning a repo that uses submodules — until you run it, the submodule folders sit empty and builds fail mysteriously.'
			},
			{
				command: 'git worktree add <path> <branch>',
				description: 'Create a linked working tree for a branch',
				detail:
					'A second working directory sharing the same .git — run tests on one branch while editing another, or give each AI agent its own checkout.'
			},
			{
				command: 'git worktree add -b <branch> <path>',
				description: 'Create a new branch in its own working tree',
				detail:
					'Creates the branch and its directory in one step — the fast lane for spinning up a parallel agent workspace on fresh work.'
			},
			{
				command: 'git worktree list',
				description: 'List all working trees for this repo',
				detail:
					'Every checkout of this repository and which branch each one holds — your fleet dashboard when several agents work in parallel.'
			},
			{
				command: 'git worktree remove <path>',
				description: 'Remove a working tree (branch survives)',
				detail:
					'Deletes the directory; the branch and its commits survive. Git refuses if uncommitted changes would be lost (--force overrides).'
			},
			{
				command: 'git worktree prune',
				description: 'Clean up records of deleted working trees',
				detail:
					'Housekeeping for worktrees removed with plain rm -rf instead of worktree remove — clears the stale bookkeeping entries.'
			}
		]
	}
];
