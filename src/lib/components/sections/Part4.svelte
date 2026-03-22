<script lang="ts">
	import { Undo2, Trash2, MinusCircle, PenLine, RotateCcw, AlertTriangle, Table } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodePlaceholder from '../ui/VsCodePlaceholder.svelte';
	import Sandbox from '../ui/Sandbox.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import { undoSteps } from '$lib/data/sandbox-steps';
</script>

<section id="part-4" class="py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-12 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl"
				style="background: var(--color-warning-bg); color: var(--color-warning);"
			>
				<Undo2 size={22} />
			</div>
			<div>
				<p class="text-sm font-medium" style="color: var(--color-warning);">Part 4</p>
				<h2 class="text-2xl font-bold" style="color: var(--color-text);">
					The "Undo" Toolkit: Reversing AI Mistakes
				</h2>
			</div>
		</div>

		<Callout type="important">
			{#snippet children()}
				This is the most critical section. The AI will misunderstand a prompt, generate buggy code,
				or delete something important. Your value as an engineer is your <strong>ability to recover
				instantly and safely</strong>.
			{/snippet}
		</Callout>

		<!-- 4.1 Discard Local -->
		<div id="section-4-1" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<Trash2 size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.1 "Discard This Mess" (Local, Not Committed)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> The AI modified files and the result is completely wrong. You
					haven't staged or committed. You want to revert to your last save point.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Discard changes"
				code={`git restore .              # Discard ALL local changes
git restore src/bad_file.py  # Discard a single file`}
			/>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control panel, right-clicking a file under 'Changes', with 'Discard Changes' option highlighted in the context menu"
			/>

			<Callout type="caution">
				{#snippet children()}
					This is a "dangerous" command: your local changes are gone forever. But in this case,
					that's exactly what you want.
				{/snippet}
			</Callout>
		</div>

		<!-- 4.2 Unstage -->
		<div id="section-4-2" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<MinusCircle size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.2 "I Staged This by Accident" (Staged, Not Committed)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You used <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code>
					and accidentally staged a file with a bad AI change. You need to "unstage" it.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Unstage a file"
				code={`git restore --staged src/bad_file.py
# Older equivalent: git reset HEAD src/bad_file.py`}
			/>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control panel showing 'Staged Changes' list. Right-click menu with 'Unstage Changes' option highlighted"
			/>
		</div>

		<!-- 4.3 Amend -->
		<div id="section-4-3" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<PenLine size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.3 "I Forgot a File in My Last Commit"
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You just committed but missed a file, or there's a typo in
					your commit message. The commit has <strong>not been pushed yet</strong>.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Amend the last commit"
				code={`git add src/forgotten_file.py   # Stage the missed file
git commit --amend --no-edit     # Add it to the last commit

# Or just fix the message:
git commit --amend`}
			/>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control '...' menu expanded, showing Commit submenu with 'Commit Staged (Amend)' option highlighted"
			/>

			<Callout type="warning">
				{#snippet children()}
					This rewrites your last commit. This is 100% safe <strong>if and only if</strong> you have
					not pushed that commit to the remote server yet.
				{/snippet}
			</Callout>
		</div>

		<!-- 4.4 Reset -->
		<div id="section-4-4" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<RotateCcw size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.4 "Nuke This Whole Feature" (Locally, Committed)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> Your last three commits were a single bad AI experiment. You
					have not pushed them. You want to permanently delete them.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Hard reset: destroy commits and changes"
				code={`git reset --hard HEAD~3   # Delete last 3 commits + all changes`}
			/>

			<h4 class="mb-3 mt-6 text-base font-semibold" style="color: var(--color-text);">
				The "Safer" Resets
			</h4>

			<div class="mb-4 space-y-3">
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-important);">
						<code class="text-xs" style="font-family: var(--font-mono);">--soft</code>: Keep changes staged
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Deletes commits but keeps changes in the Staging Area. Useful for "squashing" commits into one.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-warning);">
						<code class="text-xs" style="font-family: var(--font-mono);">--mixed</code> (default): Keep changes unstaged
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Deletes commits but keeps changes in the Working Directory (unstaged).
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-caution);">
						<code class="text-xs" style="font-family: var(--font-mono);">--hard</code>: Destroy everything
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Deletes commits AND all code changes. Your files reset to the older commit's state.
					</p>
				</div>
			</div>

			<Callout type="caution">
				{#snippet children()}
					<strong>CRITICAL:</strong> <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code>
					rewrites history. Never use this on a branch your teammates have already pulled.
					This is for <strong>local cleanup only</strong>.
				{/snippet}
			</Callout>
		</div>

		<!-- 4.5 Revert -->
		<div id="section-4-5" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<Undo2 size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.5 "I Pushed a Bug to the Team!" (Public, Pushed)
				</h3>
			</div>

			<Callout type="caution">
				{#snippet children()}
					<strong>The Problem:</strong> You pushed a bad AI-generated commit. It's on <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>.
					Your teammates have already pulled it.
				{/snippet}
			</Callout>

			<p class="mb-3" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-caution);">The WRONG Solution:</strong> You cannot use
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code>.
				It rewrites history that others have, causing repository divergence.
			</p>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-tip);">The RIGHT Solution:</strong> Create a new commit that
				undoes the bad commit. This is a <strong>revert</strong>.
			</p>

			<MermaidDiagram
				definition={`gitGraph
  commit id: "Good commit"
  commit id: "Bad commit (pushed!)"
  commit id: "Revert 'Bad commit'" type: REVERSE
  commit id: "Continue work"`}
				id="revert-visual"
			/>

			<CodeBlock
				title="Safely undo a pushed commit"
				code={`git log --oneline          # Find the hash: a1b2c3d
git revert a1b2c3d         # Create an inverse commit
git push                   # Push the revert`}
			/>

			<Callout type="important">
				{#snippet children()}
					The bad commit stays in history, but a new "revert" commit undoes its changes. This is
					safe because <strong>no history is deleted</strong>. The history clearly shows:
					"Feature was added" &rarr; "Feature was reverted."
				{/snippet}
			</Callout>

			<VsCodePlaceholder
				description="Screenshot: VS Code GitLens extension sidebar showing commit history. Right-click menu on a commit with 'Revert Commit...' option highlighted"
			/>
		</div>

		<!-- 4.6 Force Push -->
		<div id="section-4-6" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<AlertTriangle size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.6 The "Break Glass" Command
				</h3>
			</div>

			<Callout type="warning">
				{#snippet children()}
					<strong>The Problem:</strong> You used <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code>
					or <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit --amend</code> on a branch you already
					pushed. Local and remote history have diverged. Git refuses to let you push.
				{/snippet}
			</Callout>

			<div class="mb-4 grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg p-4" style="background: var(--color-caution-bg); border: 1px solid var(--color-caution);">
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-caution);">
						<code class="text-xs" style="font-family: var(--font-mono);">git push --force</code>
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Replaces the server unconditionally. If a teammate pushed in the last 5 minutes,
						you permanently destroy their work.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-tip-bg); border: 1px solid var(--color-tip);">
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-tip);">
						<code class="text-xs" style="font-family: var(--font-mono);">git push --force-with-lease</code>
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Conditional force push. Only succeeds if the remote branch hasn't changed since your
						last fetch. <strong>Always use this instead.</strong>
					</p>
				</div>
			</div>
		</div>

		<!-- 4.7 Recovery Matrix -->
		<div id="section-4-7" class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<Table size={18} style="color: var(--color-warning);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					4.7 The Git "Undo" Recovery Matrix
				</h3>
			</div>

			<div
				class="my-4 overflow-x-auto rounded-lg border"
				style="border-color: var(--color-border);"
			>
				<table class="w-full text-xs">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">Scenario</th>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">Command</th>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">Safe?</th>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">VS Code</th>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">AI's change is bad, not committed</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git restore .</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Local Only</span></td>
							<td class="px-3 py-2">Discard Changes</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">File staged by accident</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git restore --staged &lt;file&gt;</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Local Only</span></td>
							<td class="px-3 py-2">Unstage Changes</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Typo in last commit message</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git commit --amend</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Local Only</span></td>
							<td class="px-3 py-2">Commit (Amend)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Forgot a file in last commit</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git commit --amend --no-edit</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Local Only</span></td>
							<td class="px-3 py-2">Commit Staged (Amend)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Last 3 local commits are bad</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git reset --hard HEAD~3</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-warning);">Rewrites History</span></td>
							<td class="px-3 py-2">GitLens: Reset</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Pushed a bug to the team</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git revert &lt;hash&gt;</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">100% Safe</span></td>
							<td class="px-3 py-2">Revert Commit</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Reset a public branch, need to push</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git push --force-with-lease</code></td>
							<td class="px-3 py-2"><span style="color: var(--color-caution);">Break Glass</span></td>
							<td class="px-3 py-2">Terminal only</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h4 class="mb-3 mt-8 text-lg font-semibold" style="color: var(--color-text);">
				Try It: The Undo Toolkit
			</h4>
			<Sandbox title="Undo Operations" steps={undoSteps} id="undo" />
		</div>
	</div>
</section>
