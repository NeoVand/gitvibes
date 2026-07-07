<script lang="ts">
	import { RefreshCw, Eye, EyeOff, FolderPlus, Save } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';

	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-2" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={RefreshCw}
			partLabel="Part 2"
			title="The Core Safety Loop: Your &quot;Save Game&quot; for AI Coding"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"Commit early, commit often. Every save point is a universe you can return to."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			This is the heartbeat of your entire Git workflow. Every time the AI generates code, you'll
			follow this three-step rhythm: check what changed, approve what you trust, and freeze it in
			time. Master this loop and you'll never lose work again. We'll close the part with the flip
			side of saving: the files that should never enter history at all.
		</p>

		<MermaidDiagram
			definition={`graph TD
  A(["AI Generates Code"]) --> B(["Status: Review Changes"])
  B --> C{"Approve Changes?"}
  C -->|No| D(["Discard / Modify"])
  D --> A
  C -->|Yes| E(["Stage Changes"])
  E --> F(["Commit: Create Save Point"])
  F --> G(["Push to Remote"])`}
			id="core-loop-overview"
		/>

		<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
			The diagram above shows the full cycle you'll repeat every time you work with AI-generated
			code. This chapter covers the middle of the loop — discarding is Part 4's territory, and
			pushing comes in Part 3. Let's break it down:
		</p>

		<Callout type="important">
			This is your fundamental daily workflow. It's a three-step process: the AI makes a change, you
			review it, and you "save" it. In Git, this loop is <strong
				>Status &rarr; Stage &rarr; Commit</strong
			>. For this to be an effective safety net, commit after every single logical, working change.
		</Callout>

		<!-- 2.1 git status -->
		<div id="section-2-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Eye}
				title="2.1 &quot;What Did the AI Just Do?&quot;"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You just prompted the AI to refactor a module, and it went silent for a moment. What exactly
				did it touch? Before you do anything, you need situational awareness.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-status.webp"
					alt="git status — situational awareness for every change in your working tree"
					caption="Always check your status before staging — know exactly what the AI changed"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You prompted Copilot or Cursor to "refactor this function." It applies
				changes across several files. What exactly did it touch?
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				> is your "heads-up display." The output shows three categories:
			</p>

			<div class="mb-6 grid gap-3 sm:grid-cols-3">
				<div class="rounded-lg p-4" style="background: var(--color-caution-bg);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						"Changes not staged" (Red)
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Files Git tracks that were modified but not yet approved for the next save.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-caution-bg);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						"Untracked files" (Red)
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Brand-new files the AI created that Git has never seen before.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-tip-bg);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-tip);">
						"Changes to be committed" (Green)
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Staged files — reviewed, approved, and going into the next commit. Your goal is moving
						the right files here.
					</p>
				</div>
			</div>

			<CodeBlock
				title="A typical git status, all three sections"
				code={`On branch feature/login
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   src/auth.py

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   src/routes.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        src/session_store.py`}
			/>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The good news? You don't actually need to type <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				>
				in the terminal. VS Code shows you all of this visually. Just click the
				<strong>Source Control icon</strong>
				in the Activity Bar (the branch icon on the left sidebar). The badge shows how many files changed,
				and each file is labeled <strong>M</strong> (modified), <strong>U</strong>
				(untracked), or <strong>D</strong> (deleted):
			</p>

			<VsCodeScreenshot
				src="staging-commits/view-changes.png"
				alt="VS Code Source Control panel showing changed files with status badges"
				caption="The Source Control panel is your visual 'git status' — modified (M), untracked (U), and deleted (D) files are listed with clear badges."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				You can also spot changes right in the editor without opening the Source Control panel. VS
				Code adds colored indicators in the <strong>gutter</strong> (the narrow strip to the left of
				your code): <strong style="color: var(--color-tip);">green</strong> for added lines,
				<strong style="color: var(--color-note);">blue</strong>
				for modified lines, and a <strong style="color: var(--color-caution);">red triangle</strong> for
				deleted lines. Click any indicator to preview the change inline:
			</p>

			<VsCodeScreenshot
				src="staging-commits/gutter-diff-preview.png"
				alt="VS Code editor gutter showing colored indicators for added, modified, and deleted lines"
				caption="Colored gutter indicators let you spot changes at a glance — green (added), blue (modified), and red (deleted). Click to preview."
			/>

			<VibeBox
				prompts={[
					'What files did you just change? Show me a summary',
					'Check git status and explain what each changed file does'
				]}
			/>
		</div>

		<!-- 2.2 Staging -->
		<div id="section-2-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={FolderPlus}
				title="2.2 Reviewing and Staging the AI's Work"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Now you know what changed. The next step is the most important one: reviewing the AI's work
				line by line, and only approving what you trust. This is staging — your quality gate.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-add-p.webp"
					alt="git add -p — interactively stage only the hunks you approve"
					caption="Selective staging lets you approve AI changes hunk by hunk"
				/>
			</div>

			<Callout type="warning">
				<strong>The Problem:</strong>
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				> shows the AI changed five files. Blindly trusting this is how bugs are introduced. You must
				review every line and then "stage" the changes you approve.
			</Callout>

			<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Step Zero: Actually Read the Diff
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				>
				tells you <em>which</em> files changed;
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git diff</code
				>
				shows you <em>what</em> changed inside them — removed lines in red with a
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">-</code
				>, added lines in green with a
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">+</code
				>. It's the terminal twin of the VS Code Diff Editor you'll meet below, and it's the command
				every AI agent runs before staging (Part 6 makes it a rule).
			</p>

			<CodeBlock
				title="The two diffs you'll run constantly"
				code={`git diff            # Unstaged changes: working directory vs staging area
git diff --staged   # Staged changes: what the next commit will contain`}
			/>

			<Callout type="tip">
				Make <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git diff --staged</code
				> your ritual final check: it shows exactly — and only — what's about to be frozen into the commit.
				If a secret or debug print shows up there, you just caught it in time.
			</Callout>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 1: Stage All (the "trusting" add)
			</h4>
			<CodeBlock code="git add ." title="Stage everything" />
			<Callout type="caution">
				This is fast but dangerous. If the AI added a temporary debug file or a flawed change, you
				just approved it without review.
			</Callout>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 2: Stage One File (the "surgical" add)
			</h4>
			<CodeBlock code="git add src/my_file.py" title="Stage specific file" />

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 3: Stage Parts of a File (the "AI-first developer's" add)
			</h4>
			<Callout type="tip">
				This is your single most powerful review tool. The AI made multiple changes in one file, and
				you only want to accept some of them. <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git add --patch</code
				>
				walks you through every individual block of changes ("hunk") interactively. One blind spot: it
				only shows <em>modifications to tracked files</em> — brand-new files the AI created won't
				appear at all. Stage those by name with
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git add &lt;file&gt;</code
				> after reading them.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's how to start an interactive staging session:
			</p>

			<CodeBlock code="git add --patch  # or git add -p" title="Interactive staging" />

			<p class="mt-4 mb-4 text-[13px]" style="color: var(--color-text-secondary);">
				For each hunk, Git asks: <code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">y</code
				>
				(stage),
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">n</code
				>
				(skip),
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">s</code
				>
				(split into smaller pieces),
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">q</code
				>
				(quit). In the <strong>Try It: The Complete Loop</strong> playground (next section),
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add -p</code
				>
				is simplified to file-by-file staging — type
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">y</code
				>
				or
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">n</code
				> on the next line for each file.
			</p>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The VS Code Way: Visual Staging
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				This is where VS Code really shines. Instead of typing cryptic <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">y/n/s/q</code
				>
				responses in the terminal, you get a beautiful side-by-side Diff Editor. To stage an entire file,
				just hover over it and click the <strong>+</strong> button:
			</p>

			<VsCodeScreenshot
				src="staging-commits/stage-changes.png"
				alt="VS Code Source Control showing stage changes button on hover"
				caption="Hover over any file and click + to stage it. The file moves from 'Changes' to 'Staged Changes'."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				When you click a file in the Changes list, VS Code opens the <strong>Diff Editor</strong> -- a
				side-by-side view showing the old version (left) and new version (right). This makes it easy to
				review exactly what changed before staging:
			</p>

			<VsCodeScreenshot
				src="staging-commits/diff-editor.png"
				alt="VS Code Diff Editor showing side-by-side comparison of old and new file versions"
				caption="The Diff Editor shows your changes side-by-side: red highlights deletions, green highlights additions. Review before you stage."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				For even more precision, click a file to open the Diff Editor, then select specific lines
				and right-click → <strong>"Stage Selected Ranges"</strong>. This is the visual equivalent of
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add -p</code
				>, but far easier to use:
			</p>

			<VsCodeScreenshot
				src="staging-commits/stage-specific-lines.png"
				alt="VS Code Diff Editor showing stage selected ranges option"
				caption="In the Diff Editor, select specific lines and use the gutter to stage just those changes -- even more precise than git add -p."
			/>

			<VibeBox
				prompts={[
					'Stage only the files related to the authentication feature',
					'Show me the diff of each changed file one at a time so I can decide what to stage'
				]}
			/>

			<Callout type="warning">
				<strong
					>Accidentally staged everything with <code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
					>?</strong
				>
				Use
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git restore --staged &lt;file&gt;</code
				>
				to unstage specific files before committing. This is especially critical if you accidentally staged
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.env</code
				>
				files with secrets or debug files. You'll practice exactly this in the
				<strong>"Unstage Secrets"</strong> playground in section 4.2 (or right now — open the playground
				from the header and pick the scenario).
			</Callout>
		</div>

		<!-- 2.3 Committing -->
		<div id="section-2-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={Save}
				title="2.3 Creating the Save Point"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You've reviewed the changes and staged the ones you trust. Now it's time to freeze this
				moment in time — a commit is your permanent save point that you can always travel back to.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-commit.webp"
					alt="git commit — each save point frozen as a checkpoint on the timeline"
					caption="Each commit is a checkpoint you can always travel back to"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You've staged your reviewed changes. Now, bundle them into an
				immutable "save point" -- a <strong>commit</strong>. (Immutable, not untouchable: Part 4
				teaches the history-editing tools. What's written can be rewritten — but never silently
				changed in place.)
			</Callout>

			<CodeBlock
				title="Create a commit with a message"
				code="git commit -m &quot;feat: add user authentication endpoint&quot;"
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The command itself is simple, but the message you write matters more than you might think.
			</p>

			<Callout type="important">
				<strong>Writing Good Commit Messages:</strong> Your code shows <em>how</em> a change was
				made; your commit message must explain the <em>why</em>. Use
				<strong>Conventional Commits</strong> format:
			</Callout>

			<div class="my-4 overflow-hidden rounded-lg" style="background: var(--color-bg-secondary);">
				<table class="w-full text-[13px]">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);"
								>Type</th
							>
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);"
								>When to Use</th
							>
							<th class="px-4 py-2 text-left font-semibold" style="color: var(--color-text);"
								>Example</th
							>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-branch-feature);"
									>feat:</code
								></td
							>
							<td class="px-4 py-2">A new feature for the user</td>
							<td class="px-4 py-2 text-xs">feat: add login button to homepage</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-caution);"
									>fix:</code
								></td
							>
							<td class="px-4 py-2">A bug fix for the user</td>
							<td class="px-4 py-2 text-xs">fix: resolve dimension mismatch</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-note);"
									>docs:</code
								></td
							>
							<td class="px-4 py-2">Documentation only changes</td>
							<td class="px-4 py-2 text-xs">docs: update API reference</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-vibe-text);"
									>style:</code
								></td
							>
							<td class="px-4 py-2">Formatting, missing semicolons, etc.</td>
							<td class="px-4 py-2 text-xs">style: fix indentation in utils</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-warning);"
									>refactor:</code
								></td
							>
							<td class="px-4 py-2">Code change that neither fixes a bug nor adds a feature</td>
							<td class="px-4 py-2 text-xs">refactor: simplify form validation</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-tip);"
									>test:</code
								></td
							>
							<td class="px-4 py-2">Adding or correcting tests</td>
							<td class="px-4 py-2 text-xs">test: add unit tests for auth</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-branch-release);"
									>chore:</code
								></td
							>
							<td class="px-4 py-2">Build process or tools changes</td>
							<td class="px-4 py-2 text-xs">chore: update dependencies</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-4 py-2"
								><code class="commit-type-badge" style="--badge-color: var(--color-primary);"
									>perf:</code
								></td
							>
							<td class="px-4 py-2">A code change that improves performance</td>
							<td class="px-4 py-2 text-xs">perf: cache database queries</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Where the "Why" Actually Goes: the Body
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The subject line above says <em>what</em> changed. The "why" lives in the commit
				<strong>body</strong> — a blank line after the subject, then as many lines of context as the
				change deserves. Run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				>
				with <em>no</em>
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">-m</code
				>
				and Git opens your editor (VS Code, if you set
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">core.editor</code
				> in Part 1) for exactly this:
			</p>

			<CodeBlock
				title="A commit message with a body"
				code={`fix(auth): reject expired tokens before the DB lookup

The AI's first fix checked expiry after loading the user, which
let expired tokens trigger a full query. Checking first avoids
the load and matches how the session middleware already behaves.`}
			/>

			<p class="mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				Save and close the editor tab, and the commit completes. (Changed your mind? Close it with
				an
				<em>empty</em> message and Git aborts the commit.)
			</p>

			<Callout type="tip">
				<strong>AI Integration:</strong> GitHub Copilot and Cursor can analyze your staged changes
				and suggest a commit message. Always verify it follows your team's standards — and remember
				the bar: six months from now, does this message explain <em>why</em>?
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				One last habit: prove to yourself the save point exists. Right after committing, run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git log --oneline -1</code
				>
				— one line, your hash and message. (That's also the final step Part 6 teaches agents: commit,
				then report the hash.)
			</p>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, committing is just as simple: type your message in the input box at the top of
				the Source Control panel and click the <strong>Commit</strong> button (or press
				<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Cmd+Enter</kbd
				>
				/
				<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Ctrl+Enter</kbd
				>). Notice the <strong>sparkle icon</strong> next to the input -- click it to let AI generate
				a commit message from your staged changes:
			</p>

			<VsCodeScreenshot
				src="overview/overview.png"
				alt="VS Code Source Control panel showing staged changes, commit message box, and commit button"
				caption="The full Source Control view: your staged changes, the commit message input, and the Commit button. Click the sparkle icon to auto-generate a message."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's the AI commit message feature in action. After staging your changes, click the
				sparkle icon and Copilot will analyze your diff and write a descriptive message for you:
			</p>

			<VsCodeScreenshot
				src="staging-commits/generate-commit-message.png"
				alt="VS Code showing AI-generated commit message from staged changes"
				caption="Click the sparkle icon and AI generates a commit message based on your staged changes. Always review it before committing!"
			/>

			<h4
				id="core-loop"
				class="mt-8 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: The Complete Loop
			</h4>
			<PlaygroundNote>
				Run real Git commands in your browser. Type <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">help</code
				> in the terminal for the full command list.
			</PlaygroundNote>
			<LessonActivity title="The Core Safety Loop" scenarioId="core-loop" id="core-loop" />

			<VibeBox
				prompts={[
					'Commit the staged changes with a good conventional commit message',
					'Write a descriptive commit message for these changes and commit them'
				]}
			/>
		</div>
		<!-- 2.4 .gitignore -->
		<div id="section-2-4" class="mb-8">
			<SectionHeader
				level="section"
				icon={EyeOff}
				title="2.4 What NOT to Commit (.gitignore)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You asked the AI to scaffold your project, and it delivered: dependencies installed, an
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.env</code
				>
				file holding your API keys, and a working app. Then it helpfully runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				>
				— and now your secrets, your
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>node_modules</code
				>
				folder, and a stray
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.DS_Store</code
				> are all staged for your next commit. You just learned how permanent a commit is — before you
				freeze that mistake into history, you need to teach Git what to ignore.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/gitignore.webp"
					alt=".gitignore — a gatekeeper filtering secrets and junk files out of the repository"
					caption="A .gitignore file is the guardrail that makes 'git add .' safe — secrets and junk never enter history"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> AI agents move fast and stage everything. Without a guardrail,
				one
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				> can commit API keys, gigabytes of dependencies, and OS junk into a history that everyone on
				your team will clone.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				A <strong style="color: var(--color-text);">.gitignore</strong> file is a plain text file at
				the root of your repository that lists patterns of files Git should pretend don't exist.
				Ignored files never show up as "untracked" in
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				>, and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				> silently skips them. The file itself gets committed, so the whole team — and every AI agent
				working in the repo — shares the same guardrail.
			</p>

			<CodeBlock
				title=".gitignore — a realistic starter for a JS/Python project"
				lang="gitignore"
				code={`# Dependencies
node_modules/
.venv/
__pycache__/
*.pyc

# Secrets & local config
.env
.env.*
!.env.example

# Build output
dist/
build/
coverage/

# Logs & caches
*.log
.cache/

# AI tool local state (personal settings stay personal)
.claude/settings.local.json
CLAUDE.local.md
.cursor/
.aider*`}
			/>

			<p class="mt-3 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				(Purely personal noise like <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.DS_Store</code
				>
				or
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.idea/</code
				>
				belongs in your <em>global</em> ignore file instead — see the end of this section. And while a
				repo's main .gitignore lives at the root, you can drop extra ones in any subfolder to scope rules
				to just that corner of the project.)
			</p>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Pattern Syntax Essentials
			</h4>

			<ul
				class="mb-5 list-inside list-disc space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">*.log</code
					>
					— a glob: matches any file ending in <strong>.log</strong>, in any directory
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">dist/</code
					> — a trailing slash matches only directories (and everything inside them)
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>/config.json</code
					> — a leading slash anchors the pattern to the repository root
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>docs/**/*.tmp</code
					>
					—
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">**</code
					> matches any depth of nested directories
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>!.env.example</code
					>
					— a leading
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">!</code
					> negates a pattern, re-including a file an earlier rule excluded (it can't re-include anything
					inside an excluded directory, though)
				</li>
			</ul>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The Gotcha: Already-Tracked Files Stay Tracked
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">.gitignore only affects untracked files.</strong>
				If a file was already committed before you added it to .gitignore, Git keeps tracking it — and
				keeps committing your changes to it. To stop tracking a file without deleting it from your disk,
				remove it from the staging area (which Git's own messages call the <em>index</em> — same thing,
				older name):
			</p>

			<CodeBlock
				title="Untrack a file that's already committed"
				code={`git rm --cached .env
# For a whole directory:
git rm -r --cached node_modules

# Then commit the removal
git commit -m "chore: stop tracking ignored files"`}
			/>

			<Callout type="warning">
				<strong>If a secret was ever committed, removing it in a new commit is not enough.</strong>
				The key still exists in every older commit, and anyone who clones the repository can read it.
				Treat a pushed secret as compromised: <strong>rotate the credential immediately</strong>
				(revoke the key and issue a new one), then scrub it from history with a rewriting tool like
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git filter-repo</code
				> — specialized surgery beyond this guide, but worth knowing the name. Rotation comes first; no
				amount of history surgery un-leaks a key that's already been seen.
			</Callout>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				A Global Ignore File for OS and Editor Junk
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Files like <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.DS_Store</code
				>
				(macOS) or
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">Thumbs.db</code
				>
				(Windows) are about <em>your machine</em>, not the project. Instead of asking every
				repository to ignore them, configure a
				<strong style="color: var(--color-text);">global ignore file</strong> that applies to all your
				repositories:
			</p>

			<CodeBlock
				title="Set up a global ignore file (once per machine)"
				code={`git config --global core.excludesFile ~/.gitignore_global

echo ".DS_Store" >> ~/.gitignore_global
echo "Thumbs.db" >> ~/.gitignore_global`}
			/>

			<Callout type="tip">
				Rule of thumb: project artifacts (builds, dependencies, secrets) go in the repository's <strong
					>.gitignore</strong
				> so the whole team is protected; personal noise (your OS, your editor) goes in your global ignore
				file.
			</Callout>

			<VibeBox
				prompts={[
					'Write a .gitignore for this project — look at my stack and include editor and OS artifacts',
					"Check my repo for tracked files that look like secrets or build artifacts that shouldn't be committed"
				]}
			/>
		</div>
	</div>
</section>

<style>
	.commit-type-badge {
		display: inline-block;
		border-radius: 0.25rem;
		padding: 0.0625rem 0.375rem;
		font-size: 0.75rem;
		font-family: var(--font-mono);
		font-weight: 500;
		color: var(--badge-color);
		background: color-mix(in srgb, var(--badge-color) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--badge-color) 25%, transparent);
	}
</style>
