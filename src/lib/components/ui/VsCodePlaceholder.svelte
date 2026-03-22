<script lang="ts">
	import { Monitor } from 'lucide-svelte';

	let { description, alt = '' }: { description: string; alt?: string } = $props();
</script>

<div
	class="my-5 overflow-hidden rounded-lg border"
	style="border-color: var(--color-border); background: var(--color-bg-secondary);"
>
	<div
		class="flex items-center gap-2 border-b px-4 py-2.5"
		style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
	>
		<Monitor size={14} style="color: var(--color-primary);" />
		<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
			VS Code Screenshot
		</span>
	</div>
	<div class="flex flex-col items-center justify-center px-6 py-12" style="min-height: 200px;">
		<div
			class="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
			style="background: var(--color-primary-dim);"
		>
			<Monitor size={24} style="color: var(--color-primary);" />
		</div>
		<p class="max-w-md text-center text-sm" style="color: var(--color-text-muted);">
			{description}
		</p>
		{#if alt}
			<p class="mt-1 text-xs" style="color: var(--color-text-muted); opacity: 0.7;">
				{alt}
			</p>
		{/if}
	</div>
</div>
