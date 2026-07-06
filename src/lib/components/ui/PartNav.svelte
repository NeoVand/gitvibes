<script lang="ts">
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';

	let {
		prev,
		next,
		onNavigate
	}: {
		prev?: { id: string; label: string };
		next?: { id: string; label: string };
		onNavigate: (id: string) => void;
	} = $props();
</script>

<div class="mx-auto flex max-w-4xl items-stretch justify-between gap-3 px-6 pb-16">
	{#if prev}
		<button
			type="button"
			onclick={() => onNavigate(prev.id)}
			class="part-nav-btn flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors sm:min-w-48 sm:flex-none"
		>
			<ArrowLeft size={15} class="flex-shrink-0" />
			<span class="min-w-0">
				<span
					class="block text-[10.5px] tracking-wider uppercase"
					style="color: var(--color-text-muted);">Previous</span
				>
				<span class="block truncate text-[13px] font-semibold">{prev.label}</span>
			</span>
		</button>
	{:else}
		<span></span>
	{/if}
	{#if next}
		<button
			type="button"
			onclick={() => onNavigate(next.id)}
			class="part-nav-btn flex flex-1 cursor-pointer items-center justify-end gap-2 rounded-xl border px-4 py-3 text-right transition-colors sm:min-w-48 sm:flex-none"
		>
			<span class="min-w-0">
				<span
					class="block text-[10.5px] tracking-wider uppercase"
					style="color: var(--color-text-muted);">Next</span
				>
				<span class="block truncate text-[13px] font-semibold">{next.label}</span>
			</span>
			<ArrowRight size={15} class="flex-shrink-0" />
		</button>
	{/if}
</div>

<style>
	.part-nav-btn {
		border-color: var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
	}

	.part-nav-btn:hover {
		border-color: var(--color-primary);
	}
</style>
