<script lang="ts">
	import { Sun, Moon, ScrollText, Github, Gamepad2, Bot, X, Linkedin } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Search from './Search.svelte';

	let {
		theme = 'system',
		onToggleTheme,
		onToggleCheatSheet,
		onTogglePlayground,
		onToggleAgent,
		onNavigate
	}: {
		theme: string;
		onToggleTheme: () => void;
		onToggleCheatSheet: () => void;
		onTogglePlayground: () => void;
		onToggleAgent: () => void;
		onNavigate?: (id: string) => void;
	} = $props();

	let aboutOpen = $state(false);
</script>

<header
	class="app-header fixed top-0 right-0 left-0 z-50 flex items-center"
	style="height: var(--header-height);"
>
	<div
		class="flex flex-shrink-0 items-center justify-center"
		style="width: var(--sidebar-collapsed-width);"
	>
		<button
			onclick={() => (aboutOpen = true)}
			class="flex h-7 w-7 cursor-pointer items-center justify-center transition-opacity hover:opacity-80"
			aria-label="About GitVibes"
		>
			<img src="{base}/images/logo.webp" alt="" class="h-7 w-7" width="28" height="28" />
		</button>
	</div>

	<span
		class="hidden text-[15px] font-bold tracking-tight sm:inline"
		style="color: var(--color-text); font-family: var(--font-heading); letter-spacing: -0.02em;"
	>
		GitVibes
	</span>

	<div class="flex-1"></div>

	<!-- One control set for all breakpoints: label/link visibility adapts via CSS -->
	<div class="flex flex-shrink-0 items-center gap-0.5 pr-2 sm:gap-1">
		<div class="sm:mr-1">
			<Search {onNavigate} />
		</div>

		<button
			onclick={onTogglePlayground}
			class="playground-btn flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-all sm:w-auto sm:px-2.5"
			aria-label="Open Git Playground"
		>
			<Gamepad2 size={16} />
			<span class="hidden text-xs font-semibold sm:inline">Playground</span>
		</button>

		<button
			onclick={onToggleAgent}
			class="agent-btn flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-all sm:w-auto sm:px-2.5"
			aria-label="Open Agent"
		>
			<Bot size={16} />
			<span class="hidden text-xs font-semibold sm:inline">Agent</span>
		</button>

		<button
			onclick={onToggleCheatSheet}
			class="cheatsheet-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all"
			aria-label="Git Cheat Sheet"
		>
			<ScrollText size={16} />
		</button>

		<a
			href="https://github.com/NeoVand/gitvibes"
			target="_blank"
			rel="noopener noreferrer"
			class="hidden h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70 sm:flex"
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
				<img
					src="{base}/images/logo.webp"
					alt="GitVibes logo"
					class="h-10 w-10"
					width="40"
					height="40"
				/>
				<div>
					<h2
						class="text-lg font-bold"
						style="color: var(--color-text); font-family: var(--font-heading); letter-spacing: -0.02em;"
					>
						GitVibes
					</h2>
					<p class="text-xs" style="color: var(--color-text-muted);">Git for Vibe Coders</p>
				</div>
			</div>

			<p class="mb-5 text-sm leading-relaxed" style="color: var(--color-text-secondary);">
				An interactive educational app built to teach Git to developers working with AI tools. For
				educational purposes only.
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
	/* Frosted glass, matching the sidebar's treatment: content scrolls
	   visibly behind the header through the blur. */
	.app-header {
		background: color-mix(in srgb, var(--color-bg) 62%, transparent);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-border) 80%, transparent);
	}

	.playground-btn {
		color: var(--color-important);
	}

	.playground-btn:hover {
		background: color-mix(in srgb, var(--color-important) 10%, transparent);
	}

	.agent-btn {
		color: var(--color-btn-agent);
	}

	.agent-btn:hover {
		background: color-mix(in srgb, var(--color-btn-agent) 10%, transparent);
	}

	/* Same inviting treatment as the playground button, in the cheat
	   sheet's accent — matching its "Quick reference" callout on the page */
	.cheatsheet-btn {
		color: var(--color-primary);
	}

	.cheatsheet-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}
</style>
