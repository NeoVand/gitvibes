export interface CheatSheetCommand {
	command: string;
	description: string;
}

export interface CheatSheetCategory {
	label: string;
	icon: string; // lucide icon name for reference
	commands: CheatSheetCommand[];
}

export const cheatSheet: CheatSheetCategory[] = [
	{
		label: 'Setup & Config',
		icon: 'settings',
		commands: [
			{ command: 'git init', description: 'Initialize a new local repository' },
			{ command: 'git init <directory>', description: 'Create a new repo in the specified directory' },
			{ command: 'git clone <url>', description: 'Clone a remote repository to your machine' },
			{
				command: 'git clone --depth 1 <url>',
				description: 'Shallow clone with only the latest commit'
			},
			{
				command: 'git config --global user.name "<name>"',
				description: 'Set your name for all repositories'
			},
			{
				command: 'git config --global user.email "<email>"',
				description: 'Set your email for all repositories'
			},
			{
				command: 'git config --global core.editor "<editor>"',
				description: 'Set default text editor for Git'
			},
			{ command: 'git config --list', description: 'List all current configuration settings' }
		]
	},
	{
		label: 'Basic Workflow',
		icon: 'git-commit-horizontal',
		commands: [
			{ command: 'git status', description: 'Show the working tree status' },
			{ command: 'git add <file>', description: 'Stage a specific file for commit' },
			{ command: 'git add .', description: 'Stage all changes in the current directory' },
			{ command: 'git add -p', description: 'Interactively stage hunks of changes' },
			{ command: 'git commit -m "<message>"', description: 'Commit staged changes with a message' },
			{ command: 'git commit -am "<message>"', description: 'Stage and commit tracked files in one step' },
			{ command: 'git commit --amend', description: 'Modify the most recent commit' },
			{ command: 'git diff', description: 'Show unstaged changes in the working directory' },
			{ command: 'git diff --staged', description: 'Show changes staged for the next commit' }
		]
	},
	{
		label: 'Branching',
		icon: 'git-branch',
		commands: [
			{ command: 'git branch', description: 'List all local branches' },
			{ command: 'git branch -a', description: 'List all branches including remote' },
			{ command: 'git branch <name>', description: 'Create a new branch' },
			{ command: 'git branch -d <name>', description: 'Delete a fully merged branch' },
			{ command: 'git branch -D <name>', description: 'Force delete a branch regardless of merge status' },
			{ command: 'git switch <branch>', description: 'Switch to an existing branch' },
			{ command: 'git switch -c <branch>', description: 'Create and switch to a new branch' },
			{
				command: 'git merge <branch>',
				description: 'Merge the specified branch into the current branch'
			}
		]
	},
	{
		label: 'Remote',
		icon: 'cloud',
		commands: [
			{ command: 'git remote -v', description: 'List all remote connections with URLs' },
			{ command: 'git remote add <name> <url>', description: 'Add a new remote repository' },
			{ command: 'git remote remove <name>', description: 'Remove a remote connection' },
			{
				command: 'git remote rename <old> <new>',
				description: 'Rename an existing remote'
			},
			{ command: 'git fetch <remote>', description: 'Download objects and refs from a remote' },
			{ command: 'git fetch --prune', description: 'Fetch and remove stale remote-tracking branches' },
			{
				command: 'git pull <remote> <branch>',
				description: 'Fetch and merge changes from a remote branch'
			},
			{ command: 'git push <remote> <branch>', description: 'Push local commits to a remote branch' },
			{
				command: 'git push -u <remote> <branch>',
				description: 'Push and set the upstream tracking branch'
			}
		]
	},
	{
		label: 'Stashing',
		icon: 'archive',
		commands: [
			{ command: 'git stash', description: 'Stash uncommitted changes in the working directory' },
			{
				command: 'git stash push -m "<message>"',
				description: 'Stash changes with a descriptive message'
			},
			{ command: 'git stash list', description: 'List all stashed changesets' },
			{ command: 'git stash pop', description: 'Apply the latest stash and remove it from the list' },
			{
				command: 'git stash apply',
				description: 'Apply the latest stash but keep it in the list'
			},
			{
				command: 'git stash apply stash@{n}',
				description: 'Apply a specific stash by index'
			},
			{ command: 'git stash drop stash@{n}', description: 'Remove a specific stash entry' },
			{ command: 'git stash clear', description: 'Remove all stash entries' }
		]
	},
	{
		label: 'Undoing',
		icon: 'undo-2',
		commands: [
			{
				command: 'git restore <file>',
				description: 'Discard changes in the working directory'
			},
			{
				command: 'git restore --staged <file>',
				description: 'Unstage a file while keeping changes'
			},
			{ command: 'git reset <file>', description: 'Unstage a file (same as restore --staged)' },
			{
				command: 'git reset --soft HEAD~1',
				description: 'Undo last commit but keep changes staged'
			},
			{
				command: 'git reset --mixed HEAD~1',
				description: 'Undo last commit and unstage changes'
			},
			{
				command: 'git reset --hard HEAD~1',
				description: 'Undo last commit and discard all changes'
			},
			{
				command: 'git revert <commit>',
				description: 'Create a new commit that undoes a previous commit'
			},
			{
				command: 'git clean -fd',
				description: 'Remove untracked files and directories'
			}
		]
	},
	{
		label: 'History & Inspection',
		icon: 'history',
		commands: [
			{ command: 'git log', description: 'Show the full commit history' },
			{ command: 'git log --oneline', description: 'Show commit history in compact format' },
			{
				command: 'git log --oneline --graph --all',
				description: 'Visualize branch history as an ASCII graph'
			},
			{ command: 'git log -p <file>', description: 'Show commit history with diffs for a file' },
			{
				command: 'git log --author="<name>"',
				description: 'Filter commits by author'
			},
			{ command: 'git show <commit>', description: 'Display details and diff for a commit' },
			{ command: 'git blame <file>', description: 'Show who last modified each line of a file' },
			{
				command: 'git diff <branch1>..<branch2>',
				description: 'Show differences between two branches'
			}
		]
	},
	{
		label: 'Rebase & Cherry-pick',
		icon: 'git-pull-request',
		commands: [
			{
				command: 'git rebase <branch>',
				description: 'Reapply commits on top of another branch'
			},
			{
				command: 'git rebase -i HEAD~n',
				description: 'Interactively rebase the last n commits'
			},
			{ command: 'git rebase --continue', description: 'Continue after resolving rebase conflicts' },
			{ command: 'git rebase --abort', description: 'Cancel the rebase and return to original state' },
			{
				command: 'git cherry-pick <commit>',
				description: 'Apply a specific commit to the current branch'
			},
			{
				command: 'git cherry-pick <start>..<end>',
				description: 'Apply a range of commits to the current branch'
			}
		]
	},
	{
		label: 'Tags',
		icon: 'tag',
		commands: [
			{ command: 'git tag', description: 'List all tags' },
			{ command: 'git tag <name>', description: 'Create a lightweight tag at the current commit' },
			{
				command: 'git tag -a <name> -m "<message>"',
				description: 'Create an annotated tag with a message'
			},
			{ command: 'git tag -a <name> <commit>', description: 'Tag a specific commit' },
			{ command: 'git push <remote> <tag>', description: 'Push a specific tag to the remote' },
			{ command: 'git push <remote> --tags', description: 'Push all tags to the remote' },
			{ command: 'git tag -d <name>', description: 'Delete a local tag' }
		]
	},
	{
		label: 'Advanced',
		icon: 'wrench',
		commands: [
			{
				command: 'git bisect start',
				description: 'Begin a binary search to find a buggy commit'
			},
			{ command: 'git bisect good <commit>', description: 'Mark a commit as good during bisect' },
			{ command: 'git bisect bad <commit>', description: 'Mark a commit as bad during bisect' },
			{ command: 'git bisect reset', description: 'End the bisect session and return to original HEAD' },
			{
				command: 'git reflog',
				description: 'Show a log of all reference updates (recovery tool)'
			},
			{
				command: 'git submodule add <url> <path>',
				description: 'Add a repository as a submodule'
			},
			{
				command: 'git submodule update --init --recursive',
				description: 'Initialize and update all submodules'
			},
			{
				command: 'git worktree add <path> <branch>',
				description: 'Create a linked working tree for a branch'
			}
		]
	}
];
