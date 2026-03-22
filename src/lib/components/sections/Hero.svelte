<script lang="ts">
	import { GitBranch, Undo2, Users, ArrowDown, Gamepad2, ScrollText, Monitor } from 'lucide-svelte';

	const cards = [
		{ icon: GitBranch, title: 'Branch & Experiment', desc: 'Create safe sandboxes for AI work', color: 'var(--color-tip)' },
		{ icon: Undo2, title: 'Undo Any Mistake', desc: 'Recover instantly when AI goes wrong', color: 'var(--color-warning)' },
		{ icon: Users, title: 'Collaborate Safely', desc: 'Share AI-generated code professionally', color: 'var(--color-important)' },
		{ icon: Monitor, title: 'VS Code Workflows', desc: 'Step-by-step visual instructions', color: 'var(--color-primary)' }
	];
</script>

<section
	id="hero"
	class="relative flex min-h-[calc(100vh-var(--header-height))] flex-col items-center justify-center px-6 text-center"
>
	<div class="mx-auto max-w-2xl">
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

		<div class="space-y-3 mb-8">
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

	<a
		href="#part-1"
		class="absolute bottom-6 flex flex-col items-center gap-0.5 animate-bounce"
		style="color: var(--color-text-muted);"
	>
		<span class="text-[11px]">Start</span>
		<ArrowDown size={16} />
	</a>
</section>
