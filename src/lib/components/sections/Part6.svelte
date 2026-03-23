<script lang="ts">
	import { Monitor, Layout, Clock, Columns } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
</script>

<section id="part-6" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={Monitor}
			partLabel="Part 6"
			title="Your AI-Assisted Cockpit: Mastering Git in VS Code"
			color="var(--color-note)"
		/>

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

		<Callout type="note">
			{#snippet children()}
				While the command line is powerful, the VS Code UI is your "cockpit." It provides rich,
				visual feedback that makes abstract Git concepts concrete.
			{/snippet}
		</Callout>

		<!-- 6.1 Source Control View -->
		<div id="section-6-1" class="mb-14">
			<SectionHeader level="section" icon={Layout} title="6.1 The Source Control View" color="var(--color-note)" />

			<p class="mb-4" style="color: var(--color-text-secondary);">
				This is your command center. Everything you've learned maps directly to the UI:
			</p>

			<div class="mb-6 grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Changes</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your working directory (<code class="text-xs" style="font-family: var(--font-mono);">git status</code>).
						Modified and untracked files appear here.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Staged Changes</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your staging area. Files you've approved for the next commit.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Commit Box</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your <code class="text-xs" style="font-family: var(--font-mono);">git commit -m "..."</code>. Type the message
						and click the checkmark.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">... Menu</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						All advanced commands: Pull, Push, Stash, Commit (Amend), Branch, Revert, and more.
					</p>
				</div>
			</div>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's what it looks like in action. Press <kbd class="rounded border px-1 py-0.5 text-[11px]" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Ctrl+Shift+G</kbd> (or <kbd class="rounded border px-1 py-0.5 text-[11px]" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Cmd+Shift+G</kbd> on Mac) to open the Source Control panel from anywhere:
			</p>

			<VsCodeScreenshot
				src="overview/overview.png"
				alt="VS Code Source Control panel showing the full layout with Changes, Staged Changes, commit message input, and Graph"
				caption="Your command center: the Source Control panel shows everything at a glance -- changed files, staged files, commit input, and the branch graph."
			/>

			<p class="mb-3 mt-4 text-[14px]" style="color: var(--color-text-secondary);">
				Below the commit area, you'll find the <strong>Source Control Graph</strong> -- a visual representation of your commit history and branch structure. This is incredibly helpful for understanding how branches relate to each other:
			</p>

			<VsCodeScreenshot
				src="staging-commits/source-control-graph.png"
				alt="VS Code Source Control Graph showing commit history with branches"
				caption="The Source Control Graph visualizes your commit history and branch structure -- a powerful way to understand how branches relate."
			/>
		</div>

		<!-- 6.2 Timeline & GitLens -->
		<div id="section-6-2" class="mb-14">
			<SectionHeader level="section" icon={Clock} title="6.2 The Timeline View & GitLens" color="var(--color-note)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> An AI changed a line of code, and you have no idea why or when.
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				Open any file, then look in the Explorer panel for the <strong>"Timeline"</strong> pane
				at the bottom. This shows the complete commit history for that specific file. Click
				any commit to see a diff, or right-click and select "Restore."
			</p>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's the Timeline in action. Each entry represents a commit that touched this file -- click any entry to see exactly what changed in that commit:
			</p>

			<VsCodeScreenshot
				src="overview/timeline-view.png"
				alt="VS Code Timeline view in the Explorer sidebar showing file history"
				caption="The Timeline view (in the Explorer panel) shows the complete commit history for any file. Click any entry to see the diff."
			/>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code also has <strong>built-in Git Blame</strong>. Hover over any line of code and you'll see who changed it and when, right in the status bar. For even richer inline annotations on every single line, install the <strong>GitLens</strong> extension from the VS Code Marketplace -- it's practically essential for professional work:
			</p>

			<VsCodeScreenshot
				src="overview/git-blame-status-bar.png"
				alt="VS Code showing Git blame information in the status bar"
				caption="Built-in Git blame shows the author and commit message for the current line right in the status bar."
			/>
		</div>

		<!-- 6.3 3-Way Merge Editor -->
		<div id="section-6-3" class="mb-8">
			<SectionHeader level="section" icon={Columns} title="6.3 The 3-Way Merge Editor" color="var(--color-note)" />

			<Callout type="important">
				{#snippet children()}
					This tool transforms merge conflicts from a terrifying, marker-filled text-editing
					nightmare into a visual, point-and-click process. This alone is a reason to use
					VS Code for Git integration.
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				When a conflict occurs, VS Code highlights the conflicting files. Clicking one opens
				the 3-way editor with three panes:
			</p>

			<div class="mb-6 space-y-2">
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-note);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Left Pane: "Incoming"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">Your teammate's changes</span>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-tip);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Right Pane: "Current"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">Your local changes</span>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-important);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Bottom Pane: "Result"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">The final merged output</span>
					</div>
				</div>
			</div>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's the merge editor in action. Use the checkboxes next to each change to select which version you want to keep -- or manually edit the Result pane at the bottom for a custom resolution:
			</p>

			<VsCodeScreenshot
				src="overview/merge-editor-overview.png"
				alt="VS Code 3-way Merge Editor showing Incoming, Current, and Result panes"
				caption="The 3-way Merge Editor transforms scary merge conflicts into a visual, point-and-click experience. Use the checkboxes to select changes."
			/>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				And if you have GitHub Copilot installed, there's an even easier option. VS Code can use AI to analyze both sides of a conflict and suggest an intelligent resolution. Look for the <strong>"Resolve with AI"</strong> option in the merge editor:
			</p>

			<VsCodeScreenshot
				src="overview/ai-merge-conflict-resolution.png"
				alt="VS Code AI-powered merge conflict resolution with GitHub Copilot"
				caption="GitHub Copilot can analyze conflicting changes and suggest an intelligent resolution -- the future of merge conflict handling."
			/>
		</div>
	</div>
</section>
