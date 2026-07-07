<script lang="ts">
	import { Gamepad2, ScrollText, Download, FolderGit2, HelpCircle, History } from 'lucide-svelte';
	import { base } from '$app/paths';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import Callout from '../ui/Callout.svelte';

	let {
		onOpenPlayground
	}: {
		onOpenPlayground?: () => void;
	} = $props();

	let activeTab = $state<'mac' | 'windows' | 'linux'>('mac');

	const gitTimeline = [
		{
			year: '2002',
			text: 'The Linux kernel adopts BitKeeper, a proprietary version control tool, to coordinate thousands of contributors.'
		},
		{
			year: 'Apr 2005',
			text: 'BitKeeper withdraws its free license. Linus Torvalds pauses kernel work and starts writing Git — within four days it is tracking its own source code.'
		},
		{
			year: 'Jun 2005',
			text: 'Git manages its first Linux kernel release (2.6.12), two months after the first line of code.'
		},
		{
			year: 'Jul 2005',
			text: 'Linus hands maintenance to Junio Hamano, who still leads Git development today.'
		},
		{
			year: '2008',
			text: 'GitHub launches, and Git rapidly becomes the default way the world shares code.'
		},
		{
			year: 'Today',
			text: 'Over 90% of developers use Git — and every AI coding tool assumes it is there.'
		}
	];
</script>

<section id="hero" class="px-6 py-16">
	<h1 class="sr-only">Git for Vibe Coders</h1>

	<!-- Hero image -->
	<div class="mx-auto mb-12 max-w-4xl">
		<ExpandableImage
			src="{base}/images/Hero.webp"
			alt="Git for Vibe Coders — your safety net for AI-assisted coding"
			class="w-full rounded-xl shadow-2xl"
			loading="eager"
		/>
	</div>

	<!-- Quick links -->
	<div class="mx-auto mb-16 max-w-4xl">
		<div class="space-y-3">
			<div
				class="inline-flex items-start gap-3 rounded-lg px-5 py-4 text-left"
				style="background: var(--color-important-bg);"
			>
				<Gamepad2 size={18} class="mt-0.5 flex-shrink-0" style="color: var(--color-important);" />
				<p class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
					<strong style="color: var(--color-text);">Try it now:</strong> Open the
					<button
						type="button"
						onclick={onOpenPlayground}
						class="cursor-pointer font-medium underline underline-offset-2"
						style="color: var(--color-important);">Git Playground</button
					>
					— run real Git commands in your browser with live commit graphs. No install required.
				</p>
			</div>

			<div
				class="inline-flex items-start gap-3 rounded-lg px-5 py-4 text-left"
				style="background: var(--color-surface);"
			>
				<ScrollText size={18} class="mt-0.5 flex-shrink-0" style="color: var(--color-primary);" />
				<p class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
					<strong style="color: var(--color-text);">Quick reference:</strong> Need a command fast?
					Hit
					<kbd
						class="mx-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium"
						style="background: var(--color-bg-tertiary); color: var(--color-text);">⌘K</kbd
					>
					/
					<kbd
						class="mx-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium"
						style="background: var(--color-bg-tertiary); color: var(--color-text);">Ctrl+K</kbd
					>
					to search, or open the
					<strong style="color: var(--color-text);">Git Cheat Sheet</strong>
					from the header for a complete command reference.
				</p>
			</div>
		</div>
	</div>

	<!-- What is Git? -->
	<div id="section-intro-what" class="mx-auto mb-16 max-w-4xl">
		<div class="mb-6 flex items-center gap-2.5">
			<HelpCircle size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">What Is Git?</h2>
		</div>

		<div class="my-6">
			<ExpandableImage
				src="{base}/images/what-is-git.webp"
				alt="What Is Git? — version control as unlimited undo for your whole project"
				caption="Branch the risky experiments, contain the failures, merge the wins — every save becomes a recoverable moment"
			/>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Git is a <strong style="color: var(--color-text);">version control system</strong> — software that
			tracks every change you make to your code and lets you travel back in time to any previous version.
			Think of it like an unlimited undo history for your entire project, not just a single file.
		</p>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			If you're using AI tools like Copilot, Cursor, or Claude to write code, Git becomes even more
			critical. AI can generate hundreds of lines in seconds — some brilliant, some broken. Without
			Git, a bad AI suggestion could overwrite your working code with no way back. With Git, you
			can:
		</p>

		<ul
			class="mb-4 space-y-2 pl-5 text-[14px] leading-relaxed"
			style="color: var(--color-text-secondary);"
		>
			<li class="list-disc">
				<strong style="color: var(--color-text);">Review</strong> every AI change before it becomes permanent
			</li>
			<li class="list-disc">
				<strong style="color: var(--color-text);">Undo</strong> any mistake instantly — whether it's yours
				or the AI's
			</li>
			<li class="list-disc">
				<strong style="color: var(--color-text);">Branch</strong> to experiment in a safe playground without
				risking stable code
			</li>
			<li class="list-disc">
				<strong style="color: var(--color-text);">Collaborate</strong> with teammates by sharing code
				through a structured review process
			</li>
		</ul>

		<p class="text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Git is used by virtually every software team in the world. Learning it is non-negotiable if
			you want to write code professionally — with or without AI. But where did it come from? The
			story is worth two minutes of your time.
		</p>
	</div>

	<!-- A Brief History of Git -->
	<div id="section-intro-history" class="mx-auto mb-16 max-w-4xl">
		<div class="mb-6 flex items-center gap-2.5">
			<History size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">A Brief History of Git</h2>
		</div>

		<div class="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
			<div class="min-w-0 flex-1">
				<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
					Git was born out of a crisis. In the early 2000s the Linux kernel — one of the largest
					collaborative software projects on Earth — was managed with a proprietary tool called <strong
						style="color: var(--color-text);">BitKeeper</strong
					>. In April 2005 its owner withdrew the kernel community's free license, and overnight
					thousands of contributors had no version control at all.
				</p>
				<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
					<strong style="color: var(--color-text);">Linus Torvalds</strong>, who had created Linux
					14 years earlier, looked at the alternatives and found them all too slow or too
					centralized. So he stopped kernel work and wrote his own. Development began on April 3,
					2005 — and by April 7, Git was already managing its own source code. Two months later it
					shipped an entire kernel release. A tool sketched out in about ten days now runs the
					world's software.
				</p>
				<p class="text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
					That speed wasn't luck. Git was designed around three ideas that still define it: it had
					to be <strong style="color: var(--color-text);">fast</strong> (applying hundreds of
					patches in seconds), <strong style="color: var(--color-text);">distributed</strong> (every
					developer holds a complete copy of the history — no central server required), and
					<strong style="color: var(--color-text);">tamper-evident</strong> (every commit is checksummed,
					so history can never change silently).
				</p>
			</div>
			<div class="mx-auto w-48 flex-shrink-0 sm:mx-0 sm:w-52">
				<ExpandableImage
					src="{base}/images/linus-torvalds.jpg"
					alt="Linus Torvalds, creator of Linux and Git, speaking at LinuxCon Europe 2014"
					caption="Linus Torvalds, creator of Linux and Git. Photo: Krd / Wikimedia Commons, CC BY-SA 4.0"
					width={720}
					height={1080}
				/>
			</div>
		</div>

		<div class="mb-5 rounded-lg p-5" style="background: var(--color-bg-secondary);">
			{#each gitTimeline as entry (entry.year)}
				<div class="flex gap-4 py-2">
					<span
						class="w-20 flex-shrink-0 text-right text-[12px] font-semibold"
						style="color: var(--color-primary-text); font-family: var(--font-mono);"
					>
						{entry.year}
					</span>
					<span
						class="border-l pl-4 text-[13px] leading-relaxed"
						style="border-color: var(--color-border); color: var(--color-text-secondary);"
					>
						{entry.text}
					</span>
				</div>
			{/each}
		</div>

		<Callout type="note" title="Why 'Git'?">
			In British slang, a <em>git</em> is an unpleasant person. Linus joked:
			<em
				>"I'm an egotistical bastard, and I name all my projects after myself. First Linux, now
				Git."</em
			> The manual page keeps the joke going — it describes Git as "the stupid content tracker."
		</Callout>

		<p class="text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Why does this history matter to you? Because Git was built to let thousands of strangers
			change the same codebase at once without destroying each other's work. That is <em>exactly</em
			> the problem you face when an AI assistant generates code at machine speed — Git is the safety
			net that was already waiting for the AI era.
		</p>
	</div>

	<!-- Installing Git -->
	<div id="section-intro-install" class="mx-auto mb-16 max-w-4xl">
		<div class="mb-6 flex items-center gap-2.5">
			<Download size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">Installing Git</h2>
		</div>

		<div class="mb-6">
			<ExpandableImage
				src="{base}/images/install-git.webp"
				alt="Installing Git — a craftsman's tool ready to be lifted from its case"
				caption="One install — then every project on your machine gets a safety net"
			/>
		</div>

		<p class="mb-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Before anything else, you need Git on your machine. Pick your operating system:
		</p>

		<!-- OS Tabs -->
		<div class="mb-1 flex gap-1 rounded-lg p-1" style="background: var(--color-bg-tertiary);">
			<button
				onclick={() => (activeTab = 'mac')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'mac'
					? 'var(--color-text)'
					: 'var(--color-text-muted)'}; background: {activeTab === 'mac'
					? 'var(--color-surface)'
					: 'transparent'};"
			>
				macOS
			</button>
			<button
				onclick={() => (activeTab = 'windows')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'windows'
					? 'var(--color-text)'
					: 'var(--color-text-muted)'}; background: {activeTab === 'windows'
					? 'var(--color-surface)'
					: 'transparent'};"
			>
				Windows
			</button>
			<button
				onclick={() => (activeTab = 'linux')}
				class="flex-1 cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
				style="color: {activeTab === 'linux'
					? 'var(--color-text)'
					: 'var(--color-text-muted)'}; background: {activeTab === 'linux'
					? 'var(--color-surface)'
					: 'transparent'};"
			>
				Linux
			</button>
		</div>

		<!-- Tab content -->
		<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
			{#if activeTab === 'mac'}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					The easiest way is to install the <strong style="color: var(--color-text);"
						>Xcode Command Line Tools</strong
					>, which include Git. Open Terminal and run:
				</p>
				<CodeBlock code="xcode-select --install" title="Install Xcode CLI Tools" />
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					A dialog will pop up asking you to install. Click <strong
						style="color: var(--color-text);">Install</strong
					> and wait a few minutes.
				</p>
				<p class="text-[14px]" style="color: var(--color-text-secondary);">
					Alternatively, if you use <strong style="color: var(--color-text);">Homebrew</strong>:
				</p>
				<CodeBlock code="brew install git" title="Or via Homebrew" />
			{:else if activeTab === 'windows'}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Download the official installer from <a
						href="https://git-scm.com/download/win"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium underline underline-offset-2"
						style="color: var(--color-primary);">git-scm.com</a
					> and run it. The defaults are fine for most users.
				</p>
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Alternatively, if you use <strong style="color: var(--color-text);">winget</strong> (built into
					Windows 11):
				</p>
				<CodeBlock
					code="winget install --id Git.Git -e --source winget"
					title="Install via winget"
				/>
				<p class="text-[14px]" style="color: var(--color-text-secondary);">
					After installation, restart your terminal (or VS Code) so it picks up the new <code
						class="rounded px-1.5 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">git</code
					> command.
				</p>
			{:else}
				<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
					Git is available in every major package manager. Use the one for your distribution:
				</p>
				<CodeBlock
					code={`# Debian / Ubuntu
sudo apt install git

# Fedora
sudo dnf install git

# Arch
sudo pacman -S git`}
					title="Install via package manager"
				/>
			{/if}
		</div>

		<!-- Verify installation -->
		<p class="mt-4 text-[14px]" style="color: var(--color-text-secondary);">
			To confirm Git is installed, open a terminal and run:
		</p>
		<CodeBlock
			code={`git --version
# git version 2.55.0`}
			title="Verify installation"
		/>
		<p class="mt-3 text-[13px]" style="color: var(--color-text-muted);">
			If you see a version number, you're ready to go. The exact number doesn't matter much —
			anything 2.30+ is fine.
		</p>
	</div>

	<!-- What is a Repository? -->
	<div id="section-intro-repo" class="mx-auto max-w-4xl">
		<div class="mb-6 flex items-center gap-2.5">
			<FolderGit2 size={20} style="color: var(--color-primary);" strokeWidth={2.5} />
			<h2 class="text-xl font-bold" style="color: var(--color-text);">What Is a Repository?</h2>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			A <strong style="color: var(--color-text);">repository</strong> (or "repo") is simply a
			project folder that Git is tracking. Inside it, Git maintains a hidden
			<code
				class="rounded px-1.5 py-0.5 text-xs"
				style="background: var(--color-code-bg); font-family: var(--font-mono);">.git</code
			> folder that stores the entire history of every file — every change, by whom, and when.
		</p>

		<div class="my-6">
			<ExpandableImage
				src="{base}/images/what-is-a-repo.webp"
				alt="A repository — the project folder above, the .git history vault below"
				caption="A repo is a normal folder — with its entire history in the hidden .git vault beneath it"
			/>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			There are two kinds of repositories you'll work with:
		</p>

		<div class="mb-4 grid gap-3 sm:grid-cols-2">
			<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
				<p class="mb-1.5 text-[13px] font-semibold" style="color: var(--color-text);">
					Local Repository
				</p>
				<p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
					The copy on your own computer. You make changes, stage them, and commit them here. It's
					completely private until you decide to share.
				</p>
			</div>
			<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
				<p class="mb-1.5 text-[13px] font-semibold" style="color: var(--color-text);">
					Remote Repository
				</p>
				<p class="text-xs leading-relaxed" style="color: var(--color-text-secondary);">
					A copy hosted on a service like <strong>GitHub</strong>, <strong>GitLab</strong>, or
					<strong>Bitbucket</strong>. This is how you share code with teammates and keep a backup in
					the cloud.
				</p>
			</div>
		</div>

		<p class="mb-4 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			The typical workflow is: you <strong style="color: var(--color-text);">clone</strong>
			(download) a remote repo to your machine, make changes locally, then
			<strong style="color: var(--color-text);">push</strong> (upload) your changes back. Git keeps both
			copies in sync.
		</p>

		<p class="mb-5 text-[14px] leading-relaxed" style="color: var(--color-text-secondary);">
			Every change in Git goes through three stages — your <strong style="color: var(--color-text);"
				>Working Directory</strong
			>
			(where you edit files), the <strong style="color: var(--color-text);">Staging Area</strong>
			(where you prepare a snapshot), and the
			<strong style="color: var(--color-text);">Repository</strong> (where snapshots are permanently saved
			as "commits"). Here's how they relate:
		</p>

		<MermaidDiagram
			definition={`graph LR
  A(["Working Directory"]) -->|"git add"| B(["Staging Area"])
  B -->|"git commit"| C(["Repository"])
  C -->|"git push"| D(["Remote"])`}
			id="repo-stages"
		/>
		<p class="mt-2 px-1 text-xs" style="color: var(--color-text-muted);">
			You edit files in your Working Directory, stage the ones you approve, commit them as a
			permanent snapshot, and push to share with your team.
		</p>
	</div>
</section>
