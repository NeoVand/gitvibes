<script lang="ts">
	import { Layers, Archive, GitMerge, FileWarning } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import Sandbox from '../ui/Sandbox.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import { stashSteps, rebaseMergeSteps, conflictSteps } from '$lib/data/sandbox-steps';
</script>

<section id="part-5" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={Layers}
			partLabel="Part 5"
			title="Advanced Scenarios: Managing a Multi-Branch Workflow"
			color="var(--color-important)"
		/>

		<Callout type="note">
			{#snippet children()}
				As you grow, you'll often work on multiple tasks at once. Your AI-driven workflow will
				be interrupted by urgent bugs or questions. Git provides the tools to manage this
				context-switching seamlessly.
			{/snippet}
		</Callout>

		<!-- 5.1 Stash -->
		<div id="section-5-1" class="mb-14">
			<SectionHeader level="section" icon={Archive} title="5.1 &quot;I Need to Switch Branches, but My Work Isn't Ready&quot;" color="var(--color-important)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You're in the middle of a complex AI refactor with 10 modified
					files. Your manager says: "Urgent bug on main!" You can't commit half-baked work, but Git
					won't let you switch branches with a dirty working directory.
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				The <strong>stash</strong> is a temporary, private holding area for your dirty changes.
			</p>

			<CodeBlock
				title="Stash, fix, and return"
				code={`# 1. Stash your changes
git stash save "WIP: refactoring pipeline, AI changes"

# 2. Fix the urgent bug
git switch main
git pull
git switch -c "hotfix/urgent-bug"
# ... fix, test, commit, push, create PR ...

# 3. Return to your work
git switch feature/A
git stash pop`}
			/>

			<p class="my-4 text-[13px]" style="color: var(--color-text-secondary);">
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git stash pop</code> re-applies
				your changes and removes them from the stash. Use
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git stash apply</code> to keep
				the stash entry for reuse.
			</p>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, you can do all of this without memorizing commands. Open the <strong>...</strong> menu in the Source Control panel -- you'll see a <strong>Stash</strong> submenu with all the options you need:
			</p>

			<VsCodeScreenshot
				src="quickstart/pull-push-commands.png"
				alt="VS Code Source Control ellipsis menu showing Stash, Branch, and other Git commands"
				caption="The ... menu includes a Stash submenu with 'Stash (Include Untracked)' and 'Pop Latest Stash' -- everything you need for context-switching."
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Choose <strong>"Stash (Include Untracked)"</strong> to save all your work. When you're ready to come back, go to <strong>...</strong> → Stash → <strong>"Pop Latest Stash"</strong> to restore everything exactly where you left off.
			</p>

			<h4 class="mb-3 mt-6 text-lg font-semibold" style="color: var(--color-text);">
				Try It: The Stash Workflow
			</h4>
			<Sandbox title="Stash: Context-Switch Safely" steps={stashSteps} id="stash" />
		</div>

		<!-- 5.2 Rebase vs Merge -->
		<div id="section-5-2" class="mb-14">
			<SectionHeader level="section" icon={GitMerge} title="5.2 &quot;My Branch is Out of Date&quot; (Rebase vs. Merge)" color="var(--color-important)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> Your feature branch is "stale." <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>
					has moved on. There are two philosophies for updating it.
				{/snippet}
			</Callout>

			<div class="mb-6 grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-note);">
						git merge main
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						Creates a new "Merge Commit" on your branch. Preserves the exact history -- messy but
						100% accurate.
					</p>
					<p class="text-xs" style="color: var(--color-text-muted);">
						History: "Worked on feature... merged main... worked on feature..."
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-important);">
						git rebase main
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						"Replays" your commits on top of the latest main. Creates a clean, linear history
						as if you started today.
					</p>
					<p class="text-xs" style="color: var(--color-text-muted);">
						History: "A, B, E, F, C', D'" -- all in a straight line.
					</p>
				</div>
			</div>

			<Callout type="caution">
				{#snippet children()}
					<strong>The Golden Rule of Rebasing:</strong> Never rebase a public branch (one your team
					is also using), as it rewrites history.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code supports both approaches. Use the <strong>...</strong> menu in Source Control → <strong>"Pull (Rebase)"</strong> to rebase instead of merge when pulling. For merging, use the Command Palette (<kbd class="rounded border px-1 py-0.5 text-[11px]" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Cmd+Shift+P</kbd>) → <strong>"Git: Merge Branch..."</strong> and select the branch to merge.
			</p>

			<Callout type="tip">
				{#snippet children()}
					<strong>The AI-First Developer's Choice:</strong> Since your experiment branch is your
					private sandbox, <strong>rebase</strong> is preferred to keep it clean before creating a PR.
					It avoids cluttering the PR with "I merged main" commits.
				{/snippet}
			</Callout>

			<h4 class="mb-3 mt-6 text-lg font-semibold" style="color: var(--color-text);">
				Try It: Merge vs. Rebase
			</h4>
			<Sandbox title="Merge vs. Rebase" steps={rebaseMergeSteps} id="rebase-merge" />
		</div>

		<!-- 5.3 Merge Conflicts -->
		<div id="section-5-3" class="mb-8">
			<SectionHeader level="section" icon={FileWarning} title="5.3 &quot;We Both Edited the Same File&quot; (Merge Conflicts)" color="var(--color-important)" />

			<Callout type="warning">
				{#snippet children()}
					<strong>The Problem:</strong> You run <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git pull</code>
					and Git halts with <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">CONFLICT</code>.
					You and a teammate edited the same lines. Git needs you, the human, to resolve it.
				{/snippet}
			</Callout>

			<h4 class="mb-3 text-[14px] font-semibold" style="color: var(--color-text);">
				The Conflict Markers
			</h4>
			<CodeBlock
				lang="javascript"
				title="What you'll see in the file"
				code={`<<<<<<< HEAD
// Your AI's change
const x = 10;
=======
// Your teammate's change
const x = 5;
>>>>>>> origin/main`}
			/>

			<p class="my-4 text-[13px]" style="color: var(--color-text-secondary);">
				Delete all the markers (<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">&lt;&lt;&lt;</code>,
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">===</code>,
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">&gt;&gt;&gt;</code>) and edit the code to
				be the correct final version, then stage and commit.
			</p>

			<h4 class="mb-3 mt-6 text-[14px] font-semibold" style="color: var(--color-text);">
				The VS Code Way (The Superior Way)
			</h4>

			<Callout type="tip">
				{#snippet children()}
					This is one of the best features of the IDE. VS Code opens a <strong>3-way Merge Editor</strong>:
					<br /><br />
					<strong>Left Pane:</strong> "Incoming" (teammate's changes)<br />
					<strong>Right Pane:</strong> "Current" (your changes)<br />
					<strong>Bottom Pane:</strong> "Result" (what will be saved)<br /><br />
					Above each conflict block, VS Code shows clickable links: <strong>"Accept Current"</strong> |
					<strong>"Accept Incoming"</strong> | <strong>"Accept Both"</strong>.
				{/snippet}
			</Callout>

			<VsCodeScreenshot
				src="overview/merge-conflict.png"
				alt="VS Code inline merge conflict view showing Accept Current, Accept Incoming, and Accept Both options"
				caption="VS Code highlights conflicts inline with clickable actions: Accept Current Change, Accept Incoming Change, or Accept Both Changes."
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				For complex conflicts with multiple overlapping changes, click <strong>"Resolve in Merge Editor"</strong> to open the full 3-way view. This gives you the most control over the final result:
			</p>

			<VsCodeScreenshot
				src="overview/merge-editor-overview.png"
				alt="VS Code 3-way Merge Editor with Incoming, Current, and Result panes"
				caption="The 3-way Merge Editor: Incoming changes (left), your changes (right), and the final result (bottom). Use checkboxes to select which changes to keep."
			/>

			<h4 class="mb-3 mt-6 text-lg font-semibold" style="color: var(--color-text);">
				Try It: Resolving a Merge Conflict
			</h4>
			<Sandbox title="Merge Conflict Resolution" steps={conflictSteps} id="conflicts" />
		</div>
	</div>
</section>
