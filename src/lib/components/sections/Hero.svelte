<script lang="ts">
	import { GitBranch, Shield, Undo2, Users, ChevronDown } from 'lucide-svelte';
</script>

<section
	id="hero"
	class="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
	style="padding-top: var(--header-height);"
>
	<div class="mx-auto max-w-3xl">
		<div
			class="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
			style="background: var(--color-primary-dim); color: var(--color-primary);"
		>
			<Shield size={14} />
			<span>Your Safety Net for AI-Assisted Coding</span>
		</div>

		<h1
			class="mb-6 text-5xl leading-tight font-extrabold tracking-tight md:text-6xl lg:text-7xl"
			style="color: var(--color-text);"
		>
			Git for
			<span style="color: var(--color-primary);">Vibe Coders</span>
		</h1>

		<p
			class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed md:text-xl"
			style="color: var(--color-text-secondary);"
		>
			Version control is not just a tool for collaboration. It is your essential,
			non-negotiable safety net. Your "save game" system that allows you to experiment
			fearlessly, review every AI-generated change, and instantly undo any mistake.
		</p>

		<div class="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div
				class="flex flex-col items-center gap-2 rounded-xl p-5"
				style="background: var(--color-surface); border: 1px solid var(--color-border);"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg"
					style="background: var(--color-tip-bg); color: var(--color-tip);"
				>
					<GitBranch size={20} />
				</div>
				<span class="text-sm font-semibold" style="color: var(--color-text);">Branch & Experiment</span>
				<span class="text-xs" style="color: var(--color-text-muted);">Create safe sandboxes for AI work</span>
			</div>
			<div
				class="flex flex-col items-center gap-2 rounded-xl p-5"
				style="background: var(--color-surface); border: 1px solid var(--color-border);"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg"
					style="background: var(--color-warning-bg); color: var(--color-warning);"
				>
					<Undo2 size={20} />
				</div>
				<span class="text-sm font-semibold" style="color: var(--color-text);">Undo Any Mistake</span>
				<span class="text-xs" style="color: var(--color-text-muted);">Recover instantly when AI goes wrong</span>
			</div>
			<div
				class="flex flex-col items-center gap-2 rounded-xl p-5"
				style="background: var(--color-surface); border: 1px solid var(--color-border);"
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg"
					style="background: var(--color-important-bg); color: var(--color-important);"
				>
					<Users size={20} />
				</div>
				<span class="text-sm font-semibold" style="color: var(--color-text);">Collaborate Safely</span>
				<span class="text-xs" style="color: var(--color-text-muted);">Share AI-generated code professionally</span>
			</div>
		</div>
	</div>

	<a
		href="#part-1"
		class="absolute bottom-8 flex flex-col items-center gap-1 animate-bounce"
		style="color: var(--color-text-muted);"
	>
		<span class="text-xs">Start Learning</span>
		<ChevronDown size={20} />
	</a>
</section>
