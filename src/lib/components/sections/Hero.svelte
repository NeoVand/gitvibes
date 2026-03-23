<script lang="ts">
	import { GitBranch, Undo2, Users, Monitor, Gamepad2, ScrollText, Download, FolderGit2, HelpCircle } from 'lucide-svelte';

	const cards = [
		{ icon: GitBranch, title: 'Branch & Experiment', desc: 'Create safe sandboxes for AI work', color: 'var(--color-tip)' },
		{ icon: Undo2, title: 'Undo Any Mistake', desc: 'Recover instantly when AI goes wrong', color: 'var(--color-warning)' },
		{ icon: Users, title: 'Collaborate Safely', desc: 'Share AI-generated code professionally', color: 'var(--color-important)' },
		{ icon: Monitor, title: 'VS Code Workflows', desc: 'Step-by-step visual instructions', color: 'var(--color-primary)' }
	];

	let activeTab = $state<'mac' | 'windows' | 'linux'>('mac');
</script>

<section id="hero" class="px-6 py-16">
	<!-- Title block -->
	<div class="mx-auto max-w-2xl text-center mb-16">
		<h1
			class="mb-5 text-4xl leading-[1.15] font-extrabold tracking-tight sm:text-5xl"
			style="color: var(--color-text); letter-spacing: -0.025em;"
		>
			Git for
			<span style="color: var(--color-primary);">Vibe Coders</span>
		</h1>

		<p
			class="mx-auto mb-8 max-w-lg text-[15px] leading-relaxed"
			style="color: var(--color-text-secondary);"
		>
			Version control is your essential safety net — your "save game" system
			that lets you experiment fearlessly, review every AI-generated change,
			and instantly undo any mistake.
		</p>

		<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each cards as card (card.title)}
				<div
					class="flex flex-col items-center gap-2 rounded-lg p-4"
					style="background: var(--color-surface);"
				>
					<card.icon size={18} style="color: {card.color};" strokeWidth={2} />
					<span class="text-[13px] font-semibold" style="color: var(--color-text);">{card.title}</span>
					<span class="text-xs" style="color: var(--color-text-muted);">{card.desc}</span>
				</div>
			{/each}
		</div>

		<div class="space-y-3">
			<div
				class="inline-flex items-start gap-3 rounded-lg px-5 py-4 text-left"
				style="background: var(--color-tip-bg);"
			>
				<Gamepad2 size={18} class="mt-0.5 flex-shrink-0" style="color: var(--color-tip);" />
				<p class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
					<strong style="color: var(--color-text);">Learn by doing:</strong> Before diving in, spend 30 minutes with
					<a
						href="https://learngitbranching.js.org/"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium underline underline-offset-2"
						style="color: var(--color-tip);"
					>Learn Git Branching</a>
					— an interactive, visual tutorial that runs in your browser. The muscle memory will save you hours later.
				</p>
			</div>

			<div
				class="inline-flex items-start gap-3 rounded-lg px-5 py-4 text-left"
				style="background: var(--color-surface);"
			>
				<ScrollText size={18} class="mt-0.5 flex-shrink-0" style="color: var(--color-primary);" />
				<p class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
					<strong style="color: var(--color-text);">Quick reference:</strong> Need a command fast? Hit
					<kbd class="mx-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium" style="background: var(--color-bg-tertiary); color: var(--color-text);">⌘K</kbd>
					to search, or open the
					<strong style="color: var(--color-text);">Git Cheat Sheet</strong>
					from the header for a complete command reference.
				</p>
			</div>
		</div>
	</div>

	<!-- What is Git? -->
	<div id="section-intro-what" class="mx-auto max-w-3xl mb-16">
		<div class="flex items-center gap-2.5 mb-6">
			<HelpCircle size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">What Is Git?</h2>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Git is a <strong style="color: var(--color-text);">version control system</strong> — software that tracks every change you make to your code and lets you travel back in time to any previous version. Think of it like an unlimited undo history for your entire project, not just a single file.
		</p>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			If you're using AI tools like Copilot, Cursor, or Claude to write code, Git becomes even more critical. AI can generate hundreds of lines in seconds — some brilliant, some broken. Without Git, a bad AI suggestion could overwrite your working code with no way back. With Git, you can:
		</p>

		<ul class="mb-4 space-y-2 pl-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			<li class="list-disc"><strong style="color: var(--color-text);">Review</strong> every AI change before it becomes permanent</li>
			<li class="list-disc"><strong style="color: var(--color-text);">Undo</strong> any mistake instantly — whether it's yours or the AI's</li>
			<li class="list-disc"><strong style="color: var(--color-text);">Branch</strong> to experiment in a safe sandbox without risking stable code</li>
			<li class="list-disc"><strong style="color: var(--color-text);">Collaborate</strong> with teammates by sharing code through a structured review process</li>
		</ul>

		<p class="text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Git was created in 2005 by Linus Torvalds (the creator of Linux) and is used by virtually every software team in the world. Learning it is non-negotiable if you want to write code professionally — with or without AI.
		</p>
	</div>

	<!-- Installing Git -->
	<div id="section-intro-install" class="mx-auto max-w-3xl mb-16">
		<div class="flex items-center gap-2.5 mb-6">
			<Download size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">Installing Git</h2>
		</div>

		<p class="mb-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Before anything else, you need Git on your machine. Pick your operating system:
		</p>

		<!-- OS Tabs -->
		<div class="mb-1 flex gap-1 rounded-lg p-1" style="background: var(--color-bg-tertiary);">
			<button
				onclick={() => (activeTab = 'mac')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'mac' ? 'var(--color-text)' : 'var(--color-text-muted)'}; background: {activeTab === 'mac' ? 'var(--color-surface)' : 'transparent'};"
			>
				macOS
			</button>
			<button
				onclick={() => (activeTab = 'windows')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'windows' ? 'var(--color-text)' : 'var(--color-text-muted)'}; background: {activeTab === 'windows' ? 'var(--color-surface)' : 'transparent'};"
			>
				Windows
			</button>
			<button
				onclick={() => (activeTab = 'linux')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'linux' ? 'var(--color-text)' : 'var(--color-text-muted)'}; background: {activeTab === 'linux' ? 'var(--color-surface)' : 'transparent'};"
			>
				Linux
			</button>
		</div>

		<!-- Tab content -->
		<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
			{#if activeTab === 'mac'}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					The easiest way is to install the <strong style="color: var(--color-text);">Xcode Command Line Tools</strong>, which include Git. Open Terminal and run:
				</p>
				<pre class="mb-4 overflow-x-auto rounded-lg p-4 text-sm" style="background: var(--color-terminal-bg); color: var(--color-terminal-text); font-family: var(--font-mono);"><code><span style="color: var(--color-terminal-prompt);">$</span> xcode-select --install</code></pre>
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					A dialog will pop up asking you to install. Click <strong style="color: var(--color-text);">Install</strong> and wait a few minutes.
				</p>
				<p class="text-[14px]" style="color: var(--color-text-secondary);">
					Alternatively, if you use <strong style="color: var(--color-text);">Homebrew</strong>:
				</p>
				<pre class="mt-3 overflow-x-auto rounded-lg p-4 text-sm" style="background: var(--color-terminal-bg); color: var(--color-terminal-text); font-family: var(--font-mono);"><code><span style="color: var(--color-terminal-prompt);">$</span> brew install git</code></pre>

			{:else if activeTab === 'windows'}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Download the official installer from <a href="https://git-scm.com/download/win" target="_blank" rel="noopener noreferrer" class="font-medium underline underline-offset-2" style="color: var(--color-primary);">git-scm.com</a> and run it. The defaults are fine for most users.
				</p>
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Alternatively, if you use <strong style="color: var(--color-text);">winget</strong> (built into Windows 11):
				</p>
				<pre class="mb-4 overflow-x-auto rounded-lg p-4 text-sm" style="background: var(--color-terminal-bg); color: var(--color-terminal-text); font-family: var(--font-mono);"><code><span style="color: var(--color-terminal-prompt);">&gt;</span> winget install --id Git.Git -e --source winget</code></pre>
				<p class="text-[14px]" style="color: var(--color-text-secondary);">
					After installation, restart your terminal (or VS Code) so it picks up the new <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git</code> command.
				</p>

			{:else}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Git is available in every major package manager. Use the one for your distribution:
				</p>
				<pre class="mb-3 overflow-x-auto rounded-lg p-4 text-sm" style="background: var(--color-terminal-bg); color: var(--color-terminal-text); font-family: var(--font-mono);"><code><span style="color: var(--color-text-muted);"># Debian / Ubuntu</span>
<span style="color: var(--color-terminal-prompt);">$</span> sudo apt install git

<span style="color: var(--color-text-muted);"># Fedora</span>
<span style="color: var(--color-terminal-prompt);">$</span> sudo dnf install git

<span style="color: var(--color-text-muted);"># Arch</span>
<span style="color: var(--color-terminal-prompt);">$</span> sudo pacman -S git</code></pre>
			{/if}
		</div>

		<!-- Verify installation -->
		<p class="mt-4 text-[14px]" style="color: var(--color-text-secondary);">
			To confirm Git is installed, open a terminal and run:
		</p>
		<pre class="mt-3 overflow-x-auto rounded-lg p-4 text-sm" style="background: var(--color-terminal-bg); color: var(--color-terminal-text); font-family: var(--font-mono);"><code><span style="color: var(--color-terminal-prompt);">$</span> git --version
<span style="color: var(--color-terminal-output);">git version 2.44.0</span></code></pre>
		<p class="mt-3 text-[13px]" style="color: var(--color-text-muted);">
			If you see a version number, you're ready to go. The exact number doesn't matter much — anything 2.30+ is fine.
		</p>
	</div>

	<!-- What is a Repository? -->
	<div id="section-intro-repo" class="mx-auto max-w-3xl">
		<div class="flex items-center gap-2.5 mb-6">
			<FolderGit2 size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">What Is a Repository?</h2>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			A <strong style="color: var(--color-text);">repository</strong> (or "repo") is simply a project folder that Git is tracking. Inside it, Git maintains a hidden <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">.git</code> folder that stores the entire history of every file — every change, by whom, and when.
		</p>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			There are two kinds of repositories you'll work with:
		</p>

		<div class="mb-4 grid gap-3 sm:grid-cols-2">
			<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
				<p class="mb-1.5 text-[13px] font-semibold" style="color: var(--color-text);">
					Local Repository
				</p>
				<p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
					The copy on your own computer. You make changes, stage them, and commit them here. It's completely private until you decide to share.
				</p>
			</div>
			<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
				<p class="mb-1.5 text-[13px] font-semibold" style="color: var(--color-text);">
					Remote Repository
				</p>
				<p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
					A copy hosted on a service like <strong>GitHub</strong>, <strong>GitLab</strong>, or <strong>Bitbucket</strong>. This is how you share code with teammates and keep a backup in the cloud.
				</p>
			</div>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			The typical workflow is: you <strong style="color: var(--color-text);">clone</strong> (download) a remote repo to your machine, make changes locally, then <strong style="color: var(--color-text);">push</strong> (upload) your changes back. Git keeps both copies in sync.
		</p>

		<p class="text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Every change in Git goes through three stages — your <strong style="color: var(--color-text);">Working Directory</strong> (where you edit files), the <strong style="color: var(--color-text);">Staging Area</strong> (where you prepare a snapshot), and the <strong style="color: var(--color-text);">Repository</strong> (where snapshots are permanently saved as "commits"). Don't worry if this sounds abstract — you'll see each step in action throughout this guide.
		</p>
	</div>
</section>
