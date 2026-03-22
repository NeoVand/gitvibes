<script lang="ts">
	import { GitBranch, Sun, Moon } from 'lucide-svelte';

	let {
		theme = 'system',
		onToggleTheme
	}: { theme: string; onToggleTheme: () => void } = $props();
</script>

<header
	class="fixed top-0 right-0 left-0 z-50 flex items-center border-b"
	style="height: var(--header-height); border-color: var(--color-border); background: var(--color-bg);"
>
	<div class="flex w-full items-center justify-between px-5">
		<div class="flex items-center gap-2.5">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-md"
				style="background: var(--color-primary); color: white;"
			>
				<GitBranch size={15} strokeWidth={2.5} />
			</div>
			<span class="text-[15px] font-bold tracking-tight" style="color: var(--color-text);">
				GitVibes
			</span>
		</div>

		<button
			onclick={onToggleTheme}
			class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
			style="color: var(--color-text-muted); background: var(--color-bg-tertiary);"
			aria-label="Toggle theme"
		>
			{#if theme === 'dark'}
				<Sun size={15} />
			{:else}
				<Moon size={15} />
			{/if}
		</button>
	</div>
</header>
