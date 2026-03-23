<script lang="ts">
	import { GitBranch, GitPullRequest, RefreshCcw } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import Sandbox from '../ui/Sandbox.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import { branchingSteps } from '$lib/data/sandbox-steps';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-3" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={GitBranch}
			partLabel="Part 3"
			title="Parallel Universes: Branching for AI Experiments"
			color="var(--color-primary)"
		/>

		<Callout type="important">
			{#snippet children()}
				The most important rule in collaborative software development: <strong>you never, ever
				work directly on the <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code> branch</strong>.
				The <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code> branch represents
				the official, stable, production-ready code. Your work must happen in an isolated
				"parallel universe" called a <strong>branch</strong>.
			{/snippet}
		</Callout>

		<!-- 3.1 Creating Branches -->
		<div id="section-3-1" class="mb-14">
			<SectionHeader level="section" icon={GitBranch} title="3.1 &quot;I Have a New Idea (or AI Prompt)&quot;" color="var(--color-primary)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You want to try a new feature or a massive AI-driven refactor.
					Before you write a single line or prompt, create a safe, isolated sandbox.
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				First, make sure you're on <code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>
				and it's up to date. Then create your branch:
			</p>

			<CodeBlock
				title="Create and switch to a new branch"
				code={`git switch -c "feature/my-new-idea"
# Older equivalent: git checkout -b "feature/my-new-idea"`}
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, this is even easier. Look at the <strong>bottom-left corner</strong> of your window -- you'll see the current branch name (e.g., "main"). Click it and you'll get a dropdown where you can switch to existing branches or select <strong>"+ Create new branch..."</strong> to make a new one:
			</p>

			<VsCodeScreenshot
				src="branches-worktrees/current-branch.png"
				alt="VS Code status bar showing current branch name and the branches dropdown"
				caption="Click the branch name in the bottom-left corner to switch branches or create a new one."
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				When you click the branch name, VS Code opens a Quick Pick menu listing all your branches. Select <strong>"+ Create new branch..."</strong> at the top, type a name like <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">feature/my-new-idea</code>, and you're immediately switched to it:
			</p>

			<VsCodeScreenshot
				src="overview/gitbranches.png"
				alt="VS Code branch Quick Pick showing create new branch option and existing branches"
				caption="The branch Quick Pick lets you create, switch, or check out branches without touching the terminal."
			/>

			<Callout type="tip">
				{#snippet children()}
					You are now in a perfect, safe copy of <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
					If the AI destroys everything, it does not matter. Simply discard this branch and switch
					back. <strong>This workflow enables fearless experimentation.</strong>
				{/snippet}
			</Callout>

			<VibeBox prompts={[
				"Create a new branch called feature/user-auth and switch to it",
				"I need to start working on the payment integration — set up a branch for me"
			]} />
		</div>

		<!-- 3.2 Syncing -->
		<div id="section-3-2" class="mb-14">
			<SectionHeader level="section" icon={RefreshCcw} title="3.2 &quot;My Teammate Pushed Updates&quot; (Syncing)" color="var(--color-primary)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You've been working on your feature branch for a few days. Your
					teammates have merged their work into <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
					Your branch is now "stale."
				{/snippet}
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Before diving into the commands, here's how the three main remote operations relate to each other:
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

			<h4 class="mb-2 mt-6 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 2: The "Easy" Sync (pull)
			</h4>
			<CodeBlock
				title="One-step sync"
				code={`git pull origin main    # Fetch + merge in one command`}
			/>

			<Callout type="tip">
				{#snippet children()}
					As a best practice, <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git fetch</code> first
					to see what's coming before merging. <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git pull</code>
					is just a "black box" shortcut.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code makes syncing visual. Look at the <strong>status bar</strong> at the bottom of your window -- you'll see small arrows with numbers showing how many commits are incoming (to pull) and outgoing (to push). Click the <strong>sync icon</strong> (circular arrows) to pull and push in one step:
			</p>

			<VsCodeScreenshot
				src="overview/incoming-outgoing-changes.png"
				alt="VS Code Source Control showing incoming and outgoing changes with commit counts"
				caption="The incoming/outgoing section shows exactly which commits you need to pull and which you'll push."
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				You'll also see a prominent <strong>"Sync Changes"</strong> button right in the Source Control panel. It shows the exact count of incoming and outgoing commits, so you always know what's about to happen:
			</p>

			<VsCodeScreenshot
				src="quickstart/sync-changes.png"
				alt="VS Code Source Control showing Sync Changes button with incoming and outgoing commit counts"
				caption="The Sync Changes button combines pull + push in one click. The numbers show exactly how many commits are incoming (↓) and outgoing (↑)."
			/>

			<VibeBox prompts={[
				"Pull the latest changes from main and update my branch",
				"Fetch from origin and tell me if my branch is behind main"
			]} />
		</div>

		<!-- 3.3 Pull Requests -->
		<div id="section-3-3" class="mb-8">
			<SectionHeader level="section" icon={GitPullRequest} title="3.3 &quot;My AI-Generated Feature is Ready&quot; (The Pull Request)" color="var(--color-primary)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> Your feature is complete, tested, and ready to be merged into
					<code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>. You do not merge
					it directly. You "propose" the change via a <strong>Pull Request (PR)</strong>.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Once your feature is ready, push your branch to the remote so your teammates can see it:
			</p>

			<CodeBlock
				title="Push your branch to the remote"
				code={`git push -u origin feature/my-new-idea
# -u links your local branch to the remote branch`}
			/>

			<p class="my-4" style="color: var(--color-text-secondary);">
				Then on GitHub, you'll see a yellow banner: <em>"feature/my-new-idea had recent pushes.
				Compare & pull request."</em> Click it to create your PR.
			</p>

			<Callout type="important">
				{#snippet children()}
					A <strong>Pull Request</strong> is a request for discussion. It is the formal, auditable gate
					where your human teammates review your AI-generated code, suggest changes, and
					ultimately "sign off" before it enters <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Writing a good PR description can feel tedious, but AI tools can help with that too:
			</p>

			<Callout type="tip">
				{#snippet children()}
					<strong>AI Integration:</strong> GitHub Copilot can write your PR descriptions by
					summarizing your commits. Claude Code can even automate the PR creation process.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				You don't even need to leave VS Code to create a PR. Install the <strong>GitHub Pull Requests and Issues</strong> extension and you can create PRs, review diffs, add comments, approve, and merge -- all without opening your browser:
			</p>

			<VsCodeScreenshot
				src="github/create-pull-request-view.png"
				alt="VS Code GitHub Pull Request creation view with title, description, and reviewer fields"
				caption="Create Pull Requests directly in VS Code with the GitHub Pull Requests extension. AI can even generate the PR description for you."
			/>

			<h4 class="mb-3 mt-8 text-lg font-semibold" style="color: var(--color-text);">
				Try It: Branch, Commit, and Push
			</h4>
			<Sandbox title="Branching Workflow" steps={branchingSteps} id="branching" />

			<VibeBox prompts={[
				"Push this branch and create a pull request with a good description",
				"Create a PR from this branch to main, summarizing all the changes we made"
			]} />
		</div>
	</div>
</section>
