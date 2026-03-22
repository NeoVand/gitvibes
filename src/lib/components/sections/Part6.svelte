<script lang="ts">
	import { Monitor, Layout, Clock, Columns } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import VsCodePlaceholder from '../ui/VsCodePlaceholder.svelte';
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
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Changes</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your working directory (<code class="text-xs" style="font-family: var(--font-mono);">git status</code>).
						Modified and untracked files appear here.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Staged Changes</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your staging area. Files you've approved for the next commit.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">Commit Box</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Your <code class="text-xs" style="font-family: var(--font-mono);">git commit -m "..."</code>. Type the message
						and click the checkmark.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-text);">... Menu</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						All advanced commands: Pull, Push, Stash, Commit (Amend), Branch, Revert, and more.
					</p>
				</div>
			</div>

			<VsCodePlaceholder
				description="Screenshot: VS Code Source Control panel showing the full layout -- Changes list at the top, Staged Changes section, commit message input box, and the checkmark Commit button. The '...' overflow menu is visible at the top-right"
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

			<Callout type="tip">
				{#snippet children()}
					The <strong>GitLens</strong> extension is practically essential for professional work. It
					adds "blame" annotations to every single line of code, showing who wrote that line
					and when. Install it from the VS Code Marketplace.
				{/snippet}
			</Callout>

			<VsCodePlaceholder
				description="Screenshot: VS Code with a file open, showing the Timeline pane at the bottom of the Explorer sidebar. Each entry shows a commit hash, message, and timestamp. GitLens blame annotations are visible inline showing author and date for each line"
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
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-note);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Left Pane: "Incoming"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">Your teammate's changes</span>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-tip);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Right Pane: "Current"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">Your local changes</span>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg p-3" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border);">
					<div class="h-3 w-3 rounded-full flex-shrink-0" style="background: var(--color-important);"></div>
					<div>
						<span class="text-[13px] font-medium" style="color: var(--color-text);">Bottom Pane: "Result"</span>
						<span class="ml-2 text-xs" style="color: var(--color-text-muted);">The final merged output</span>
					</div>
				</div>
			</div>

			<VsCodePlaceholder
				description="Screenshot: VS Code 3-way Merge Editor in full view showing the Incoming (left), Current (right), and Result (bottom) panes. Clickable 'Accept Current Change', 'Accept Incoming Change', 'Accept Both Changes' buttons are visible above the conflict markers. The 'Accept Merge' button is shown at the bottom-right"
			/>
		</div>
	</div>
</section>
