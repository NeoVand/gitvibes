<script lang="ts">
	import { GitBranch, Sun, Moon, ScrollText, Github, MoreVertical } from 'lucide-svelte';
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

	let menuOpen = $state(false);
	let menuRef: HTMLDivElement | undefined = $state(undefined);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function handleClickOutside(e: MouseEvent) {
		if (menuRef && !menuRef.contains(e.target as Node)) {
			menuOpen = false;
		}
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<header
	class="fixed top-0 right-0 left-0 z-50 flex items-center"
	style="height: var(--header-height); background: var(--color-bg); box-shadow: 0 1px 0 var(--color-border);"
>
	<div
		class="flex flex-shrink-0 items-center justify-center"
		style="width: var(--sidebar-collapsed-width);"
	>
		<div
			class="flex h-7 w-7 items-center justify-center rounded-md"
			style="background: var(--color-primary); color: white;"
		>
			<GitBranch size={15} strokeWidth={2.5} />
		</div>
	</div>

	<span class="hidden text-[15px] font-bold tracking-tight sm:inline" style="color: var(--color-text);">
		GitVibes
	</span>

	<div class="flex min-w-0 flex-1 justify-center px-2">
		<Search />
	</div>

	<!-- Desktop: show all icons -->
	<div class="hidden flex-shrink-0 items-center gap-0.5 pr-4 sm:flex">
		<button
			onclick={onToggleCheatSheet}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Git Cheat Sheet"
		>
			<ScrollText size={16} />
		</button>

		<a
			href="https://github.com/NeoVand/gitvibes"
			target="_blank"
			rel="noopener noreferrer"
			class="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="View on GitHub"
		>
			<Github size={16} />
		</a>

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

	<!-- Mobile: burger menu -->
	<div class="relative flex-shrink-0 pr-2 sm:hidden" bind:this={menuRef}>
		<button
			onclick={toggleMenu}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Menu"
		>
			<MoreVertical size={16} />
		</button>

		{#if menuOpen}
			<div
				class="absolute right-0 top-full mt-1 flex items-center gap-0.5 rounded-lg p-1 shadow-lg"
				style="background: var(--color-surface); border: 1px solid var(--color-border); z-index: 100;"
			>
				<button
					onclick={() => { onToggleCheatSheet(); menuOpen = false; }}
					class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-70"
					style="color: var(--color-text-muted);"
					aria-label="Git Cheat Sheet"
				>
					<ScrollText size={16} />
				</button>

				<a
					href="https://github.com/NeoVand/gitvibes"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-8 w-8 items-center justify-center rounded-md transition-opacity hover:opacity-70"
					style="color: var(--color-text-muted);"
					aria-label="View on GitHub"
					onclick={() => { menuOpen = false; }}
				>
					<Github size={16} />
				</a>

				<button
					onclick={() => { onToggleTheme(); menuOpen = false; }}
					class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-70"
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
		{/if}
	</div>
</header>
