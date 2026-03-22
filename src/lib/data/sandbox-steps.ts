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
  subgraph WD["Working Directory"]
    F1["auth.py"] & F2["routes.py"] & F3["test_auth.py"] & F4["middleware.py"]
  end
  subgraph SA["Staging Area"]
    E1["(empty)"]
  end
  subgraph R["Repository"]
    C1["Initial setup"]
  end
  WD -.->|"git add"| SA -.->|"git commit"| R
  style WD fill:#fef2f2,stroke:#ef4444
  style SA fill:#fffbeb,stroke:#f59e0b
  style R fill:#ecfdf5,stroke:#10b981`
	},
	{
		command: 'git add src/auth.py src/routes.py',
		description: 'Stage the files you reviewed and approved',
		output: '',
		diagram: `graph TD
  subgraph WD["Working Directory"]
    F3["test_auth.py"] & F4["middleware.py"]
  end
  subgraph SA["Staging Area"]
    S1["auth.py"] & S2["routes.py"]
  end
  subgraph R["Repository"]
    C1["Initial setup"]
  end
  WD -.->|"git add"| SA -.->|"git commit"| R
  style WD fill:#fef2f2,stroke:#ef4444
  style SA fill:#fffbeb,stroke:#f59e0b
  style R fill:#ecfdf5,stroke:#10b981`
	},
	{
		command: 'git add .',
		description: 'Stage all remaining changes',
		output: '',
		diagram: `graph TD
  subgraph WD["Working Directory"]
    E2["(clean)"]
  end
  subgraph SA["Staging Area"]
    S1["auth.py"] & S2["routes.py"] & S3["test_auth.py"] & S4["middleware.py"]
  end
  subgraph R["Repository"]
    C1["Initial setup"]
  end
  WD -.->|"git add"| SA -.->|"git commit"| R
  style WD fill:#ecfdf5,stroke:#10b981
  style SA fill:#fffbeb,stroke:#f59e0b
  style R fill:#ecfdf5,stroke:#10b981`
	},
	{
		command: 'git commit -m "feat: Add user authentication endpoint"',
		description: 'Create a permanent save point',
		output: `[feature/add-auth a1b2c3d] feat: Add user authentication endpoint
 4 files changed, 127 insertions(+), 3 deletions(-)
 create mode 100644 src/middleware.py`,
		diagram: `graph TD
  subgraph WD["Working Directory"]
    E2["(clean)"]
  end
  subgraph SA["Staging Area"]
    E1["(empty)"]
  end
  subgraph R["Repository"]
    C1["Initial setup"] --> C2["feat: Add auth"]
  end
  WD -.->|"git add"| SA -.->|"git commit"| R
  style WD fill:#ecfdf5,stroke:#10b981
  style SA fill:#ecfdf5,stroke:#10b981
  style R fill:#ecfdf5,stroke:#10b981`
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
  commit id: "AI refactor attempt 2"
  checkout main
  commit id: "Teammate update"
  checkout feature/ai-experiment
  commit id: "AI refactor final"
  checkout main
  merge feature/ai-experiment tag: "PR Merged"`
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
		diagram: `graph TD
  A["Mistake Detected"] --> B{"Where is it?"}
  B -->|"Local, Not Committed"| C["git restore"]
  B -->|"Staged, Not Committed"| D["git restore --staged"]
  B -->|"Committed, Not Pushed"| E{"Keep Changes?"}
  B -->|"Pushed to Team"| F["git revert"]
  style C fill:#10b981,color:#fff
  style A fill:#ef4444,color:#fff`
	},
	{
		command: 'git restore src/model.py',
		description: 'Scenario 1: Discard local changes to one file',
		output: ``,
		diagram: `graph TD
  A["Mistake Detected"] --> B{"Where is it?"}
  B -->|"Local, Not Committed"| C["git restore"]
  B -->|"Staged, Not Committed"| D["git restore --staged"]
  B -->|"Committed, Not Pushed"| E{"Keep Changes?"}
  B -->|"Pushed to Team"| F["git revert"]
  C --> I["Changes Discarded"]
  style C fill:#10b981,color:#fff
  style I fill:#10b981,color:#fff`
	},
	{
		command: 'git restore --staged src/utils.py',
		description: 'Scenario 2: Unstage a file staged by accident',
		output: ``,
		diagram: `graph TD
  A["Mistake Detected"] --> B{"Where is it?"}
  B -->|"Local, Not Committed"| C["git restore"]
  B -->|"Staged, Not Committed"| D["git restore --staged"]
  B -->|"Committed, Not Pushed"| E{"Keep Changes?"}
  B -->|"Pushed to Team"| F["git revert"]
  D --> J["File Unstaged"]
  style D fill:#f59e0b,color:#fff
  style J fill:#f59e0b,color:#fff`
	},
	{
		command: 'git reset --soft HEAD~1',
		description: 'Scenario 4: Undo last commit but keep changes',
		output: ``,
		diagram: `graph TD
  A["Mistake Detected"] --> B{"Where is it?"}
  B -->|"Local, Not Committed"| C["git restore"]
  B -->|"Staged, Not Committed"| D["git restore --staged"]
  B -->|"Committed, Not Pushed"| E{"Keep Changes?"}
  B -->|"Pushed to Team"| F["git revert"]
  E -->|"Yes"| G["git reset --soft"]
  G --> K["Changes Back to Staging"]
  style E fill:#8b5cf6,color:#fff
  style G fill:#8b5cf6,color:#fff
  style K fill:#8b5cf6,color:#fff`
	},
	{
		command: 'git revert a1b2c3d',
		description: 'Scenario 5: Safely undo a pushed commit',
		output: `[main e5f6a7b] Revert "feat: Add buggy AI feature"
 2 files changed, 3 deletions(-)`,
		diagram: `gitGraph
  commit id: "Good commit"
  commit id: "Bad commit" type: REVERSE
  commit id: "Revert bad commit" type: HIGHLIGHT
  commit id: "Continue work"`
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
		command: 'git stash save "WIP: refactoring pipeline, AI changes"',
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
  A["git pull / merge / rebase"] --> B["CONFLICT detected"]
  B --> C["git status: see unmerged files"]
  C --> D["Open file: see conflict markers"]
  D --> E["Edit file: choose correct code"]
  E --> F["git add src/model.py"]
  F --> G["git commit"]
  style B fill:#ef4444,color:#fff
  style A fill:#6366f1,color:#fff`
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
  A["git pull / merge / rebase"] --> B["CONFLICT detected"]
  B --> C["git status: see unmerged files"]
  C --> D["Open file: see conflict markers"]
  D --> E["Edit file: choose correct code"]
  E --> F["git add src/model.py"]
  F --> G["git commit"]
  style B fill:#ef4444,color:#fff
  style C fill:#f59e0b,color:#fff`
	},
	{
		command: 'code src/model.py',
		description: 'Open the file and resolve conflict markers',
		output: `<<<<<<< HEAD
// Your AI's change
const x = 10;
=======
// Your teammate's change
const x = 5;
>>>>>>> origin/main`,
		diagram: `graph TD
  A["git pull / merge / rebase"] --> B["CONFLICT detected"]
  B --> C["git status: see unmerged files"]
  C --> D["Open file: see conflict markers"]
  D --> E["Edit file: choose correct code"]
  E --> F["git add src/model.py"]
  F --> G["git commit"]
  style B fill:#ef4444,color:#fff
  style D fill:#f59e0b,color:#fff`
	},
	{
		command: 'git add src/model.py',
		description: 'Mark the conflict as resolved',
		output: ``,
		diagram: `graph TD
  A["git pull / merge / rebase"] --> B["CONFLICT detected"]
  B --> C["git status: see unmerged files"]
  C --> D["Open file: see conflict markers"]
  D --> E["Edit file: choose correct code"]
  E --> F["git add src/model.py"]
  F --> G["git commit"]
  style B fill:#ef4444,color:#fff
  style F fill:#10b981,color:#fff`
	},
	{
		command: 'git commit -m "fix: Resolve merge conflict in model.py"',
		description: 'Finalize the merge',
		output: `[feature/ai-experiment g8h9i0j] fix: Resolve merge conflict in model.py`,
		diagram: `graph TD
  A["git pull / merge / rebase"] --> B["CONFLICT detected"]
  B --> C["git status: see unmerged files"]
  C --> D["Open file: see conflict markers"]
  D --> E["Edit file: choose correct code"]
  E --> F["git add src/model.py"]
  F --> G["git commit"]
  style B fill:#ef4444,color:#fff
  style G fill:#10b981,color:#fff`
	}
];
