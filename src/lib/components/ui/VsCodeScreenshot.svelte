<script lang="ts">
	import { Monitor } from 'lucide-svelte';

	let {
		src,
		alt,
		caption = ''
	}: { src: string; alt: string; caption?: string } = $props();

	const baseUrl = 'https://code.visualstudio.com/assets/docs/sourcecontrol';
</script>

<figure
	class="my-5 overflow-hidden rounded-lg border"
	style="border-color: var(--color-border); background: var(--color-bg-secondary);"
>
	<div
		class="flex items-center gap-2 border-b px-4 py-2"
		style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
	>
		<Monitor size={14} style="color: var(--color-primary);" />
		<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
			VS Code
		</span>
	</div>
	<div class="flex items-center justify-center p-2" style="background: var(--color-bg-tertiary);">
		<img
			src={src.startsWith('http') ? src : `${baseUrl}/${src}`}
			{alt}
			class="w-full rounded"
			loading="lazy"
			style="max-height: 500px; object-fit: contain;"
		/>
	</div>
	{#if caption}
		<figcaption
			class="border-t px-4 py-2.5 text-xs"
			style="border-color: var(--color-border); color: var(--color-text-muted);"
		>
			{caption}
		</figcaption>
	{/if}
</figure>
