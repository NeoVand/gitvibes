export interface SandboxStep {
	command: string;
	output?: string;
	description?: string;
	diagram: string;
}

// ── Part 2: Core Safety Loop ────────────────────────────────────────
export const coreLoopSteps: SandboxStep[] = [
	{
		command: 'git status',
		description: 'Check what the AI changed',
		output: `On branch feature/add-auth
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)

\tmodified:   src/auth.py
\tmodified:   src/routes.py
\tmodified:   tests/test_auth.py

Untracked files:
\tnew file:   src/middleware.py`,
		diagram: `graph TD
  A["Working Dir"] -->|4 files| B["Staging"]
  B -.->|empty| C["Repository"]`
	},
	{
		command: 'git add src/auth.py src/routes.py',
		description: 'Stage the files you reviewed and approved',
		output: '',
		diagram: `graph TD
  A["Working Dir"] -->|"git add"| B["Staging"]
  B -.-> C["Repository"]`
	},
	{
		command: 'git add .',
		description: 'Stage all remaining changes',
		output: '',
		diagram: `graph TD
  A["Working Dir"] -->|"git add ."| B["Staging"]
  B -.-> C["Repository"]`
	},
	{
		command: 'git commit -m "feat: Add user authentication endpoint"',
		description: 'Create a permanent save point',
		output: `[feature/add-auth a1b2c3d] feat: Add user authentication endpoint
 4 files changed, 127 insertions(+), 3 deletions(-)
 create mode 100644 src/middleware.py`,
		diagram: `graph TD
  A["Working Dir"] --> B["Staging"]
  B -->|"git commit"| C["Repository"]`
	}
];

// ── Part 3: Branching ───────────────────────────────────────────────
export const branchingSteps: SandboxStep[] = [
	{
		command: 'git log --oneline',
		description: 'View current state on main',
		output: `b4d5e6f (HEAD -> main) Stable feature A
a1b2c3d Initial commit`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Stable feature A"`
	},
	{
		command: 'git switch -c feature/ai-experiment',
		description: 'Create an isolated branch for AI work',
		output: `Switched to a new branch 'feature/ai-experiment'`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Stable feature A"
  branch feature/ai-experiment
  checkout feature/ai-experiment
  commit id: " " type: HIGHLIGHT`
	},
	{
		command: 'git commit -m "feat: AI refactor - attempt 1"',
		description: 'First AI-generated commit on the branch',
		output: `[feature/ai-experiment c7d8e9f] feat: AI refactor - attempt 1
 3 files changed, 45 insertions(+), 12 deletions(-)`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Stable feature A"
  branch feature/ai-experiment
  checkout feature/ai-experiment
  commit id: "AI refactor attempt 1"`
	},
	{
		command: 'git commit -m "feat: AI refactor - attempt 2"',
		description: 'Second iteration',
		output: `[feature/ai-experiment d0e1f2a] feat: AI refactor - attempt 2
 2 files changed, 18 insertions(+), 5 deletions(-)`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Stable feature A"
  branch feature/ai-experiment
  checkout feature/ai-experiment
  commit id: "AI refactor attempt 1"
  commit id: "AI refactor attempt 2"`
	},
	{
		command: 'git push -u origin feature/ai-experiment',
		description: 'Push the branch to create a Pull Request',
		output: `Enumerating objects: 12, done.
Counting objects: 100% (12/12), done.
To https://github.com/your-org/project.git
 * [new branch]      feature/ai-experiment -> feature/ai-experiment
Branch 'feature/ai-experiment' set up to track 'origin/feature/ai-experiment'.`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Stable feature A"
  branch feature/ai-experiment
  checkout feature/ai-experiment
  commit id: "AI refactor attempt 1"
  commit id: "AI refactor attempt 2" type: HIGHLIGHT`
	}
];

// ── Part 4: Undo Toolkit ────────────────────────────────────────────
export const undoSteps: SandboxStep[] = [
	{
		command: 'git status',
		description: 'AI made a mess of 3 files',
		output: `On branch feature/experiment
Changes not staged for commit:
\tmodified:   src/model.py
\tmodified:   src/utils.py
\tmodified:   src/config.py`,
		diagram: `graph LR
  A["Working Dir"] -->|modified| B["model.py"]
  A -->|modified| C["utils.py"]
  A -->|modified| D["config.py"]`
	},
	{
		command: 'git restore src/model.py',
		description: 'Scenario 1: Discard local changes to one file',
		output: ``,
		diagram: `graph LR
  A["model.py"] -->|"git restore"| B["Last Commit"]`
	},
	{
		command: 'git restore --staged src/utils.py',
		description: 'Scenario 2: Unstage a file staged by accident',
		output: ``,
		diagram: `graph LR
  A["Staged"] -->|"git restore --staged"| B["Unstaged"]`
	},
	{
		command: 'git commit --amend --no-edit',
		description: 'Scenario 3: Add a forgotten file to the last commit',
		output: `[feature/experiment a2b3c4e] feat: Update model and config
 Date: Mon Mar 27 10:30:00 2026 -0700
 3 files changed, 45 insertions(+), 12 deletions(-)`,
		diagram: `graph LR
  A["Forgotten file"] -->|"git add + amend"| B["Updated last commit"]`
	},
	{
		command: 'git reset --soft HEAD~1',
		description: 'Scenario 4: Undo last commit but keep changes',
		output: ``,
		diagram: `graph LR
  A["Commit"] -->|"git reset --soft"| B["Staging Area"]`
	},
	{
		command: 'git revert a1b2c3d',
		description: 'Scenario 5: Safely undo a pushed commit',
		output: `[main e5f6a7b] Revert "feat: Add buggy AI feature"
 2 files changed, 3 deletions(-)`,
		diagram: `gitGraph
  commit id: "Good"
  commit id: "Bad" type: REVERSE
  commit id: "Revert" type: HIGHLIGHT`
	}
];

// ── Part 5: Stash ───────────────────────────────────────────────────
export const stashSteps: SandboxStep[] = [
	{
		command: 'git status',
		description: 'Working on feature/A with uncommitted changes',
		output: `On branch feature/A
Changes not staged for commit:
\tmodified:   src/pipeline.py
\tmodified:   src/transform.py
\tmodified:   src/loader.py`,
		diagram: `gitGraph
  commit id: "Last commit on main"
  branch feature/A
  commit id: "Start AI refactor"
  commit id: "WIP changes" type: HIGHLIGHT`
	},
	{
		command: 'git stash push -m "WIP: refactoring pipeline, AI changes"',
		description: 'Stash your dirty changes temporarily',
		output: `Saved working directory and index state
  On feature/A: WIP: refactoring pipeline, AI changes`,
		diagram: `gitGraph
  commit id: "Last commit on main"
  branch feature/A
  commit id: "Start AI refactor"`
	},
	{
		command: 'git switch main && git switch -c hotfix/urgent-bug',
		description: 'Switch to main and create hotfix branch',
		output: `Switched to branch 'main'
Switched to a new branch 'hotfix/urgent-bug'`,
		diagram: `gitGraph
  commit id: "Last commit on main"
  branch feature/A
  commit id: "Start AI refactor"
  checkout main
  branch hotfix/urgent-bug
  commit id: " " type: HIGHLIGHT`
	},
	{
		command: 'git commit -m "fix: Resolve urgent production bug"',
		description: 'Fix the bug and commit',
		output: `[hotfix/urgent-bug f1a2b3c] fix: Resolve urgent production bug
 1 file changed, 5 insertions(+), 2 deletions(-)`,
		diagram: `gitGraph
  commit id: "Last commit on main"
  branch feature/A
  commit id: "Start AI refactor"
  checkout main
  branch hotfix/urgent-bug
  commit id: "Fix urgent bug"`
	},
	{
		command: 'git switch feature/A && git stash pop',
		description: 'Return to your work and restore stashed changes',
		output: `Switched to branch 'feature/A'
On branch feature/A
Changes not staged for commit:
\tmodified:   src/pipeline.py
\tmodified:   src/transform.py
\tmodified:   src/loader.py

Dropped refs/stash@{0}`,
		diagram: `gitGraph
  commit id: "Last commit on main"
  branch feature/A
  commit id: "Start AI refactor"
  commit id: "Continue AI refactor" type: HIGHLIGHT
  checkout main
  branch hotfix/urgent-bug
  commit id: "Fix urgent bug"
  checkout main
  merge hotfix/urgent-bug`
	}
];

// ── Part 5: Rebase vs Merge ─────────────────────────────────────────
export const rebaseMergeSteps: SandboxStep[] = [
	{
		command: 'git log --oneline --all --graph',
		description: 'Your branch is behind main',
		output: `* f1a2b3c (feature) D - your work
* e5f6a7b (feature) C - your work
| * d4e5f6a (main) F - teammate
| * c3d4e5f (main) E - teammate
|/
* b2c3d4e B - shared history
* a1b2c3d A - shared history`,
		diagram: `gitGraph
  commit id: "A"
  commit id: "B"
  branch feature
  commit id: "C"
  commit id: "D"
  checkout main
  commit id: "E"
  commit id: "F"`
	},
	{
		command: 'git merge main',
		description: 'Option 1: Merge creates a merge commit',
		output: `Merge made by the 'ort' strategy.
 2 files changed, 15 insertions(+)`,
		diagram: `gitGraph
  commit id: "A"
  commit id: "B"
  branch feature
  commit id: "C"
  commit id: "D"
  checkout main
  commit id: "E"
  commit id: "F"
  checkout feature
  merge main id: "Merge commit"`
	},
	{
		command: 'git rebase main',
		description: 'Option 2: Rebase replays your commits on top',
		output: `Successfully rebased and updated refs/heads/feature.`,
		diagram: `gitGraph
  commit id: "A"
  commit id: "B"
  commit id: "E"
  commit id: "F"
  branch feature
  commit id: "C'"
  commit id: "D'"`
	}
];

// ── Part 5: Merge Conflicts ─────────────────────────────────────────
export const conflictSteps: SandboxStep[] = [
	{
		command: 'git pull origin main',
		description: 'Pulling triggers a conflict',
		output: `Auto-merging src/model.py
CONFLICT (content): Merge conflict in src/model.py
Automatic merge failed; fix conflicts and then commit the result.`,
		diagram: `graph TD
  A["Pull"] --> B["CONFLICT"]
  B -.-> C["Status"]
  C -.-> D["Fix"]
  D -.-> E["Stage"]
  E -.-> F["Commit"]`
	},
	{
		command: 'git status',
		description: 'Check which files have conflicts',
		output: `On branch feature/ai-experiment
You have unmerged paths.
  (fix conflicts and run "git commit")

Unmerged paths:
  (use "git add <file>..." to mark resolution)
\tboth modified:   src/model.py`,
		diagram: `graph TD
  A["Pull"] --> B["CONFLICT"]
  B --> C["Status"]
  C -.-> D["Fix"]
  D -.-> E["Stage"]
  E -.-> F["Commit"]`
	},
	{
		command: 'code src/model.py',
		description: 'Open the file and resolve conflict markers',
		output: `<<<<<<< HEAD
# Your AI's change
x = 10
=======
# Your teammate's change
x = 5
>>>>>>> origin/main`,
		diagram: `graph TD
  A["Pull"] --> B["CONFLICT"]
  B --> C["Status"]
  C --> D["Fix"]
  D -.-> E["Stage"]
  E -.-> F["Commit"]`
	},
	{
		command: 'git add src/model.py',
		description: 'Mark the conflict as resolved',
		output: ``,
		diagram: `graph TD
  A["Pull"] --> B["CONFLICT"]
  B --> C["Status"]
  C --> D["Fix"]
  D --> E["Stage"]
  E -.-> F["Commit"]`
	},
	{
		command: 'git commit -m "fix: Resolve merge conflict in model.py"',
		description: 'Finalize the merge',
		output: `[feature/ai-experiment g8h9i0j] fix: Resolve merge conflict in model.py`,
		diagram: `graph TD
  A["Pull"] --> B["CONFLICT"]
  B --> C["Status"]
  C --> D["Fix"]
  D --> E["Stage"]
  E --> F["Commit"]`
	}
];

// ── Part 3: Wrong branch — committed to main ────────────────────────
export const wrongBranchSteps: SandboxStep[] = [
	{
		command: 'git log --oneline',
		description: 'You accidentally committed to main',
		output: `c3d4e5f (HEAD -> main) feat: Add payment processing
b2c3d4e feat: Add user model
a1b2c3d Initial commit`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add user model"
  commit id: "Payment (oops!)" type: REVERSE`
	},
	{
		command: 'git branch feature/payments',
		description: 'Create a branch that includes the accidental commit',
		output: ``,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add user model"
  commit id: "Payment"
  branch feature/payments`
	},
	{
		command: 'git reset --hard HEAD~1',
		description: 'Remove the commit from main',
		output: `HEAD is now at b2c3d4e feat: Add user model`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add user model"
  branch feature/payments
  commit id: "Payment"`
	},
	{
		command: 'git switch feature/payments',
		description: 'Switch to the feature branch to verify',
		output: `Switched to branch 'feature/payments'`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add user model"
  branch feature/payments
  checkout feature/payments
  commit id: "Payment" type: HIGHLIGHT`
	}
];

// ── Part 4: Accidental stage — unstage secrets ──────────────────────
export const accidentalStageSteps: SandboxStep[] = [
	{
		command: 'git status',
		description: 'You ran git add . and staged everything',
		output: `On branch main
Changes to be committed:
\tmodified:   src/app.py
\tmodified:   .env
\tnew file:   src/debug.py
\tnew file:   src/feature.py`,
		diagram: `graph TD
  A[".env ⚠️"] --> S["Staging"]
  B["debug.py ⚠️"] --> S
  C["app.py ✓"] --> S
  D["feature.py ✓"] --> S`
	},
	{
		command: 'git restore --staged .env',
		description: 'Unstage the secrets file',
		output: ``,
		diagram: `graph TD
  A[".env"] -.->|unstaged| W["Working Dir"]
  B["debug.py ⚠️"] --> S["Staging"]
  C["app.py ✓"] --> S
  D["feature.py ✓"] --> S`
	},
	{
		command: 'git restore --staged src/debug.py',
		description: 'Unstage the debug file with pdb',
		output: ``,
		diagram: `graph TD
  A[".env"] -.-> W["Working Dir"]
  B["debug.py"] -.-> W
  C["app.py ✓"] --> S["Staging"]
  D["feature.py ✓"] --> S`
	},
	{
		command: 'git status',
		description: 'Verify only safe files remain staged',
		output: `On branch main
Changes to be committed:
\tmodified:   src/app.py
\tnew file:   src/feature.py

Changes not staged for commit:
\tmodified:   .env

Untracked files:
\tnew file:   src/debug.py`,
		diagram: `graph TD
  C["app.py ✓"] --> S["Staging"]
  D["feature.py ✓"] --> S
  S --> R["Ready to commit"]`
	},
	{
		command: 'git commit -m "feat: Add server runner and new feature"',
		description: 'Commit only the safe, reviewed files',
		output: `[main f1a2b3c] feat: Add server runner and new feature
 2 files changed, 8 insertions(+), 1 deletion(-)
 create mode 100644 src/feature.py`,
		diagram: `graph TD
  S["Staging"] -->|"git commit"| R["Repository"]
  W[".env + debug.py"] -.-> W2["Still in working dir"]`
	}
];

// ── Part 4: Force push — rewrite remote history ─────────────────────
export const forcePushSteps: SandboxStep[] = [
	{
		command: 'git log --oneline',
		description: 'Two bad commits on your feature branch',
		output: `d0e1f2a (HEAD -> feature/cleanup) wip: trying to fix
c3d4e5f bad: AI broke everything
b2c3d4e feat: Add core logic
a1b2c3d Initial commit`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add core logic"
  branch feature/cleanup
  commit id: "AI broke it" type: REVERSE
  commit id: "Trying to fix" type: REVERSE`
	},
	{
		command: 'git reset --hard HEAD~2',
		description: 'Go back to the last good commit',
		output: `HEAD is now at b2c3d4e feat: Add core logic`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add core logic" type: HIGHLIGHT`
	},
	{
		command: 'git log --oneline',
		description: 'Verify history is clean',
		output: `b2c3d4e (HEAD -> feature/cleanup) feat: Add core logic
a1b2c3d Initial commit`,
		diagram: `gitGraph
  commit id: "Initial commit"
  commit id: "Add core logic" type: HIGHLIGHT`
	},
	{
		command: 'git push --force origin feature/cleanup',
		description: 'Force push to overwrite the remote',
		output: `Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/your-org/project.git
 + d0e1f2a...b2c3d4e feature/cleanup -> feature/cleanup (forced update)`,
		diagram: `sequenceDiagram
  participant L as Local
  participant R as origin
  L->>R: push --force
  Note over R: History rewritten`
	}
];

// ── Part 3: Sync with remote ─────────────────────────────────────────
export const syncSteps: SandboxStep[] = [
	{
		command: 'git fetch origin',
		description: 'Download teammates\' commits without merging yet',
		output: `remote: Enumerating objects: 8, done.
From https://github.com/your-org/project
   b2c3d4e..f1a2b3c  main       -> origin/main`,
		diagram: `sequenceDiagram
  participant R as origin/main
  participant L as Local
  R->>L: fetch (download only)`
	},
	{
		command: 'git log --oneline --all',
		description: 'See what arrived from the remote',
		output: `f1a2b3c (origin/main) Teammate commit F
e5f6a7b (origin/main) Teammate commit E
b2c3d4e (HEAD -> feature/sync) My feature commit
a1b2c3d (main) Local main`,
		diagram: `gitGraph
  commit id: "Shared"
  commit id: "Local main"
  branch feature/sync
  commit id: "My feature"
  checkout main
  commit id: "Teammate E"
  commit id: "Teammate F"`
	},
	{
		command: 'git merge origin/main',
		description: 'Bring remote updates into your feature branch',
		output: `Merge made by the 'ort' strategy.
 1 file changed, 5 insertions(+)`,
		diagram: `sequenceDiagram
  participant L as feature branch
  L->>L: merge origin/main`
	},
	{
		command: 'git push -u origin feature/sync-practice',
		description: 'Upload your updated branch to the remote',
		output: `Enumerating objects: 6, done.
To https://github.com/your-org/project.git
 * [new branch]      feature/sync-practice -> feature/sync-practice
Branch 'feature/sync-practice' set up to track 'origin/feature/sync-practice'.`,
		diagram: `sequenceDiagram
  participant L as Local
  participant R as origin
  L->>R: push`
	}
];
