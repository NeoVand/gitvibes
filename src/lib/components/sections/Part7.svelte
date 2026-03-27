<script lang="ts">
	import { BookOpen, Workflow, Table, Sparkles, MessageSquare } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-7" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={BookOpen}
			partLabel="Part 7"
			title="Conclusion: Best Practices for AI-Augmented Teams"
			color="var(--color-primary)"
		/>

		<!-- 7.1 AI-First Workflow -->
		<div id="section-7-1" class="mb-14">
			<SectionHeader level="section" icon={Workflow} title="7.1 The AI-First Workflow (Summary)" color="var(--color-primary)" />

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

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Here's what each step looks like in practice, along with the commands you'll use.
			</p>

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

			<VibeBox prompts={[
				"Walk me through the full Git workflow for starting a new feature from scratch",
				"I just finished coding — what Git steps should I follow before creating a PR?"
			]} />
		</div>

			<!-- 7.2 Quick Reference -->
		<div id="section-7-2" class="mb-8">
			<SectionHeader level="section" icon={Table} title="7.2 Quick Reference Card" color="var(--color-primary)" />

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Keep this handy. It covers the most common Git tasks with both the terminal command and the VS Code equivalent, so you can use whichever feels more natural.
			</p>

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
							<td class="px-3 py-2"><code style="font-family: var(--font-mono);">git stash push -m "message"</code></td>
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

		<!-- 7.3 Teaching Your AI to Use Git -->
		<div id="section-7-3" class="mb-14">
			<SectionHeader level="section" icon={Sparkles} title="7.3 Teaching Your AI to Use Git" color="var(--color-primary)" />

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				The next level is not just using Git to manage AI — it's using AI to manage Git. Modern AI coding tools can be configured to follow your team's Git conventions automatically.
			</p>

			<div class="mb-6 space-y-3">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Cursor Rules
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Cursor allows you to create <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">.cursor/rules</code> files within your repository. You can teach your AI your team's Git workflow: "All commit messages must follow Conventional Commits" or "All new work must be on a <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">feature/</code> branch."
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Claude Code & CLAUDE.md
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Claude Code reads <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">CLAUDE.md</code> files for project-specific instructions. You can define branch naming conventions, commit message formats, and PR templates that Claude will follow automatically.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						GitHub Actions & AI Agents
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Create automations where AI agents automatically review new PRs, update documentation to reflect code changes, and help manage branches — turning your Git workflow into a fully automated pipeline.
					</p>
				</div>
			</div>

			<VibeBox prompts={[
				"Create a .cursor/rules file that enforces Conventional Commits and feature branches",
				"Set up a CLAUDE.md with our team's Git workflow and branch naming conventions"
			]} />
		</div>

		<!-- Final Thoughts -->
		<div class="mb-8">
			<Callout type="important">
				{#snippet children()}
					<strong>Final Thoughts:</strong> Your AI assistants are powerful tools that lack context and
					accountability. Git is your system of accountability. It provides the immutable history,
					the instant "undo" button, and the human-in-the-loop review layer that transforms
					high-velocity AI coding from a risky experiment into a professional, safe, and scalable
					engineering discipline. Master it, and you'll transform AI-assisted coding into a superpower.
				{/snippet}
			</Callout>
		</div>

	</div>
</section>
