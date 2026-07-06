<script lang="ts">
	import { BookOpen, Workflow, Table, Sparkles, FolderGit2 } from 'lucide-svelte';
	import { base } from '$app/paths';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';

	let {
		onOpenPlayground
	}: {
		onOpenPlayground?: () => void;
	} = $props();
</script>

<section id="part-7" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={BookOpen}
			partLabel="Part 7"
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

		<!-- 7.1 AI-First Workflow -->
		<div id="section-7-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Workflow}
				title="7.1 The AI-First Workflow (Summary)"
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
				section 7.3) so agents follow them automatically instead of re-explaining branch rules in
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
							Create an isolated branch — or practice every step in the
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

		<!-- 7.2 Quick Reference -->
		<div id="section-7-2" class="mb-8">
			<SectionHeader
				level="section"
				icon={Table}
				title="7.2 Quick Reference Card"
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

		<!-- 7.3 Teaching Your AI to Use Git -->
		<div id="section-7-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={Sparkles}
				title="7.3 Teaching Your AI to Use Git"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/configure-once.webp"
					alt="Configure Once — AGENTS.md, skills, VS Code agents, and CI automations for Git conventions"
					caption="Encode your conventions once and let AI agents follow them automatically"
				/>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				The next level is not just using Git to manage AI — it's encoding your Git workflow so
				agents follow it automatically. Modern tools share a simple pattern: <strong
					style="color: var(--color-text);">always-on project instructions</strong
				>
				for conventions that apply everywhere, plus
				<strong style="color: var(--color-text);">skills</strong> for detailed procedures that load only
				when relevant.
			</p>

			<div class="mb-6 space-y-3">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Always-on instructions: AGENTS.md &amp; friends
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>AGENTS.md</code
						>
						is the cross-tool standard for project-wide rules — recognized by GitHub Copilot, Claude Code,
						Codex, and other agents. In monorepos, the nearest file to the code you're editing takes precedence.
						Claude Code also reads
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>CLAUDE.md</code
						>
						for the same role. In VS Code, add
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.github/copilot-instructions.md</code
						> for Copilot-specific standards. Put your team's Git constitution here: branch naming, Conventional
						Commits, "never reset shared branches," PR expectations. Keep it concise — this loads on every
						session.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Agent Skills (SKILL.md)
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Skills are the open <a
							href="https://agentskills.io"
							class="underline underline-offset-2"
							style="color: var(--color-primary);"
							target="_blank"
							rel="noopener noreferrer">Agent Skills</a
						>
						format: a folder with a
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>SKILL.md</code
						>
						file (name + description in YAML frontmatter, instructions in the body). Store them in
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.agents/skills/</code
						>
						for portable, version-controlled workflows your whole team shares. Agents discover skills
						at startup and load the full instructions only when a task matches — perfect for detailed
						Git procedures without bloating every chat. Example: a
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>git-save-game/</code
						> skill that walks through the 8-step loop before every PR.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						VS Code: scoped rules &amp; custom agents
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						For rules that apply only to certain files, add <code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>*.instructions.md</code
						>
						files under
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.github/instructions/</code
						>
						with an
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);">applyTo</code
						>
						glob in the frontmatter. For specialized personas, define custom agents as
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.github/agents/*.agent.md</code
						>
						— YAML frontmatter sets the name, description, tools, and model; the body holds focused instructions
						(e.g., a "Git Review" agent that inspects staged diffs and suggests commit splits). Use
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>/create-instruction</code
						>
						or
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>/create-agent</code
						> in VS Code chat to scaffold these files.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						CI &amp; repository automations
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Repo instructions also power GitHub Copilot code review and cloud agents on pull
						requests. Combine with GitHub Actions to auto-review PRs, flag risky Git operations, or
						update docs when code changes — Git remains the audit trail even when agents operate in
						CI.
					</p>
				</div>
			</div>

			<h4 class="mt-8 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				A complete AGENTS.md you can steal
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Theory is nice, but what does a Git constitution actually look like? Here's a complete,
				copy-pastable example. Drop it in your repo root, adjust the branch prefixes and test
				command to match your project, and every agent that opens the repo inherits your rules.
			</p>

			<CodeBlock
				title="AGENTS.md"
				lang="markdown"
				code={`# Git Rules for AI Agents

## Branches
- Never commit directly to main. Always work on a branch.
- Branch names: feature/<topic> for features, fix/<topic> for
  bug fixes, agent/<topic> for autonomous or experimental work.
- One branch per task. Do not reuse branches across tasks.

## Before staging anything
- Run \`git status\` and \`git diff\` first. Read the diff.
- Stage only files you intentionally changed. Never \`git add .\`
  when the diff contains files you don't recognize.

## Commits
- Use Conventional Commits with a scope:
  feat(auth): ..., fix(api): ..., refactor(parser): ...,
  docs(readme): ..., test(payments): ..., chore(deps): ...
- Keep commits small and focused: one logical change per commit.
- Run the test suite (\`npm test\`) before every commit.
  If tests fail, fix them or ask — do not commit broken code.

## Pushing and history
- Never use \`git push --force\`. If a push is rejected after a
  rebase, use \`git push --force-with-lease\` — and only on your
  own feature branches, never on main or shared branches.
- Never rewrite history that has been pushed and shared
  (no rebase/reset/amend on public commits — use \`git revert\`).

## When unsure
- Stop and ask before any destructive command
  (reset --hard, clean, filter-repo, branch -D).`}
			/>

			<p class="mt-6 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				For multi-step procedures, a skill keeps the detail out of your always-on instructions.
				Here's a small worked example: a "save-game checkpoint" skill that encodes the
				status-review-stage-commit ritual from Part 2 so the agent runs it the same way every time.
			</p>

			<CodeBlock
				title=".agents/skills/save-game-checkpoint/SKILL.md"
				lang="markdown"
				code={`---
name: save-game-checkpoint
description: Create a clean Git checkpoint after a working change.
---

# Save-game checkpoint

1. Run \`git status\` — list every modified and untracked file.
2. Run \`git diff\` and summarize the changes for the user.
3. Flag anything unexpected (unrelated files, debug prints,
   secrets, lockfile churn) before proceeding.
4. Stage only the files that belong to this change:
   \`git add <file> <file>\` — never \`git add .\`
5. Commit with a Conventional Commit message and scope, e.g.
   \`git commit -m "feat(payments): add refund endpoint"\`
6. Confirm with \`git log --oneline -1\` and report the hash.`}
			/>

			<h4 class="mt-8 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Reviewing large AI diffs
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Even well-instructed agents produce big diffs, and a 40-file diff read top-to-bottom is
				where review discipline goes to die. Triage instead: run <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git diff --stat</code
				>
				first to see which files changed and by how much — that one screen tells you whether the change
				matches the task you assigned. Then review file by file with
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git diff &lt;file&gt;</code
				>, starting with the files you'd least expect to change. When only part of the work is good,
				use
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add -p</code
				> to stage the keepers hunk by hunk and discard the rest.
			</p>

			<Callout type="tip">
				<strong>Reject, don't salvage.</strong> When a huge AI pull request is mostly wrong, resist
				the urge to edit it into shape — salvage-editing someone else's sprawling diff takes longer
				than redoing it and hides mistakes you didn't notice. Close the PR,
				<code style="font-family: var(--font-mono);">git cherry-pick</code> the few good commits onto
				a fresh branch, and re-prompt for the rest with tighter scope. Cheap branches (Part 3) exist precisely
				so throwing work away costs nothing.
			</Callout>

			<VibeBox
				prompts={[
					'Read AGENTS.md and follow its Git rules for every change in this session',
					'Draft an AGENTS.md with our Git branch naming and Conventional Commits rules, then create a save-game-checkpoint SKILL.md to match'
				]}
			/>
		</div>

		<!-- 7.4 Parallel Agents with Git Worktrees -->
		<div id="section-7-4" class="mb-14">
			<SectionHeader
				level="section"
				icon={FolderGit2}
				title="7.4 Parallel Agents with Git Worktrees"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-worktrees.webp"
					alt="Git worktrees — one repository powering multiple working directories, each with its own branch and AI agent"
					caption="One .git, many working directories — run an agent per worktree with zero interference"
				/>
			</div>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Here's the endgame scenario: you want Agent A refactoring the auth module while Agent B
				builds the payments feature — in the same repository, at the same time. If both agents share
				one working directory, they'll trample each other's files, and every <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git switch</code
				> by one agent yanks the floor out from under the other. Worktrees solve this.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				A <strong style="color: var(--color-text);">worktree</strong> is an extra working directory
				attached to the same repository. All worktrees share one
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git</code
				> database — same commits, same branches, same remotes — but each directory has its own checked-out
				branch, its own files on disk, and its own staging area. Creating one takes a second, because
				nothing is copied except the files of the branch you check out.
			</p>

			<CodeBlock
				title="One agent per worktree"
				code={`# From your main checkout (~/repos/proj on main)
git worktree add ../proj-auth feature/auth-refactor
git worktree add ../proj-payments feature/payments

# See every working directory attached to this repo
git worktree list
# /Users/you/repos/proj           abc1234 [main]
# /Users/you/repos/proj-auth      def5678 [feature/auth-refactor]
# /Users/you/repos/proj-payments  9ab0cde [feature/payments]

# Open a terminal in each directory and start one agent per worktree:
#   Terminal 1: cd ../proj-auth      -> Agent A refactors auth
#   Terminal 2: cd ../proj-payments  -> Agent B builds payments`}
			/>

			<p class="mt-2 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				If the branch doesn't exist yet, <code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git worktree add -b feature/payments ../proj-payments</code
				> creates it in one step. Note that a branch can only be checked out in one worktree at a time
				— Git enforces this, which is exactly the isolation guarantee you want: two agents can never be
				editing the same branch's files.
			</p>

			<MermaidDiagram
				definition={`graph TD
  G[("one shared .git database")] --> W1(["~/repos/proj<br/>main — you"])
  G --> W2(["~/repos/proj-auth<br/>feature/auth-refactor — Agent A"])
  G --> W3(["~/repos/proj-payments<br/>feature/payments — Agent B"])
  W2 --> M(["PR review → merge to main"])
  W3 --> M`}
				id="worktrees-parallel-agents"
			/>
			<p class="mt-2 px-1 text-xs" style="color: var(--color-text-muted);">
				Every worktree commits into the same repository — the branches just live in different
				folders until they're merged.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Why not just clone the repo twice? Clones work, but worktrees are better on every axis: the
				object database is shared (no duplicated gigabytes), creation is instant, remotes and config
				come along for free, and a commit made in one worktree is immediately visible from all the
				others — no pushing and pulling between your own directories. When both agents are done,
				merging their branches is the normal PR flow from Part 3: push each branch, open a pull
				request, review the diff, merge. Nothing about worktrees changes how integration works.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				A few habits keep this tidy: name each worktree directory after its branch (<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">proj-auth</code
				>
				for
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>feature/auth-refactor</code
				>) so you always know which terminal belongs to which agent, and clean up when a branch
				merges.
			</p>

			<CodeBlock
				title="Cleanup after the merge"
				code={`# Remove a worktree you're done with (its branch survives)
git worktree remove ../proj-auth

# If you deleted a worktree folder manually, clear the stale record
git worktree prune`}
			/>

			<Callout type="warning">
				<strong>Two sharp edges.</strong> First, worktrees share the repository — local config (<code
					style="font-family: var(--font-mono);">.git/config</code
				>) and the stash list are per-repo, not per-worktree, so a
				<code style="font-family: var(--font-mono);">git stash</code>
				made in one worktree is visible (and poppable) from all of them. Second, always create worktrees
				<em>outside</em> the main repo folder (<code style="font-family: var(--font-mono);"
					>../proj-auth</code
				>, not <code style="font-family: var(--font-mono);">./proj-auth</code>) — a worktree nested
				inside the repo shows up as an untracked directory, and an agent running
				<code style="font-family: var(--font-mono);">git add .</code> might happily commit it.
			</Callout>

			<VibeBox
				prompts={[
					'Create a worktree for branch feature/payments at ../proj-payments and start working there',
					'List all worktrees in this repo, and remove any whose branches are already merged into main'
				]}
			/>
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
