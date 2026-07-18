<script lang="ts">
	import { GitBranch, GitPullRequest, RefreshCcw } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';

	import VibeBox from '../ui/VibeBox.svelte';
	import Code from '../ui/Code.svelte';
</script>

<section id="part-3" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={GitBranch}
			partLabel="Part 3"
			title="Parallel Universes: Branching for AI Experiments"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"A branch is a safe space to be wrong. Create one every time you have an idea."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			Branches are what make Git magical. They let you experiment freely — try a wild AI refactor,
			explore an alternative architecture — without ever risking the stable codebase. Think of them
			as parallel timelines that you can merge back or discard entirely.
		</p>

		<Callout type="important">
			The most important rule in collaborative software development: <strong
				>you never, ever work directly on the <Code code="main" /> branch</strong
			>. The
			<Code code="main" />
			branch represents the official, stable, production-ready code. Your work must happen in an isolated
			"parallel universe" called a <strong>branch</strong>.
		</Callout>

		<!-- 3.1 Creating Branches -->
		<div id="section-3-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={GitBranch}
				title="3.1 &quot;I Have a New Idea (or AI Prompt)&quot;"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You have a feature idea — or maybe an ambitious AI prompt that might refactor half your
				codebase. Before you do anything, create a branch where it's safe to experiment.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-branch.webp"
					alt="git branch — a parallel path diverging from main for safe experimentation"
					caption="Branches let you experiment without risking the stable codebase"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You want to try a new feature or a massive AI-driven refactor. Before
				you write a single line or prompt, create a safe, isolated branch.
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				First, make sure you're on <Code code="main" />
				and it's up to date. Then create your branch:
			</p>

			<CodeBlock
				title="Create and switch to a new branch"
				code={`git switch -c feature/my-new-idea
# Older equivalent: git checkout -b feature/my-new-idea`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, this is even easier. Look at the <strong>bottom-left corner</strong> of your
				window -- you'll see the current branch name (e.g., "main"). Click it and you'll get a
				dropdown where you can switch to existing branches or select
				<strong>"+ Create new branch..."</strong> to make a new one:
			</p>

			<VsCodeScreenshot
				src="branches-worktrees/current-branch.png"
				alt="VS Code status bar showing current branch name and the branches dropdown"
				caption="Click the branch name in the bottom-left corner to switch branches or create a new one."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				When you click the branch name, VS Code opens a Quick Pick menu listing all your branches.
				Select <strong>"+ Create new branch..."</strong> at the top, type a name like
				<Code code="feature/my-new-idea" />, and you're immediately switched to it:
			</p>

			<VsCodeScreenshot
				src="overview/gitbranches.png"
				alt="VS Code branch Quick Pick showing create new branch option and existing branches"
				caption="The branch Quick Pick lets you create, switch, or check out branches without touching the terminal."
			/>

			<Callout type="tip">
				Your new branch starts exactly where <Code code="main" />
				is — but it isn't a copy of anything. A branch is just a <em>label</em> pointing at a commit
				(which is why creating one is instant, and why you can have hundreds). From here on, new
				commits move <em>your</em> label while main's stays put. If the AI destroys everything, it
				does not matter: discard the branch and switch back.
				<strong>This workflow enables fearless experimentation.</strong>
			</Callout>

			<Callout type="warning">
				<strong>Common mistake — committed to main by accident?</strong> Don't panic. If you haven't
				pushed yet, the fix is simple: create the feature branch (your commits come with it), then
				switch back to main and
				<Code code="git reset --hard HEAD~1" />
				to remove the commit from main. (Reading that address:
				<Code code="HEAD" />
				is the commit you're standing on, and
				<Code code="~1" />
				means "one step back" — so
				<Code code="HEAD~1" />
				is the previous commit,
				<Code code="HEAD~3" />
				three commits back.) You'll master
				<Code code="git reset" />
				in Part 4. One precondition: make sure
				<Code code="git status" />
				is clean first —
				<Code code="--hard" /> also wipes any uncommitted edits, and those have no undo. Try it yourself
				below:
			</Callout>

			<h4
				id="wrong-branch"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Oops — Committed to Main
			</h4>
			<PlaygroundNote>
				The playground starts with a payment commit on <Code code="main" /> that should be on a feature
				branch. Create the branch, then reset <Code code="main" /> with
				<Code code="git reset --hard HEAD~1" />.
			</PlaygroundNote>
			<LessonActivity
				title="Move Commit to Feature Branch"
				scenarioId="wrong-branch"
				id="wrong-branch"
			/>

			<VibeBox
				prompts={[
					'Create a new branch called feature/user-auth and switch to it',
					'I need to start working on the payment integration — set up a branch for me'
				]}
			/>
		</div>

		<!-- 3.2 Syncing -->
		<div id="section-3-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={RefreshCcw}
				title="3.2 &quot;My Teammate Pushed Updates&quot; (Syncing)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You're not working in a vacuum. While you've been building your feature, your teammates have
				been merging theirs. Staying in sync is how you avoid painful surprises later.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/fetch-pull-push.webp"
					alt="fetch · pull · push — syncing local and remote repositories"
					caption="Fetch checks for updates, pull downloads them, push shares your work"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You've been working on your feature branch for a few days.
				Your teammates have merged their work into
				<Code code="main" />. Your branch is now "stale."
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Before diving into the commands, here's how the three main remote operations relate to each
				other:
			</p>

			<MermaidDiagram
				definition={`sequenceDiagram
    participant L as Local Repo
    participant R as Remote Repo
    rect rgba(99, 102, 241, 0.05)
    R->>L: git fetch — download new commits
    end
    rect rgba(99, 102, 241, 0.05)
    R->>L: git pull — download + merge
    L->>L: auto-merge into branch
    end
    rect rgba(99, 102, 241, 0.05)
    L->>R: git push — upload commits
    end`}
				id="fetch-pull-push"
			/>
			<p class="mt-2 px-1 text-xs" style="color: var(--color-text-muted);">
				Fetch downloads without merging. Pull = fetch + merge. Push uploads your commits.
			</p>

			<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 1: The "Safe" Sync (fetch + merge)
			</h4>
			<CodeBlock
				title="Two-step controlled sync"
				code={`git fetch origin        # Download new commits (doesn't apply them)
git merge origin/main   # Merge the updates into your branch`}
			/>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 2: The "Easy" Sync (pull)
			</h4>
			<CodeBlock
				title="One-step sync"
				code="git pull origin main    # Fetch + merge in one command"
			/>

			<Callout type="tip">
				As a best practice, <Code code="git fetch" />
				first to see what's coming before merging.
				<Code code="git pull" />
				is just a "black box" shortcut.
			</Callout>

			<Callout type="important">
				<strong>When plain <Code code="git pull" /> refuses to run:</strong>
				if your branch and the remote have <em>both</em> moved (you committed locally, a teammate
				pushed), modern Git stops with
				<Code code="fatal: Need to specify how to reconcile divergent branches." />
				It's asking which strategy you want:
				<Code code="git pull --no-rebase" />
				(merge, like this section) or
				<Code code="git pull --rebase" />
				(replay your commits on top — the cleaner habit you'll learn in section 5.2). Pick a default once
				with
				<Code code="git config --global pull.rebase true" /> and you'll never see the error again.
			</Callout>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code makes syncing visual. Look at the <strong>status bar</strong> at the bottom of your
				window -- you'll see small arrows with numbers showing how many commits are incoming (to
				pull) and outgoing (to push). Click the <strong>sync icon</strong> (circular arrows) to pull and
				push in one step:
			</p>

			<VsCodeScreenshot
				src="overview/incoming-outgoing-changes.png"
				alt="VS Code Source Control showing incoming and outgoing changes with commit counts"
				caption="The incoming/outgoing section shows exactly which commits you need to pull and which you'll push."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				You'll also see a prominent <strong>"Sync Changes"</strong> button right in the Source Control
				panel. It shows the exact count of incoming and outgoing commits, so you always know what's about
				to happen:
			</p>

			<VsCodeScreenshot
				src="quickstart/sync-changes.png"
				alt="VS Code Source Control showing Sync Changes button with incoming and outgoing commit counts"
				caption="The Sync Changes button combines pull + push in one click. The numbers show incoming (↓) and outgoing (↑) commit counts."
			/>

			<h4
				id="sync-remote"
				class="mt-8 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Fetch and Merge Remote Updates
			</h4>
			<PlaygroundNote>
				The playground simulates a remote called <Code code="origin" />
				— no real network calls. After
				<Code code="git fetch origin" />, run
				<Code code="git log --oneline --all" /> to see both local and remote branches.
			</PlaygroundNote>
			<LessonActivity title="Sync with Remote" scenarioId="sync-remote" id="sync-remote" />

			<VibeBox
				prompts={[
					'Pull the latest changes from main and update my branch',
					'Fetch from origin and tell me if my branch is behind main'
				]}
			/>
		</div>

		<!-- 3.3 Pull Requests -->
		<div id="section-3-3" class="mb-8">
			<SectionHeader
				level="section"
				icon={GitPullRequest}
				title="3.3 &quot;My AI-Generated Feature is Ready&quot; (The Pull Request)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Your feature is built, tested, and committed. But you don't just push it into production —
				you propose it. A pull request is a conversation: "Here's what I built. Let's review it
				together."
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/pull-request.webp"
					alt="Pull request — the quality gate before code merges into main"
					caption="Pull requests are the quality gate between your branch and production"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> Your feature is complete, tested, and ready to be merged into
				<Code code="main" />. You do not merge it directly. You "propose" the change via a
				<strong>Pull Request (PR)</strong>.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Once your feature is ready, push your branch to the remote so your teammates can see it:
			</p>

			<CodeBlock
				title="Push your branch to the remote"
				code={`git push -u origin feature/my-new-idea
# -u links your local branch to the remote branch`}
			/>

			<p class="my-4" style="color: var(--color-text-secondary);">
				Then on GitHub, you'll see a yellow banner: <em
					>"feature/my-new-idea had recent pushes. Compare & pull request."</em
				> Click it to create your PR.
			</p>

			<Callout type="important">
				A <strong>Pull Request</strong> is a request for discussion. It is the formal, auditable
				gate where your human teammates review your AI-generated code, suggest changes, and
				ultimately "sign off" before it enters
				<Code code="main" />. (One vocabulary note for job interviews: "pull request" is the
				GitHub/Bitbucket name. GitLab calls the identical thing a
				<strong>merge request (MR)</strong> — and it's a forge feature, not a Git command. Part 9 tours
				the forges beyond GitHub.)
			</Callout>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The Modern PR Arc: Draft → Ready → Review → Merge
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Open work-in-progress as a <strong>draft PR</strong> — visible to the team, CI running, but explicitly
				not asking for review yet. Click "Ready for review" when it is. Drafts stopped being a nicety
				in the agent era: every cloud coding agent (GitHub Copilot's coding agent, Claude, Codex, Devin)
				delivers its work as a draft PR for you to review — so this arc is the one you'll live in daily.
			</p>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Two more things you'll meet on your first real PR:
			</p>

			<ul
				class="mb-4 list-inside list-disc space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>
					<strong>The merge button is a menu.</strong> "Merge commit" preserves your branch's
					commits; <strong>"Squash and merge"</strong> (the most common team default) collapses the whole
					PR into one clean commit on main; "Rebase and merge" replays them individually. Squash is why
					messy WIP commits on your branch are fine — they vanish at the gate.
				</li>
				<li>
					<strong>An AI reviewer may get there first.</strong> Many repos auto-request a review from GitHub
					Copilot (or a similar bot). Read it like a helpful-but-junior teammate: it only ever leaves
					comments — it never counts toward the required human approval, and it's sometimes wrong. Push
					back when it is.
				</li>
			</ul>

			<Callout type="note">
				Teams enforce all of this with <strong>rulesets</strong> (repo Settings → Rules) — require a
				PR, require passing checks, require an approval before anything reaches
				<Code code="main" />. If your push to main is rejected at work, that's not an error — that's
				the process working.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Writing a good PR description can feel tedious, but AI tools can help with that too:
			</p>

			<Callout type="tip">
				<strong>AI Integration:</strong> GitHub Copilot can write your PR descriptions by summarizing
				your commits. Claude Code can even automate the PR creation process.
			</Callout>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				After the Merge: Leave the Campsite Clean
			</h4>

			<CodeBlock
				title="Post-merge hygiene"
				code={`git switch main
git pull                  # Bring the merged work home
git branch -d feature/my-new-idea   # Delete the merged branch (-d is safe:
                                    # it refuses if work isn't merged)
git fetch --prune         # Drop tracking refs for branches deleted on GitHub`}
			/>

			<p class="mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				(GitHub can auto-delete the remote branch on merge — repo Settings → General →
				"Automatically delete head branches." Turn it on; nobody misses stale branches.)
			</p>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				You don't even need to leave VS Code to create a PR. Install the <strong
					>GitHub Pull Requests</strong
				> extension and you can create PRs, review diffs, add comments, approve, and merge -- all without
				opening your browser:
			</p>

			<VsCodeScreenshot
				src="github/create-pull-request-view.png"
				alt="VS Code GitHub Pull Request creation view with title, description, and reviewer fields"
				caption="Create Pull Requests directly in VS Code with the GitHub Pull Requests extension. AI can even generate the PR description for you."
			/>

			<h4
				id="branching"
				class="mt-8 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Branch, Commit, and Push
			</h4>
			<PlaygroundNote>
				<Code code="git push" />
				in the playground updates a simulated remote — try
				<Code code="git remote -v" /> to see it.
			</PlaygroundNote>
			<LessonActivity title="Branching Workflow" scenarioId="branching" id="branching" />

			<VibeBox
				prompts={[
					'Push this branch and create a pull request with a good description',
					'Create a PR from this branch to main, summarizing all the changes we made'
				]}
			/>
		</div>
	</div>
</section>
