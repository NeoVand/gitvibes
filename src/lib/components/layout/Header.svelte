<script lang="ts">
	import { GitBranch, Sun, Moon, ScrollText } from 'lucide-svelte';
	import Search from './Search.svelte';

	let {
		theme = 'system',
		onToggleTheme,
		onToggleCheatSheet
	}: {
		theme: string;
		onToggleTheme: () => void;
		onToggleCheatSheet: () => void;
	} = $props();
</script>

<header
	class="fixed top-0 right-0 left-0 z-50 flex items-center"
	style="height: var(--header-height); background: var(--color-bg); box-shadow: 0 1px 0 var(--color-border);"
>
	<div
		class="flex items-center"
		style="width: var(--sidebar-collapsed-width); justify-content: center; flex-shrink: 0;"
	>
		<div
			class="flex h-7 w-7 items-center justify-center rounded-md"
			style="background: var(--color-primary); color: white;"
		>
			<GitBranch size={15} strokeWidth={2.5} />
		</div>
	</div>

	<span class="text-[15px] font-bold tracking-tight" style="color: var(--color-text);">
		GitVibes
	</span>

	<div class="flex flex-1 justify-center">
		<Search />
	</div>

	<div class="flex items-center gap-0.5 pr-4">
		<button
			onclick={onToggleCheatSheet}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Git Cheat Sheet"
		>
			<ScrollText size={16} />
		</button>

		<button
			onclick={onToggleTheme}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Toggle theme"
		>
			{#if theme === 'dark'}
				<Sun size={16} />
			{:else}
				<Moon size={16} />
			{/if}
		</button>
	</div>
</header>
