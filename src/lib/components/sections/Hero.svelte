<script lang="ts">
	import { GitBranch, Shield, Undo2, Users, ArrowDown, Gamepad2 } from 'lucide-svelte';

	const cards = [
		{ icon: GitBranch, title: 'Branch & Experiment', desc: 'Create safe sandboxes for AI work', color: 'var(--color-tip)' },
		{ icon: Undo2, title: 'Undo Any Mistake', desc: 'Recover instantly when AI goes wrong', color: 'var(--color-warning)' },
		{ icon: Users, title: 'Collaborate Safely', desc: 'Share AI-generated code professionally', color: 'var(--color-important)' }
	];
</script>

<section
	id="hero"
	class="relative flex min-h-[calc(100vh-var(--header-height))] flex-col items-center justify-center px-6 text-center"
>
	<div class="mx-auto max-w-2xl">
		<div
			class="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
			style="border-color: var(--color-border); color: var(--color-text-secondary);"
		>
			<Shield size={12} />
			<span>Your Safety Net for AI-Assisted Coding</span>
		</div>

		<h1
			class="mb-5 text-4xl leading-[1.15] font-extrabold tracking-tight sm:text-5xl"
			style="color: var(--color-text); letter-spacing: -0.025em;"
		>
			Git for
			<span style="color: var(--color-primary);">Vibe Coders</span>
		</h1>

		<p
			class="mx-auto mb-10 max-w-lg text-[15px] leading-relaxed"
			style="color: var(--color-text-secondary);"
		>
			Version control is your essential safety net -- your "save game" system
			that lets you experiment fearlessly, review every AI-generated change,
			and instantly undo any mistake.
		</p>

		<div class="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each cards as card (card.title)}
				<div
					class="flex flex-col items-center gap-2 rounded-lg border p-4"
					style="border-color: var(--color-border); background: var(--color-surface);"
				>
					<card.icon size={18} style="color: {card.color};" strokeWidth={2} />
					<span class="text-[13px] font-semibold" style="color: var(--color-text);">{card.title}</span>
					<span class="text-xs" style="color: var(--color-text-muted);">{card.desc}</span>
				</div>
			{/each}
		</div>

		<div
			class="mb-16 inline-flex items-start gap-3 rounded-lg border px-5 py-4 text-left"
			style="border-color: var(--color-tip); background: var(--color-tip-bg);"
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
				-- an interactive, visual tutorial that runs in your browser. The muscle memory will save you hours later.
			</p>
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
