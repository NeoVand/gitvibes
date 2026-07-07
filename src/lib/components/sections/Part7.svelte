<script lang="ts">
	import { Monitor, Layout, Clock, Columns } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-7" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Monitor}
			partLabel="Part 7"
			title="Your AI-Assisted Cockpit: Mastering Git in VS Code"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"The best tools disappear into your workflow. VS Code makes Git visual, intuitive, and fast."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			Everything you've learned so far in the terminal works beautifully from VS Code's built-in Git
			UI. Staging, committing, branching, merging, resolving conflicts — all with rich visual
			feedback and just a few clicks. Let's explore the cockpit.
		</p>

		<MermaidDiagram
			definition={`graph TD
  A(["VS Code Git Integration"]) --> B(["Source Control View"])
  A --> C(["Timeline & GitLens"])
  A --> D(["3-Way Merge Editor"])
  A --> E(["Command Palette"])
  B --> F(["Status, Stage, Commit"])
  C --> G(["File History & Blame"])
  D --> H(["Conflict Resolution"])
  E --> I(["All Git Commands"])`}
			id="vscode-overview"
		/>

		<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
			VS Code bundles a rich set of Git tools right into the editor, so you can do almost everything
			without opening a terminal.
		</p>

		<Callout type="note">
			While the command line is powerful, the VS Code UI is your "cockpit." It provides rich, visual
			feedback that makes abstract Git concepts concrete.
		</Callout>

		<!-- 7.1 Source Control View -->
		<div id="section-7-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Layout}
				title="7.1 The Source Control View"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				This single panel replaces a dozen terminal commands. Status, staging, committing, branching
				— it's all here in one visual interface that makes Git feel approachable.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/source-control.webp"
					alt="Source Control view — Changes, Staged Changes, commit box, and the branch graph in VS Code"
					caption="VS Code's Source Control panel — your visual command center for Git"
				/>
			</div>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				Everything you've learned maps directly to the UI:
			</p>

			<div class="mb-6 grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Changes</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your working directory (<code class="text-xs" style="font-family: var(--font-mono);"
							>git status</code
						>). Modified and untracked files appear here.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">
						Staged Changes
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your staging area. Files you've approved for the next commit.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Commit Box</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your <code class="text-xs" style="font-family: var(--font-mono);"
							>git commit -m "..."</code
						>. Type the message and click the checkmark.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">... Menu</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						All advanced commands, tucked into submenus: Pull, Push, Stash, Branch, and Commit
						(where Amend and Undo Last Commit live).
					</p>
				</div>
			</div>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's what it looks like in action. Press <kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Ctrl+Shift+G</kbd
				>
				to open the Source Control panel from anywhere — and yes, it's
				<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Ctrl</kbd
				> even on a Mac (⌘⇧G is taken by search):
			</p>

			<VsCodeScreenshot
				src="overview/overview.png"
				alt="VS Code Source Control panel showing the full layout with Changes, Staged Changes, commit message input, and Graph"
				caption="Your command center: the Source Control panel shows everything at a glance -- changed files, staged files, commit input, and the branch graph."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Below the commit area, you'll find the <strong>Source Control Graph</strong> -- a visual representation
				of your commit history and branch structure. This is incredibly helpful for understanding how
				branches relate to each other:
			</p>

			<VsCodeScreenshot
				src="staging-commits/source-control-graph.png"
				alt="VS Code Source Control Graph showing commit history with branches"
				caption="The Source Control Graph visualizes your commit history and branch structure -- a powerful way to understand how branches relate."
			/>

			<VibeBox
				prompts={[
					'Show me how to stage and commit changes using the VS Code Source Control panel',
					'Walk me through the VS Code Git workflow without using the terminal'
				]}
			/>
		</div>

		<!-- 7.2 Timeline & GitLens -->
		<div id="section-7-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={Clock}
				title="7.2 The Timeline View & GitLens"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				When you're staring at a line of code and wondering "who changed this, and why?" — VS Code
				has the answer built right in. Timeline and GitLens turn your editor into a time machine.
			</p>

			<Callout type="note">
				<strong>The Problem:</strong> An AI changed a line of code, and you have no idea why or when.
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				Open any file, then look in the Explorer panel for the <strong>"Timeline"</strong> pane at
				the bottom. This shows the complete commit history for that specific file. Click any commit
				to see a diff of what it changed. The Timeline also mixes in <strong>Local History</strong> snapshots
				of your saves — and those entries have a right-click → "Restore Contents" that can rescue even
				changes you never committed.
			</p>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's the Timeline in action. Each entry represents a commit that touched this file --
				click any entry to see exactly what changed in that commit:
			</p>

			<VsCodeScreenshot
				src="overview/timeline-view.png"
				alt="VS Code Timeline view in the Explorer sidebar showing file history"
				caption="The Timeline view (in the Explorer panel) shows the complete commit history for any file. Click any entry to see the diff."
			/>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code also has <strong>built-in Git Blame</strong>. Put your cursor on any line of code
				and the status bar shows who last changed it and when (an always-on inline annotation is one
				setting away — search Settings for "blame"). The <strong>GitLens</strong> extension goes deeper
				— rich line history, comparisons across branches and commits — though many of its advanced features
				now sit behind a paid Pro plan. Start with the built-ins; add GitLens when you hit their ceiling:
			</p>

			<VsCodeScreenshot
				src="overview/git-blame-status-bar.png"
				alt="VS Code showing Git blame information in the status bar"
				caption="Built-in Git blame shows the author and commit message for the current line right in the status bar."
			/>

			<VibeBox
				prompts={[
					'Show me the history of changes to this file — who changed what and when',
					'Who last modified this function and what was the commit message?'
				]}
			/>
		</div>

		<!-- 7.3 3-Way Merge Editor -->
		<div id="section-7-3" class="mb-8">
			<SectionHeader
				level="section"
				icon={Columns}
				title="7.3 The 3-Way Merge Editor"
				color="var(--color-primary)"
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				We touched on merge conflicts earlier -- now let's look at the tool that makes resolving
				them almost enjoyable.
			</p>

			<Callout type="important">
				This tool transforms merge conflicts from a terrifying, marker-filled text-editing nightmare
				into a visual, point-and-click process. This alone is a reason to use VS Code for Git
				integration.
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				When a conflict occurs, VS Code highlights the conflicting files in the Source Control view.
				Clicking one opens it with the inline conflict markers you know from section 5.3 — look for
				the <strong>"Resolve in Merge Editor"</strong> button in the corner to switch to the 3-way view
				with three panes:
			</p>

			<div class="mb-6 space-y-2">
				<div
					class="flex items-center gap-3 rounded-lg p-3"
					style="background: var(--color-bg-secondary);"
				>
					<div
						class="h-3 w-3 flex-shrink-0 rounded-full"
						style="background: var(--color-note);"
					></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);"
							>Left Pane: "Incoming"</span
						>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);"
							>Your teammate's changes</span
						>
					</div>
				</div>
				<div
					class="flex items-center gap-3 rounded-lg p-3"
					style="background: var(--color-bg-secondary);"
				>
					<div
						class="h-3 w-3 flex-shrink-0 rounded-full"
						style="background: var(--color-tip);"
					></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);"
							>Right Pane: "Current"</span
						>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);"
							>Your local changes</span
						>
					</div>
				</div>
				<div
					class="flex items-center gap-3 rounded-lg p-3"
					style="background: var(--color-bg-secondary);"
				>
					<div
						class="h-3 w-3 flex-shrink-0 rounded-full"
						style="background: var(--color-important);"
					></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);"
							>Bottom Pane: "Result"</span
						>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);"
							>The final merged output</span
						>
					</div>
				</div>
			</div>

			<Callout type="warning">
				One trap to know: those labels describe a <em>merge</em>. During a <strong>rebase</strong>,
				they swap — "Current" is the branch you're rebasing onto, and "Incoming" is your own
				replayed commit (the same side-flip explained in section 5.5). Read the code, not just the
				labels.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's the merge editor in action. Use the checkboxes next to each change to select which
				version you want to keep -- or manually edit the Result pane at the bottom for a custom
				resolution:
			</p>

			<VsCodeScreenshot
				src="overview/merge-editor-overview.png"
				alt="VS Code 3-way Merge Editor showing Incoming, Current, and Result panes"
				caption="The 3-way Merge Editor transforms scary merge conflicts into a visual, point-and-click experience. Use the checkboxes to select changes."
			/>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				And if you have GitHub Copilot installed, there's an even easier option. VS Code can use AI
				to analyze both sides of a conflict and suggest an intelligent resolution. Look for the <strong
					>"Resolve with AI"</strong
				> option in the merge editor:
			</p>

			<VsCodeScreenshot
				src="overview/ai-merge-conflict-resolution.png"
				alt="VS Code AI-powered merge conflict resolution with GitHub Copilot"
				caption="GitHub Copilot can analyze conflicting changes and suggest an intelligent resolution -- the future of merge conflict handling."
			/>

			<VibeBox
				prompts={[
					'I have a merge conflict — open the VS Code merge editor and help me resolve it',
					'Accept the incoming changes for all conflicts in this file'
				]}
			/>
		</div>
	</div>
</section>
