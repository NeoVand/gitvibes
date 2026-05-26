<script lang="ts">
	import { GitBranch, Sun, Moon, ScrollText, Github, MoreVertical, Gamepad2, X, Linkedin } from 'lucide-svelte';
	import Search from './Search.svelte';

	let {
		theme = 'system',
		onToggleTheme,
		onToggleCheatSheet,
		onTogglePlayground,
		onNavigate
	}: {
		theme: string;
		onToggleTheme: () => void;
		onToggleCheatSheet: () => void;
		onTogglePlayground: () => void;
		onNavigate?: (id: string) => void;
	} = $props();

	let menuOpen = $state(false);
	let aboutOpen = $state(false);
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
		<button
			onclick={() => (aboutOpen = true)}
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-80"
			style="background: var(--color-primary); color: white;"
			aria-label="About GitVibes"
		>
			<GitBranch size={15} strokeWidth={2.5} />
		</button>
	</div>

	<span class="hidden text-[15px] font-bold tracking-tight sm:inline" style="color: var(--color-text);">
		GitVibes
	</span>

	<div class="flex-1"></div>

	<!-- Desktop: show all icons -->
	<div class="hidden flex-shrink-0 items-center gap-1 pr-4 sm:flex">
		<div class="mr-1">
			<Search {onNavigate} />
		</div>

		<button
			onclick={onTogglePlayground}
			class="playground-btn flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 transition-all"
			aria-label="Open Git Playground"
		>
			<Gamepad2 size={16} />
			<span class="text-xs font-semibold">Playground</span>
		</button>

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

	<!-- Mobile: search + burger menu -->
	<div class="flex-shrink-0 sm:hidden">
		<Search {onNavigate} />
	</div>
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
					onclick={() => { onTogglePlayground(); menuOpen = false; }}
					class="playground-btn flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 transition-all"
					aria-label="Open Git Playground"
				>
					<Gamepad2 size={16} />
				</button>

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

{#if aboutOpen}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={() => (aboutOpen = false)}
			aria-label="Close about"
		></button>
		<div
			class="about-modal relative w-full max-w-sm rounded-xl border p-6 shadow-2xl"
			style="background: var(--color-surface); border-color: var(--color-border);"
		>
			<button
				onclick={() => (aboutOpen = false)}
				class="absolute top-3 right-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-70"
				style="color: var(--color-text-muted);"
				aria-label="Close"
			>
				<X size={16} />
			</button>

			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg"
					style="background: var(--color-primary); color: white;"
				>
					<GitBranch size={22} strokeWidth={2.5} />
				</div>
				<div>
					<h2 class="text-lg font-bold" style="color: var(--color-text);">GitVibes</h2>
					<p class="text-xs" style="color: var(--color-text-muted);">Git for Vibe Coders</p>
				</div>
			</div>

			<p class="mb-5 text-sm leading-relaxed" style="color: var(--color-text-secondary);">
				An interactive educational app built to teach Git to developers working with AI tools. For educational purposes only.
			</p>

			<div class="mb-4 text-sm" style="color: var(--color-text-secondary);">
				<p class="mb-1 font-medium" style="color: var(--color-text);">Created by Neo Mohsenvand</p>
			</div>

			<div class="flex gap-2">
				<a
					href="https://github.com/NeoVand"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
					style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
				>
					<Github size={14} />
					GitHub
				</a>
				<a
					href="https://linkedin.com/in/mohsenvand"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
					style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
				>
					<Linkedin size={14} />
					LinkedIn
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.playground-btn {
		color: var(--color-important);
	}

	.playground-btn:hover {
		background: color-mix(in srgb, var(--color-important) 10%, transparent);
	}
</style>
