<script lang="ts">
	import { BookOpen, Library, Workflow, Table, Trophy } from 'lucide-svelte';
	import { base } from '$app/paths';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import Callout from '../ui/Callout.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
	import { progress, toggleChecklistItem } from '$lib/data/progress';

	let {
		onOpenPlayground
	}: {
		onOpenPlayground?: () => void;
	} = $props();

	const SKILL_CHECKLIST = [
		{ id: 'three-areas', label: 'I can explain working directory vs staging area vs repository.' },
		{
			id: 'review-diff',
			label: 'I review AI diffs before staging: status → diff → add -p, never blind git add .'
		},
		{
			id: 'commit-body',
			label: 'I can write a Conventional Commit with a body that explains why.'
		},
		{
			id: 'branch-push',
			label: 'I can create a branch, push it with tracking, and open a draft PR.'
		},
		{
			id: 'unstage-discard',
			label: 'I know restore vs restore --staged vs commit --amend without checking.'
		},
		{
			id: 'revert',
			label: 'I can undo a pushed commit safely with revert (and know why not reset).'
		},
		{ id: 'reflog', label: 'I can recover "lost" commits with the reflog.' },
		{
			id: 'conflicts',
			label: 'I can resolve a merge conflict AND a rebase conflict — and I know whose side HEAD is.'
		},
		{
			id: 'lease-push',
			label: 'I know when force-with-lease is safe and what the lease actually checks.'
		},
		{
			id: 'agent-guardrails',
			label: 'I can set up AGENTS.md, a pre-commit hook, and branch protection for an AI agent.'
		},
		{
			id: 'ship-it',
			label:
				'I can explain what CI checks on a PR, why Dependabot opens PRs, and how a feat: commit becomes a changelog line and a version tag.'
		}
	];
</script>

<section id="part-9" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={BookOpen}
			partLabel="Part 9"
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

		<!-- 9.1 AI-First Workflow -->
		<div id="section-9-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Workflow}
				title="9.1 The AI-First Workflow (Summary)"
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
				<a
					href="#section-6-1"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 6.1</a
				>) so agents follow them automatically instead of re-explaining branch rules in every chat.
				And remember: you can practice any step of this loop in the
				<button
					type="button"
					onclick={onOpenPlayground}
					class="cursor-pointer underline underline-offset-2"
					style="color: var(--color-primary);">Git Playground</button
				> — real Git commands, right in your browser.
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
							Create an isolated branch so the AI can never touch <code
								style="font-family: var(--font-mono);">main</code
							>
							directly.
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

		<!-- 9.2 Quick Reference -->
		<div id="section-9-2" class="mb-8">
			<SectionHeader
				level="section"
				icon={Table}
				title="9.2 Quick Reference Card"
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
							<td class="px-3 py-2">... menu: Commit → Undo Last Commit</td>
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
							<td class="px-3 py-2">... menu: Pull (Rebase)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Safe force push</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git push --force-with-lease</code></td
							>
							<td class="px-3 py-2"
								>Git: Push (Force With Lease) — needs the git.allowForcePush setting</td
							>
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

		<!-- 9.3 The Final Challenge -->
		<div id="section-9-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={Trophy}
				title="9.3 The Final Challenge"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Reading is not knowing. Here's the exam — one repository, three simultaneous messes, no
				step-by-step instructions. Everything you need is in Parts 2 through 5, and the playground
				will tell you the moment you've won.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/final-challenge.webp"
					alt="The Final Challenge — three messes, one repo, no instructions"
					caption="Three simultaneous messes, one repository — everything from Parts 2–5 at once"
				/>
			</div>

			<Callout type="important">
				<strong>Your mission:</strong> a payment feature was committed straight to
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>, a live Stripe key is sitting <em>staged</em> and one careless commit away from leaking,
				and the cleaned-up main still needs its
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">v1.0.0</code
				> release tag. Fix all three, in any order.
			</Callout>

			<h4
				id="capstone"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: The Final Challenge
			</h4>
			<PlaygroundNote>
				Start with <code>git status</code> and <code>git log --oneline</code> to survey the damage. A
				✔ appears in the terminal when all three goals are met — no partial credit.
			</PlaygroundNote>
			<LessonActivity title="The Final Challenge" scenarioId="capstone" id="capstone" />

			<h4 class="mt-8 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The Skill Checklist
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Beyond the challenge, here's the honest self-test. Check each item only when you could do it
				<em>right now, without looking anything up</em>. (Saved locally in your browser — nobody's
				grading you but you.)
			</p>

			<div class="mb-4 space-y-1.5">
				{#each SKILL_CHECKLIST as item (item.id)}
					<button
						type="button"
						onclick={() => toggleChecklistItem(item.id)}
						class="flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-left transition-opacity hover:opacity-80"
						style="background: var(--color-bg-secondary);"
					>
						<span
							class="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border text-[11px] font-bold"
							style="border-color: {$progress.checklist[item.id]
								? 'var(--color-tip)'
								: 'var(--color-border)'}; color: var(--color-tip); background: {$progress.checklist[
								item.id
							]
								? 'color-mix(in srgb, var(--color-tip) 15%, transparent)'
								: 'transparent'};"
						>
							{$progress.checklist[item.id] ? '✔' : ''}
						</span>
						<span
							class="text-[13px]"
							style="color: {$progress.checklist[item.id]
								? 'var(--color-text-muted)'
								: 'var(--color-text-secondary)'};"
						>
							{item.label}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 9.4 Keep Learning -->
		<div id="section-9-4" class="mb-14">
			<SectionHeader
				level="section"
				icon={Library}
				title="9.4 Keep Learning — The References That Matter"
				color="var(--color-primary)"
			/>

			<div class="mb-6">
				<ExpandableImage
					src="{base}/images/keep-learning.webp"
					alt="Keep learning — a doorway opening onto a constellation of branching paths"
					caption="This guide ends here — the history graph keeps going"
				/>
			</div>

			<p class="mb-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
				You've practiced everything here in a real repository — but Git is deep, and the best
				references are worth knowing by name. These six will cover you from quick lookups to true
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

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://ohmygit.org"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Oh My Git!</a
						>
						<span style="color: var(--color-text);"> — Git as a video game</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						An open-source game that visualizes Git's internals live as you play cards and type
						commands. The gentlest way to make the commit graph feel physical — and genuinely fun.
					</p>
				</div>
			</div>

			<h4 class="mt-8 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				GitHub Is a Choice, Not a Given
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				This guide uses GitHub because it's where most of the industry (and most of the AI-agent
				ecosystem) lives — but here's an honest secret: <strong style="color: var(--color-text);"
					>almost nothing you learned is GitHub-specific</strong
				>. Git itself is decentralized; every clone carries the full history, and the "forge" —
				GitHub, or any of the sites below — is just the hosting and collaboration layer on top. Even
				the pull request is a forge invention, not a Git feature. Switching forges is one command (<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git remote set-url origin &lt;new-url&gt;</code
				>) and a push. The alternatives worth knowing:
			</p>

			<div class="mb-4 space-y-3">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://about.gitlab.com"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">GitLab</a
						>
						<span style="color: var(--color-text);"> — the whole-pipeline platform</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						GitHub's biggest rival, and the one you're most likely to meet at work. Pull requests
						are called <strong>merge requests (MRs)</strong> — same thing, different name. Its edge:
						one integrated application from issue to CI/CD to deployment to security scanning (it
						had built-in pipelines years before GitHub Actions existed), and an open-source core you
						can <strong>self-host for free</strong> — which is why regulated companies that can't put
						code on someone else's cloud often run their own GitLab. What GitHub has that it doesn't:
						the network — the world's largest open-source community, the Actions marketplace, and the
						deepest AI-agent integrations (Copilot, Agent HQ).
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://bitbucket.org"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Bitbucket</a
						>
						<span style="color: var(--color-text);"> — the Atlassian citizen</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Atlassian's forge. Its reason to exist is deep, native integration with Jira and
						Confluence — branch from a ticket, and the ticket tracks the PR's whole lifecycle
						automatically. If your company runs on Jira, you may well find your code here. Outside
						that ecosystem it offers little GitHub doesn't, and its open-source presence is small.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://codeberg.org"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">Codeberg</a
						>
						<span style="color: var(--color-text);">
							&
							<a
								href="https://forgejo.org"
								target="_blank"
								rel="noopener noreferrer"
								class="underline underline-offset-2"
								style="color: var(--color-primary);">Forgejo</a
							> — the community option</span
						>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Codeberg is a nonprofit, donation-funded forge run for open source — no ads, no
						tracking, no AI training on your code, and that <em>is</em> the pitch. It runs Forgejo, free
						software you can self-host yourself as a single small binary (its ancestor Gitea works the
						same way) — the lightweight answer when a whole GitLab is overkill. The trade-off is the same
						network effect in reverse: fewer eyes, fewer integrations, no agent ecosystem.
					</p>
				</div>

				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-1 text-[14px] font-semibold">
						<a
							href="https://sourcehut.org"
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">SourceHut</a
						>
						<span style="color: var(--color-text);"> — Git the old way, on purpose</span>
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						A deliberately minimal, JavaScript-free forge built around Git's original collaboration
						model: patches reviewed over <strong>email</strong>, the way the Linux kernel still
						works. No pull-request button at all. Worth knowing because it proves the point above —
						the PR is a convention, not a law — and because some significant projects genuinely work
						this way.
					</p>
				</div>
			</div>

			<p class="mb-4 text-[13px]" style="color: var(--color-text-secondary);">
				(Also out there: <a
					href="https://azure.microsoft.com/en-us/products/devops"
					target="_blank"
					rel="noopener noreferrer"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">Azure DevOps</a
				>
				in Microsoft-stack enterprises, and experimental peer-to-peer forges like
				<a
					href="https://radicle.xyz"
					target="_blank"
					rel="noopener noreferrer"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">Radicle</a
				> with no central server at all. Wherever you land: same Git, same commands, same you.)
			</p>

			<Callout type="note">
				<strong>And a glimpse past Git:</strong>
				<a
					href="https://github.com/jj-vcs/jj"
					target="_blank"
					rel="noopener noreferrer"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">Jujutsu (jj)</a
				>
				is the most credible next-generation version control tool — a Git-compatible frontend that stores
				real Git commits, so your team never has to know you're using it. It snapshots your working copy
				automatically (every command is undoable with
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">jj undo</code
				>), which is making it popular for agent-heavy workflows. Still pre-1.0 and evolving fast —
				but everything you learned here transfers, because underneath, it <em>is</em> Git.
				<a
					href="https://steveklabnik.github.io/jujutsu-tutorial/"
					target="_blank"
					rel="noopener noreferrer"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">Steve Klabnik's tutorial</a
				> is the place to start when you're curious.
			</Callout>
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
