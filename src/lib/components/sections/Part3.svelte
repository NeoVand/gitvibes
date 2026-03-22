<script lang="ts">
	import { GitBranch, GitPullRequest, RefreshCcw } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodePlaceholder from '../ui/VsCodePlaceholder.svelte';
	import Sandbox from '../ui/Sandbox.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import { branchingSteps } from '$lib/data/sandbox-steps';
</script>

<section id="part-3" class="py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-12 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl"
				style="background: var(--color-note-bg); color: var(--color-note);"
			>
				<GitBranch size={22} />
			</div>
			<div>
				<p class="text-sm font-medium" style="color: var(--color-note);">Part 3</p>
				<h2 class="text-2xl font-bold" style="color: var(--color-text);">
					Parallel Universes: Branching for AI Experiments
				</h2>
			</div>
		</div>

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
		<div id="section-3-1" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<GitBranch size={18} style="color: var(--color-note);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					3.1 "I Have a New Idea (or AI Prompt)"
				</h3>
			</div>

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

			<VsCodePlaceholder
				description="Screenshot: VS Code status bar (bottom-left) showing the current branch name. Click it to see a dropdown with '+ Create new branch...' option"
			/>

			<Callout type="tip">
				{#snippet children()}
					You are now in a perfect, safe copy of <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
					If the AI destroys everything, it does not matter. Simply discard this branch and switch
					back. <strong>This workflow enables fearless experimentation.</strong>
				{/snippet}
			</Callout>
		</div>

		<!-- 3.2 Syncing -->
		<div id="section-3-2" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<RefreshCcw size={18} style="color: var(--color-note);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					3.2 "My Teammate Pushed Updates" (Syncing)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You've been working on your feature branch for a few days. Your
					teammates have merged their work into <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
					Your branch is now "stale."
				{/snippet}
			</Callout>

			<h4 class="mb-2 text-base font-semibold" style="color: var(--color-text);">
				Option 1: The "Safe" Sync (fetch + merge)
			</h4>
			<CodeBlock
				title="Two-step controlled sync"
				code={`git fetch origin        # Download new commits (doesn't apply them)
git merge origin/main   # Merge the updates into your branch`}
			/>

			<h4 class="mb-2 mt-6 text-base font-semibold" style="color: var(--color-text);">
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
		</div>

		<!-- 3.3 Pull Requests -->
		<div id="section-3-3" class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<GitPullRequest size={18} style="color: var(--color-note);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					3.3 "My AI-Generated Feature is Ready" (The Pull Request)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> Your feature is complete, tested, and ready to be merged into
					<code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>. You do not merge
					it directly. You "propose" the change via a <strong>Pull Request (PR)</strong>.
				{/snippet}
			</Callout>

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

			<Callout type="tip">
				{#snippet children()}
					<strong>AI Integration:</strong> GitHub Copilot can write your PR descriptions by
					summarizing your commits. Claude Code can even automate the PR creation process.
				{/snippet}
			</Callout>

			<h4 class="mb-3 mt-8 text-lg font-semibold" style="color: var(--color-text);">
				Try It: Branch, Commit, and Push
			</h4>
			<Sandbox title="Branching Workflow" steps={branchingSteps} id="branching" />
		</div>
	</div>
</section>
