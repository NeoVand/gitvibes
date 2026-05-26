<script lang="ts">
	import { X } from 'lucide-svelte';
	import GitPlayground from '$lib/components/playground/GitPlayground.svelte';

	let {
		open = false,
		onToggle
	}: { open: boolean; onToggle: () => void } = $props();

	let hasOpened = $state(false);

	$effect(() => {
		if (open) {
			hasOpened = true;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onToggle();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
		onclick={onToggle}
		aria-label="Close playground"
	></button>
{/if}

<aside
	class="fixed top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l transition-transform duration-200 ease-out md:w-[min(50vw,42rem)]"
	style="padding-top: var(--header-height); border-color: var(--color-border); background: var(--color-bg-secondary);"
	class:translate-x-0={open}
	class:translate-x-full={!open}
	aria-hidden={!open}
	aria-label="Git Playground"
>
	<div
		class="flex items-center justify-end border-b px-3 py-2"
		style="border-color: var(--color-border);"
	>
		<button
			onclick={onToggle}
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-80"
			style="color: var(--color-text-muted);"
			aria-label="Close playground"
		>
			<X size={15} />
		</button>
	</div>

	<div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
		{#if hasOpened}
			<GitPlayground panel id="global-playground" />
		{/if}
	</div>
</aside>
