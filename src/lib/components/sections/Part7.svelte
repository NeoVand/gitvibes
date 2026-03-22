<script lang="ts">
	import { BookOpen, Workflow, Bot, Table } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
</script>

<section id="part-7" class="py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-12 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl"
				style="background: var(--color-tip-bg); color: var(--color-tip);"
			>
				<BookOpen size={22} />
			</div>
			<div>
				<p class="text-sm font-medium" style="color: var(--color-tip);">Part 7</p>
				<h2 class="text-2xl font-bold" style="color: var(--color-text);">
					Conclusion: Best Practices for AI-Augmented Teams
				</h2>
			</div>
		</div>

		<!-- 7.1 AI-First Workflow -->
		<div id="section-7-1" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<Workflow size={18} style="color: var(--color-tip);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					7.1 The AI-First Workflow (Summary)
				</h3>
			</div>

			<p class="mb-6" style="color: var(--color-text-secondary);">
				This is your new "save game" loop. Follow these 8 steps for every piece of work:
			</p>

			<MermaidDiagram
				definition={`graph LR
  A(["1. Sandbox"]) --> B(["2. Generate"])
  B --> C(["3. Review"])
  C --> D(["4. Save"])
  D --> E(["5. Sync"])
  E --> F(["6. Push"])
  F --> G(["7. Propose"])
  G --> H(["8. Recover"])`}
				id="workflow-summary"
			/>

			<div class="mt-6 space-y-3">
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">1</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Sandbox</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git switch -c ai-experiment/new-feature</code>
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">2</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Generate</p>
						<p class="text-xs" style="color: var(--color-text-muted);">"Vibe" with your AI assistant and prompt it to generate code.</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">3</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Review</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Use <code style="font-family: var(--font-mono);">git add -p</code> or VS Code "Stage Selected Ranges" to review every line.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">4</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Save</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git commit -m "feat: &lt;message&gt;"</code> -- Commit small, commit often.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">5</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Sync</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git fetch origin</code> followed by <code style="font-family: var(--font-mono);">git rebase origin/main</code>.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">6</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Push</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git push --force-with-lease</code> if you rebased. Updates remote safely.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">7</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Propose</p>
						<p class="text-xs" style="color: var(--color-text-muted);">Create a Pull Request for human review.</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">8</span>
					<div>
						<p class="text-sm font-medium" style="color: var(--color-text);">Recover</p>
						<p class="text-xs" style="color: var(--color-text-muted);">If you push a mistake, never reset a public branch. Always use <code style="font-family: var(--font-mono);">git revert</code>.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- 7.2 Teaching AI Git -->
		<div id="section-7-2" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<Bot size={18} style="color: var(--color-tip);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					7.2 Teaching Your AI to Use Git (The Future)
				</h3>
			</div>

			<Callout type="tip">
				{#snippet children()}
					The next level is not just using Git to manage AI; it's using AI to manage Git.
				{/snippet}
			</Callout>

			<div class="mb-6 space-y-4">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<h4 class="mb-2 text-base font-semibold" style="color: var(--color-text);">
						Cursor Rules
					</h4>
					<p class="text-sm" style="color: var(--color-text-secondary);">
						Create <code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">.cursor/rules</code> files
						in your repository. You can literally teach your AI your team's Git workflow:
						"All commit messages must follow Conventional Commits" or "All new work must be
						on a <code class="rounded px-1 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">feature/</code> branch."
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<h4 class="mb-2 text-base font-semibold" style="color: var(--color-text);">
						Claude Code & GitHub Actions
					</h4>
					<p class="text-sm" style="color: var(--color-text-secondary);">
						Create advanced automations where an AI agent automatically reviews new PRs, updates
						documentation to reflect code changes, and helps manage branches.
					</p>
				</div>
			</div>
		</div>

		<!-- Quick Reference -->
		<div id="section-quick-ref" class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<Table size={18} style="color: var(--color-tip);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					Quick Reference Card
				</h3>
			</div>

			<div
				class="overflow-x-auto rounded-lg border"
				style="border-color: var(--color-border);"
			>
				<table class="w-full text-xs">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">Task</th>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">Command</th>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);">VS Code</th>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Check what changed</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git status</code></td>
							<td class="px-3 py-2">Source Control panel</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Stage specific lines</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git add -p</code></td>
							<td class="px-3 py-2">Stage Selected Ranges</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Commit changes</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git commit -m "feat: ..."</code></td>
							<td class="px-3 py-2">Type message + checkmark</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Create new branch</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git switch -c feature/name</code></td>
							<td class="px-3 py-2">Click branch name (bottom-left)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Discard local changes</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git restore .</code></td>
							<td class="px-3 py-2">Discard Changes</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Undo last commit (keep)</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git reset --soft HEAD~1</code></td>
							<td class="px-3 py-2">GitLens: Reset</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Revert public commit</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git revert &lt;hash&gt;</code></td>
							<td class="px-3 py-2">Revert Commit</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Stash work in progress</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git stash save "message"</code></td>
							<td class="px-3 py-2">... menu: Stash</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Update branch</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git fetch && git rebase origin/main</code></td>
							<td class="px-3 py-2">... menu: Pull, Rebase</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Safe force push</td>
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git push --force-with-lease</code></td>
							<td class="px-3 py-2">Terminal only</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Final Thoughts -->
		<div
			class="mt-12 rounded-xl p-8 text-center"
			style="background: var(--color-primary-dim); border: 1px solid var(--color-primary);"
		>
			<Callout type="important">
				{#snippet children()}
					Your AI assistants are powerful tools that lack context and accountability.
					<strong>Git is your system of accountability.</strong> It provides the immutable
					history, the instant "undo" button, and the human-in-the-loop review layer that
					transforms high-velocity "Vibe Coding" from a risky hobby into a professional,
					safe, and scalable engineering discipline.
				{/snippet}
			</Callout>

			<p class="mt-4 text-sm" style="color: var(--color-text-muted);">
				Git is not just version control -- it's your safety net, your time machine, and your
				collaboration platform. Master it, and you'll transform AI-assisted coding into a
				superpower.
			</p>
		</div>
	</div>
</section>
