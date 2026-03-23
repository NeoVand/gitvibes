<script lang="ts">
	import { BookOpen, Workflow, Table } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
</script>

<section id="part-7" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={BookOpen}
			partLabel="Part 7"
			title="Conclusion: Best Practices for AI-Augmented Teams"
			color="var(--color-tip)"
		/>

		<!-- 7.1 AI-First Workflow -->
		<div id="section-7-1" class="mb-14">
			<SectionHeader level="section" icon={Workflow} title="7.1 The AI-First Workflow (Summary)" color="var(--color-tip)" />

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
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">1</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Sandbox</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git switch -c ai-experiment/new-feature</code>
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">2</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Generate</p>
						<p class="text-xs" style="color: var(--color-text-muted);">"Vibe" with your AI assistant and prompt it to generate code.</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">3</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Review</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Use <code style="font-family: var(--font-mono);">git add -p</code> or VS Code "Stage Selected Ranges" to review every line.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">4</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Save</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git commit -m "feat: &lt;message&gt;"</code> -- Commit small, commit often.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">5</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Sync</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git fetch origin</code> followed by <code style="font-family: var(--font-mono);">git rebase origin/main</code>.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">6</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Push</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git push --force-with-lease</code> if you rebased. Updates remote safely.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">7</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Propose</p>
						<p class="text-xs" style="color: var(--color-text-muted);">Create a Pull Request for human review.</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style="background: var(--color-primary); color: white;">8</span>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Recover</p>
						<p class="text-xs" style="color: var(--color-text-muted);">If you push a mistake, never reset a public branch. Always use <code style="font-family: var(--font-mono);">git revert</code>.</p>
					</div>
				</div>
			</div>
		</div>

			<!-- 7.2 Quick Reference -->
		<div id="section-7-2" class="mb-8">
			<SectionHeader level="section" icon={Table} title="7.2 Quick Reference Card" color="var(--color-tip)" />

			<div
				class="overflow-x-auto rounded-lg"
				style="background: var(--color-bg-secondary);"
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
			style="background: var(--color-primary-dim);"
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

			<p class="mt-4 text-[13px]" style="color: var(--color-text-muted);">
				Git is not just version control -- it's your safety net, your time machine, and your
				collaboration platform. Master it, and you'll transform AI-assisted coding into a
				superpower.
			</p>
		</div>
	</div>
</section>
