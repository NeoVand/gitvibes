<script lang="ts">
	import { BookOpen, Library, Workflow, Table } from 'lucide-svelte';
	import { base } from '$app/paths';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import Callout from '../ui/Callout.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';

	let {
		onOpenPlayground
	}: {
		onOpenPlayground?: () => void;
	} = $props();
</script>

<section id="part-8" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={BookOpen}
			partLabel="Part 8"
			title="Conclusion: Best Practices for AI-Augmented Teams"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"Git isn't just version control — it's the bridge between human intent and AI capability."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			You've learned the full toolkit. Now let's put it all together into a cohesive workflow — the
			daily rhythm that keeps you productive, your code safe, and your AI assistants working within
			guardrails you control.
		</p>

		<!-- 8.1 AI-First Workflow -->
		<div id="section-8-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Workflow}
				title="8.1 The AI-First Workflow (Summary)"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/save-game-loop.webp"
					alt="The Save Game Loop — 8-step AI-first Git workflow from branch to recover"
					caption="The complete 8-step AI-first Git workflow — your daily rhythm"
				/>
			</div>

			<p class="mb-6" style="color: var(--color-text-secondary);">
				This is your new "save game" loop — the practical rhythm between you and your agent. Follow
				these 8 steps for every piece of work. Encode your Git conventions once in the repo (see
				section 6.1) so agents follow them automatically instead of re-explaining branch rules in
				every chat.
			</p>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's what each step looks like in practice, along with the commands you'll use.
			</p>

			<div class="mt-6 space-y-3">
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">1</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Branch</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Create an isolated branch. Practice any step of this loop in the
							<button
								type="button"
								onclick={onOpenPlayground}
								class="cursor-pointer underline underline-offset-2"
								style="color: var(--color-primary);">Git Playground</button
							>
							(Try real Git commands in your browser from each lesson).
							<code style="font-family: var(--font-mono);"
								>git switch -c ai-experiment/new-feature</code
							>
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">2</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Generate</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Work with your AI agent to implement the change. With <code
								style="font-family: var(--font-mono);">AGENTS.md</code
							> and skills configured, it already knows your branch naming, commit format, and safety
							rules.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">3</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Review</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Use <code style="font-family: var(--font-mono);">git add -p</code> or VS Code "Stage Selected
							Ranges" to review every line.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">4</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Save</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);"
								>git commit -m "feat: &lt;message&gt;"</code
							> -- Commit small, commit often.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">5</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Sync</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git fetch origin</code> followed by
							<code style="font-family: var(--font-mono);">git rebase origin/main</code>.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">6</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Push</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							<code style="font-family: var(--font-mono);">git push --force-with-lease</code> if you rebased.
							Updates remote safely.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">7</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Propose</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							Create a Pull Request for human review.
						</p>
					</div>
				</div>
				<div class="flex gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<span
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
						style="background: var(--color-primary); color: white;">8</span
					>
					<div>
						<p class="text-[13px] font-medium" style="color: var(--color-text);">Recover</p>
						<p class="text-xs" style="color: var(--color-text-muted);">
							If you push a mistake, never reset a public branch. Always use <code
								style="font-family: var(--font-mono);">git revert</code
							>.
						</p>
					</div>
				</div>
			</div>

			<VibeBox
				prompts={[
					'Walk me through the full Git workflow for starting a new feature from scratch',
					'I just finished coding — what Git steps should I follow before creating a PR?'
				]}
			/>
		</div>

		<!-- 8.2 Quick Reference -->
		<div id="section-8-2" class="mb-8">
			<SectionHeader
				level="section"
				icon={Table}
				title="8.2 Quick Reference Card"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/quick-reference.webp"
					alt="Quick Reference Card — Git tasks with terminal commands and VS Code equivalents"
					caption="Keep this cheat sheet handy — terminal commands and their VS Code equivalents"
				/>
			</div>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Keep this handy. It covers the most common Git tasks with both the terminal command and the
				VS Code equivalent, so you can use whichever feels more natural.
			</p>

			<div class="overflow-x-auto rounded-lg" style="background: var(--color-bg-secondary);">
				<table class="w-full text-xs">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>Task</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>Command</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>VS Code</th
							>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Check what changed</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git status</code></td
							>
							<td class="px-3 py-2">Source Control panel</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Stage specific lines</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git add -p</code></td
							>
							<td class="px-3 py-2">Stage Selected Ranges</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Commit changes</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git commit -m "feat: ..."</code></td
							>
							<td class="px-3 py-2">Type message + checkmark</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Create new branch</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git switch -c feature/name</code></td
							>
							<td class="px-3 py-2">Click branch name (bottom-left)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Discard local changes</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git restore .</code></td
							>
							<td class="px-3 py-2">Discard Changes</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Undo last commit (keep)</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git reset --soft HEAD~1</code></td
							>
							<td class="px-3 py-2">GitLens: Reset</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Revert public commit</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git revert &lt;hash&gt;</code></td
							>
							<td class="px-3 py-2">Revert Commit</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Stash work in progress</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git stash push -m "message"</code></td
							>
							<td class="px-3 py-2">... menu: Stash</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Update branch</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);"
									>git fetch && git rebase origin/main</code
								></td
							>
							<td class="px-3 py-2">... menu: Pull, Rebase</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Safe force push</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git push --force-with-lease</code></td
							>
							<td class="px-3 py-2">Terminal only</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Practice all commands</td>
							<td class="px-3 py-2">
								<button
									type="button"
									onclick={onOpenPlayground}
									class="cursor-pointer underline underline-offset-2"
									style="color: var(--color-primary);">Git Playground</button
								>
							</td>
							<td class="px-3 py-2">Try it yourself tabs in Parts 2–5</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- 8.3 Keep Learning -->
		<div id="section-8-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={Library}
				title="8.3 Keep Learning — The References That Matter"
				color="var(--color-primary)"
			/>

			<p class="mb-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
				You've practiced everything here in a real repository — but Git is deep, and the best
				references are worth knowing by name. These five will cover you from quick lookups to true
				mastery:
			</p>

			<div class="mb-4 space-y-3">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://git-scm.com"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">git-scm.com</a
						>
						<span style="color: var(--color-text);"> — the official Git site</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Downloads, release notes, and the authoritative
						<a
							href="https://git-scm.com/docs"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">command reference</a
						>
						— the same pages
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>git help &lt;command&gt;</code
						> shows you locally.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://git-scm.com/book"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Pro Git</a
						>
						<span style="color: var(--color-text);"> — the book, free forever</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						The definitive deep dive, from first commit to Git internals. When you want to know
						<em>why</em> Git works the way it does, this is the answer.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://learngitbranching.js.org"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Learn Git Branching</a
						>
						<span style="color: var(--color-text);"> — branching puzzles</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Thirty minutes of visual rebase-and-merge puzzles. A great gym for the branch topology
						instincts you started building in Parts 3 and 5 — the muscle memory will save you hours.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://docs.github.com"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">GitHub Docs</a
						>
						<span style="color: var(--color-text);"> — the collaboration layer</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Pull requests, protected branches, Actions, and everything else that lives above Git
						itself at most workplaces.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://ohshitgit.com"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Oh Shit, Git!?!</a
						>
						<span style="color: var(--color-text);"> — panic-mode recipes</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Blunt, funny, and correct recovery recipes for the moments Part 4 trained you for. Keep
						it bookmarked next to your reflog.
					</p>
				</div>
			</div>
		</div>

		<!-- Final Thoughts -->
		<div class="mb-8">
			<Callout type="important">
				<strong>Final Thoughts:</strong> Your AI assistants are powerful tools that lack context and accountability.
				Git is your system of accountability. It provides the immutable history, the instant "undo" button,
				and the human-in-the-loop review layer that transforms high-velocity AI coding from a risky experiment
				into a professional, safe, and scalable engineering discipline. Master it, and you'll transform
				AI-assisted coding into a superpower.
			</Callout>
		</div>
	</div>
</section>
