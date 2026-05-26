<script lang="ts">
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
	class="fixed top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l shadow-2xl transition-transform duration-200 ease-out md:w-[min(50vw,44rem)]"
	style="padding-top: var(--header-height); border-color: var(--color-border); background: var(--color-bg-secondary);"
	class:translate-x-0={open}
	class:translate-x-full={!open}
	aria-hidden={!open}
	aria-label="Git Playground"
>
	{#if hasOpened}
		<GitPlayground panel id="global-playground" onClose={onToggle} />
	{/if}
</aside>
