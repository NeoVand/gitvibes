<script lang="ts">
	import { RefreshCw, Eye, FolderPlus, Save } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodePlaceholder from '../ui/VsCodePlaceholder.svelte';
	import Sandbox from '../ui/Sandbox.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import { coreLoopSteps } from '$lib/data/sandbox-steps';
</script>

<section id="part-2" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={RefreshCw}
			partLabel="Part 2"
			title="The Core Safety Loop: Your &quot;Save Game&quot; for AI Coding"
			color="var(--color-tip)"
		/>

		<MermaidDiagram
			definition={`graph LR
  A(["AI Code"]) --> B(["Status"])
  B --> C{"OK?"}
  C -->|No| A
  C -->|Yes| D(["Stage"])
  D --> E(["Commit"])
  E --> F(["Push"])`}
			id="core-loop-overview"
		/>

		<Callout type="important">
			{#snippet children()}
				This is your fundamental daily workflow. It's a three-step process: the AI makes a change,
				you review it, and you "save" it. In Git, this loop is <strong>Status &rarr; Stage &rarr; Commit</strong>.
				For this to be an effective safety net, commit after every single logical, working change.
			{/snippet}
		</Callout>

		<!-- 2.1 git status -->
		<div id="section-2-1" class="mb-14">
			<SectionHeader level="section" icon={Eye} title="2.1 &quot;What Did the AI Just Do?&quot;" color="var(--color-tip)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You prompted Copilot or Cursor to "refactor this function."
					It applies changes across several files. What exactly did it touch?
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				<code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code> is your "heads-up display."
				The output shows two categories:
			</p>

			<div class="mb-6 grid gap-3 sm:grid-cols-2">
				<div
					class="rounded-lg p-4"
					style="background: var(--color-caution-bg); border: 1px solid var(--color-caution);"
				>
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						"Changes not staged" (Red)
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Files Git tracks that were modified but not yet approved for the next save.
					</p>
				</div>
				<div
					class="rounded-lg p-4"
					style="background: var(--color-caution-bg); border: 1px solid var(--color-caution);"
				>
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						"Untracked files" (Red)
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Brand-new files the AI created that Git has never seen before.
					</p>
				</div>
			</div>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control panel showing the Activity Bar icon with a blue badge, listing 'Changes' and 'Untracked files' sections"
			/>
		</div>

		<!-- 2.2 Staging -->
		<div id="section-2-2" class="mb-14">
			<SectionHeader level="section" icon={FolderPlus} title="2.2 Reviewing and Staging the AI's Work" color="var(--color-tip)" />

			<Callout type="warning">
				{#snippet children()}
					<strong>The Problem:</strong> <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code> shows
					the AI changed five files. Blindly trusting this is how bugs are introduced. You must
					review every line and then "stage" the changes you approve.
				{/snippet}
			</Callout>

			<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 1: Stage All (the "trusting" add)
			</h4>
			<CodeBlock code="git add ." title="Stage everything" />
			<Callout type="caution">
				{#snippet children()}
					This is fast but dangerous. If the AI added a temporary debug file or a flawed change,
					you just approved it without review.
				{/snippet}
			</Callout>

			<h4 class="mb-2 mt-6 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 2: Stage One File (the "surgical" add)
			</h4>
			<CodeBlock code="git add src/my_file.py" title="Stage specific file" />

			<h4 class="mb-2 mt-6 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 3: Stage Parts of a File (the "AI-first developer's" add)
			</h4>
			<Callout type="tip">
				{#snippet children()}
					This is your single most powerful review tool. The AI made multiple changes in one file,
					and you only want to accept some of them. <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git add --patch</code>
					walks you through every individual block of changes ("hunk") interactively.
				{/snippet}
			</Callout>
			<CodeBlock code="git add --patch  # or git add -p" title="Interactive staging" />

			<p class="mb-4 mt-4 text-[13px]" style="color: var(--color-text-secondary);">
				For each hunk, Git asks: <code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">y</code> (stage),
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">n</code> (skip),
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">s</code> (split into smaller pieces),
				<code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">q</code> (quit).
			</p>

			<VsCodePlaceholder
				description="Screenshot: VS Code Diff Editor showing side-by-side comparison with red (deletions) and green (additions). Right-click menu visible with 'Stage Selected Ranges' option highlighted"
			/>
		</div>

		<!-- 2.3 Committing -->
		<div id="section-2-3" class="mb-8">
			<SectionHeader level="section" icon={Save} title="2.3 Creating the Save Point" color="var(--color-tip)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You've staged your reviewed changes. Now, bundle them into a
					permanent, immutable "save point" -- a <strong>commit</strong>.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Create a commit with a message"
				code={`git commit -m "feat: Add user authentication endpoint"`}
			/>

			<Callout type="important">
				{#snippet children()}
					<strong>Writing Good Commit Messages:</strong> Your code shows <em>how</em> a change was made;
					your commit message must explain the <em>why</em>. Use
					<strong>Conventional Commits</strong> format:
				{/snippet}
			</Callout>

			<div
				class="my-4 overflow-hidden rounded-lg border"
				style="border-color: var(--color-border);"
			>
				<table class="w-full text-[13px]">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);">Type</th>
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);">When to Use</th>
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);">Example</th>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"><code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">feat:</code></td>
							<td class="px-4 py-2">A new feature</td>
							<td class="px-4 py-2 text-xs">feat: Add login button to homepage</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"><code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">fix:</code></td>
							<td class="px-4 py-2">A bug fix</td>
							<td class="px-4 py-2 text-xs">fix: Resolve dimension mismatch</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"><code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">refactor:</code></td>
							<td class="px-4 py-2">Code restructuring</td>
							<td class="px-4 py-2 text-xs">refactor: Optimize data query</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"><code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">docs:</code></td>
							<td class="px-4 py-2">Documentation only</td>
							<td class="px-4 py-2 text-xs">docs: Update API reference</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"><code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">test:</code></td>
							<td class="px-4 py-2">Adding or fixing tests</td>
							<td class="px-4 py-2 text-xs">test: Add unit tests for auth</td>
						</tr>
					</tbody>
				</table>
			</div>

			<Callout type="tip">
				{#snippet children()}
					<strong>AI Integration:</strong> GitHub Copilot and Cursor can analyze your staged changes
					and suggest a commit message. Always verify it follows your team's standards.
				{/snippet}
			</Callout>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control panel showing 'Staged Changes' list, the commit message input box at the top with a conventional commit message, and the checkmark Commit button"
			/>

			<h4 class="mb-3 mt-8 text-lg font-semibold" style="color: var(--color-text);">
				Try It: The Complete Loop
			</h4>
			<Sandbox title="The Core Safety Loop" steps={coreLoopSteps} id="core-loop" />
		</div>
	</div>
</section>
