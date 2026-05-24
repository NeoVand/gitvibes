<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { GitBranch, ArrowLeft, Sun, Moon } from 'lucide-svelte';
	import GitPlayground from '$lib/components/playground/GitPlayground.svelte';
	import {
		loadThemePreference,
		saveThemePreference,
		getEffectiveTheme,
		applyTheme,
		type ThemePreference
	} from '$lib/theme';

	let theme = $state<ThemePreference>('system');
	let mounted = $state(false);

	onMount(() => {
		theme = loadThemePreference();
		applyTheme(theme);
		mounted = true;
	});

	function toggleTheme() {
		const effective = getEffectiveTheme(theme);
		theme = effective === 'dark' ? 'light' : 'dark';
		saveThemePreference(theme);
		applyTheme(theme);
	}
</script>

<svelte:head>
	<title>Git Playground — GitVibes</title>
	<meta
		name="description"
		content="Practice real Git commands in your browser. No install required — powered by isomorphic-git."
	/>
</svelte:head>

<header
	class="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-4"
	style="height: var(--header-height); background: var(--color-bg); box-shadow: 0 1px 0 var(--color-border);"
>
	<div class="flex items-center gap-3">
		<a
			href="{base}/"
			class="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
		>
			<ArrowLeft size={16} />
			<span class="hidden sm:inline">Tutorial</span>
		</a>
		<div class="h-4 w-px" style="background: var(--color-border);"></div>
		<div class="flex items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-md"
				style="background: var(--color-primary); color: white;"
			>
				<GitBranch size={15} strokeWidth={2.5} />
			</div>
			<span class="text-[15px] font-bold tracking-tight" style="color: var(--color-text);">
				Git Playground
			</span>
		</div>
	</div>

	<button
		onclick={toggleTheme}
		class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
		style="color: var(--color-text-muted);"
		aria-label="Toggle theme"
	>
		{#if mounted && getEffectiveTheme(theme) === 'dark'}
			<Sun size={16} />
		{:else}
			<Moon size={16} />
		{/if}
	</button>
</header>

<main class="mx-auto max-w-5xl px-4 py-8" style="padding-top: calc(var(--header-height) + 2rem);">
	<div class="mb-8 text-center">
		<h1 class="mb-3 text-3xl font-extrabold tracking-tight" style="color: var(--color-text);">
			Try Git for real
		</h1>
		<p class="mx-auto max-w-xl text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			Run actual Git commands in an in-browser repository. Every commit, branch, and reset uses
			<strong style="color: var(--color-text);">isomorphic-git</strong> — the same operations as your terminal.
		</p>
	</div>

	<GitPlayground />

	<div class="mt-8 rounded-lg px-5 py-4 text-center text-xs" style="background: var(--color-surface); color: var(--color-text-muted);">
		Runs entirely in your browser. Nothing is sent to a server. Reset anytime to start over.
	</div>
</main>
