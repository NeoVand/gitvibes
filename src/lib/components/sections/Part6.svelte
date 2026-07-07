<script lang="ts">
	import { Bot, Sparkles, Webhook, FolderGit2 } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-6" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Bot}
			partLabel="Part 6"
			title="Git for AI Agents: Rules, Guardrails, and Scale"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"An agent with good Git habits is worth ten that just move fast."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			You now know the toolkit — the safety loop, branches, the undo arsenal, the advanced moves.
			This chapter turns that knowledge into a system your AI assistants follow as reliably as you
			do: written rules they read (AGENTS.md and skills), mechanical guardrails they cannot skip
			(hooks), and a layout that lets several agents work the same repository at once without
			stepping on each other (worktrees).
		</p>

		<!-- 6.1 Teaching Your AI to Use Git -->
		<div id="section-6-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Sparkles}
				title="6.1 Teaching Your AI to Use Git"
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

			<Callout type="note">
				<strong>The Problem:</strong> Your agent commits straight to main, invents its own branch names,
				and writes messages like "fixed stuff" — and re-explaining your team's rules at the start of every
				session doesn't scale. The rules need to live in the repository, where every agent reads them
				automatically.
			</Callout>

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
						is the cross-tool standard for project-wide rules — an open spec (now stewarded by the Linux
						Foundation) read by OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, and twenty-plus other
						agents. In monorepos, the nearest file to the code you're editing takes precedence. The one
						big exception:
						<strong
							>Claude Code reads
							<code
								class="rounded px-1 py-0.5 text-xs"
								style="background: var(--color-code-bg); font-family: var(--font-mono);"
								>CLAUDE.md</code
							>, not AGENTS.md</strong
						>
						(as of mid-2026). The documented bridge is a one-line CLAUDE.md containing
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>@AGENTS.md</code
						>
						— an import that pulls the shared file in — or a symlink (<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>ln -s AGENTS.md CLAUDE.md</code
						>). In VS Code, add
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
						file (name + description in YAML frontmatter, instructions in the body). The format is portable;
						the folder isn't yet — each tool has its own discovery path, like
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.agents/skills/</code
						>
						for Codex and
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>.claude/skills/</code
						>
						for Claude Code — so check where your agent looks. Either way they're version-controlled workflows
						your whole team shares. Agents discover skills at startup and load the full instructions only
						when a task matches — perfect for detailed Git procedures without bloating every chat. Example:
						a
						<code
							class="rounded px-1 py-0.5 text-xs"
							style="background: var(--color-code-bg); font-family: var(--font-mono);"
							>git-save-game/</code
						> skill that walks through the full save-game ritual — branch, review, stage, commit — before
						every PR.
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

			<h4 class="mt-8 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Who Wrote This — You or the Machine?
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Six months from now, someone running <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git blame</code
				>
				will want to know whether a human decided this line or an agent generated it. Three layers of
				attribution, weakest to strongest:
			</p>

			<ul
				class="mb-4 list-inside list-disc space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>
					<strong>Trailers.</strong> Claude Code and Copilot append
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>Co-Authored-By:</code
					>
					lines to their commits by default — you'll see these in your own history. Useful as a hint,
					but easy to strip or forget, so never treat them as a measurement of anything.
				</li>
				<li>
					<strong>Per-worktree identity.</strong> Running agents in worktrees (6.3)? Give each its
					own name so blame tells Agent A from Agent B:
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>git config extensions.worktreeConfig true</code
					>, then
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>git config --worktree user.name "Agent A (auth)"</code
					> inside each worktree.
				</li>
				<li>
					<strong>Signing.</strong> The strong claim runs the other way: commits <em>you</em>
					sign are verifiably yours. Modern setup is SSH-based and reuses the key from Part 1 (<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>gpg.format ssh</code
					>
					+
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>commit.gpgsign true</code
					>); GitHub shows "Verified" badges, and its <em>vigilant mode</em> flags anything unsigned that
					claims to be you. In a world of agents committing under borrowed names, "the human signed off
					here" is worth making cryptographic.
				</li>
			</ul>

			<VibeBox
				prompts={[
					'Read AGENTS.md and follow its Git rules for every change in this session',
					'Draft an AGENTS.md with our Git branch naming and Conventional Commits rules, then create a save-game-checkpoint SKILL.md to match'
				]}
			/>
		</div>

		<!-- 6.2 Git Hooks -->
		<div id="section-6-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={Webhook}
				title="6.2 Automating Quality with Git Hooks"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You told your agent: "always run the tests before committing." It did — for the first three
				commits. Then, deep in a refactor, it forgot, and a broken commit landed in history. Rules
				that live in a prompt are suggestions. Rules that live in Git are law. That's what
				<strong style="color: var(--color-text);">hooks</strong> are for.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-hooks.webp"
					alt="Git hooks — an automated checkpoint that inspects every commit before it's allowed through"
					caption="A hook is a script Git runs at key moments — a mechanical gate no commit can skip"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You can't rely on yourself — or an AI agent — to remember to lint,
				test, and format before every commit. You need the check to happen automatically, every time,
				with no memory required.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				A <strong style="color: var(--color-text);">Git hook</strong> is a script that Git runs
				automatically at a specific moment — before a commit is created, after a merge, before a
				push. Hooks live in the
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git/hooks/</code
				>
				directory of your repository, where Git puts a set of
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.sample</code
				>
				files to get you started. One crucial detail:
				<strong style="color: var(--color-text);">
					the .git directory is never committed, so hooks are not versioned</strong
				> — they don't travel with a clone. We'll fix that in a moment.
			</p>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				A Minimal pre-commit Hook
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The <strong style="color: var(--color-text);">pre-commit</strong> hook runs before Git
				creates a commit. If the script exits with a non-zero status, the commit is blocked. Create
				a file named
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>.git/hooks/pre-commit</code
				> (no file extension) and make it executable:
			</p>

			<CodeBlock
				title=".git/hooks/pre-commit"
				code={`#!/bin/sh
echo "Running checks before commit..."

npm run lint || { echo "Lint failed - commit blocked." >&2; exit 1; }
npm test || { echo "Tests failed - commit blocked." >&2; exit 1; }`}
			/>

			<CodeBlock title="Make it executable (once)" code="chmod +x .git/hooks/pre-commit" />

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				From now on, every <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				> in this repository runs your lint and test suite first. If either fails, nothing gets committed
				— no exceptions, no forgetting.
			</p>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Enforcing Commit Message Standards
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The <strong style="color: var(--color-text);">commit-msg</strong> hook receives the path to
				a file containing the proposed commit message. Here's a compact one that enforces
				<strong style="color: var(--color-text);">Conventional Commits</strong>
				(messages like
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>feat: add login form</code
				>):
			</p>

			<CodeBlock
				title=".git/hooks/commit-msg"
				code={`#!/bin/sh
# Git's own merge and revert commits ("Merge branch ...", "Revert ...")
# also pass through this hook - wave them through.
grep -qE '^(Merge|Revert)' "$1" && exit 0

if ! grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\\(.+\\))?!?: .+' "$1"; then
  echo "Commit message must follow Conventional Commits, e.g. 'feat: add login form'" >&2
  exit 1
fi`}
			/>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Making Hooks Shareable
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Since <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git/hooks/</code
				>
				isn't versioned, your teammates (and their agents) won't get your hooks automatically. The lightweight
				fix is a committed hooks folder plus
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>core.hooksPath</code
				>:
			</p>

			<CodeBlock
				title="Option 1: a versioned hooks folder"
				code={`mkdir .githooks
# move your hook scripts into .githooks/, then:
git config core.hooksPath .githooks

# commit the folder - each teammate runs the config command once`}
			/>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In the JavaScript world, <strong style="color: var(--color-text);">Husky</strong> is the
				popular tool that automates exactly this — it wires up the hooks path when anyone runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">npm install</code
				>:
			</p>

			<CodeBlock
				title="Option 2: Husky"
				code={`npm install --save-dev husky
npx husky init

# init already created .husky/pre-commit (it runs "npm test").
# Overwrite it with whatever checks you want:
echo "npm run lint && npm test" > .husky/pre-commit`}
			/>

			<Callout type="note">
				Fine print: pre-commit hooks run against your <em>working tree</em>, not the staged
				snapshot. If you stage only part of a file with
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add -p</code
				>, the tests pass on code that isn't what you're committing. Tools like
				<strong>lint-staged</strong> exist to close exactly that gap.
			</Callout>

			<Callout type="important">
				<strong>Hooks fire on agent commits too.</strong> When Claude Code, Cursor, or any AI agent
				runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				>, your pre-commit and commit-msg hooks run exactly as if you'd typed the command yourself.
				This is how you enforce standards on AI-authored code
				<em>without trusting the AI to remember</em> — the agent literally cannot commit failing code
				or a sloppy message. Better yet, agents read the error output and usually fix the problem and
				retry on their own.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				One escape hatch to know about: <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git commit --no-verify</code
				>
				skips the pre-commit and commit-msg hooks entirely. It exists for genuine emergencies — a broken
				hook blocking a critical hotfix — but use it sparingly. Every
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--no-verify</code
				> is a hole in your safety net, and it's a habit you especially don't want your agents learning.
			</p>

			<Callout type="important">
				<strong>Which means: client hooks are seatbelts, not laws.</strong> Anything that can run
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				>
				can also run it with
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--no-verify</code
				>
				— and agents do learn that trick from error loops. The layer nothing can skip lives on the
				<em>server</em>: branch protection rulesets on
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>
				(require a PR, require passing CI, require an approval — section 3.3). Hooks catch problems in
				seconds on the developer's machine; the ruleset is the law at the gate. Use both.
			</Callout>

			<Callout type="note">
				<strong>A naming collision to keep straight:</strong> your agent tools have "hooks" too —
				Claude Code hooks, Cursor hooks, VS Code agent hooks — which fire on
				<em>agent lifecycle</em>
				events (before a tool runs, after an edit). Those govern the agent; the hooks in this section
				live in the <em>repository</em> and govern anyone who commits, human or machine. They complement
				each other: an agent hook can stop a bad command before it runs, a Git hook stops a bad commit
				no matter who makes it.
			</Callout>

			<h4
				id="hooks"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: The Hooks Say No
			</h4>
			<PlaygroundNote>
				This repo has (simulated) husky hooks installed. An agent left a <code>BREAKPOINT</code> in
				<code>src/app.py</code> — try to commit it and watch pre-commit block you, then get vetoed by
				commit-msg for a sloppy message. Fix both properly.
			</PlaygroundNote>
			<LessonActivity title="Hooks: Mechanical Guardrails" scenarioId="hooks" id="hooks" />

			<VibeBox
				prompts={[
					'Set up a pre-commit hook that runs our lint and test scripts and blocks the commit if either fails',
					'Add a commit-msg hook enforcing Conventional Commits, and make the hooks shareable with the team via Husky'
				]}
			/>
		</div>
		<!-- 6.3 Parallel Agents with Git Worktrees -->
		<div id="section-6-3" class="mb-8">
			<SectionHeader
				level="section"
				icon={FolderGit2}
				title="6.3 Parallel Agents with Git Worktrees"
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
				<code style="font-family: var(--font-mono);">git add .</code> will sweep it up as a confusing
				embedded-repo pointer (Git prints a warning — which everyone ignores).
			</Callout>

			<Callout type="caution">
				<strong>The #1 practical gotcha: a fresh worktree is code-only.</strong> It contains the
				branch's <em>tracked</em> files and nothing else — no
				<code style="font-family: var(--font-mono);">node_modules/</code>, no
				<code style="font-family: var(--font-mono);">.venv</code>, no untracked
				<code style="font-family: var(--font-mono);">.env</code>. Agent B's first command will fail
				until someone runs the install step there, and two agents starting dev servers will fight
				over the same port. Budget one setup command per worktree (and a port per agent) into your
				plan — or into the agent's instructions.
			</Callout>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				And a sign of how central this pattern has become: the agent tools now create worktrees
				<em>for you</em>. Claude Code has
				<code style="font-family: var(--font-mono);">claude --worktree</code>
				(agents get isolated worktrees under
				<code style="font-family: var(--font-mono);">.claude/worktrees/</code>, auto-cleaned when
				untouched), Cursor spins up a worktree per parallel agent, and desktop agent apps do it per
				session. When you find a mystery directory or a
				<code style="font-family: var(--font-mono);">worktree-quiet-fox</code> branch, that's what
				it was —
				<code style="font-family: var(--font-mono);">git worktree list</code> is how you audit them, and
				now you know how to clean them up.
			</p>

			<Callout type="important">
				<strong>Checkpoints are not commits.</strong> Claude Code and Cursor both auto-checkpoint
				the agent's edits so you can rewind a session — genuinely useful, and genuinely <em>not</em>
				Git. Checkpoints are session-local: they don't capture what shell commands did, they can't be
				pushed or shared, and they expire with the session. The rule of thumb:
				<strong>rewind with checkpoints between commits; save with commits</strong>. Anything worth
				keeping past the current session goes into a real commit — the durable layer this whole
				guide is about.
			</Callout>

			<p class="mt-5 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				Two monorepo-scale companions worth knowing by name: <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git sparse-checkout set pkg/api</code
				>
				materializes only the directories an agent actually needs (a worktree per agent, a package per
				worktree, nothing else on disk), and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git maintenance start</code
				>
				schedules background housekeeping — worth turning on once a fleet of agents starts churning out
				objects faster than any human team ever did.
			</p>

			<h4
				id="worktrees"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: One Repo, Three Working Directories
			</h4>
			<PlaygroundNote>
				Give Agent A and Agent B a worktree each, run into the branch-exclusivity guard on purpose,
				then clean up with <code>git worktree remove</code>. (The playground simulates the
				bookkeeping — the terminal stays in the main worktree.)
			</PlaygroundNote>
			<LessonActivity title="Worktrees: Parallel Agents" scenarioId="worktrees" id="worktrees" />

			<VibeBox
				prompts={[
					'Create a worktree for branch feature/payments at ../proj-payments and start working there',
					'List all worktrees in this repo, and remove any whose branches are already merged into main'
				]}
			/>
		</div>
	</div>
</section>
