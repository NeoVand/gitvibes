<script lang="ts">
	import { Monitor, Maximize2 } from 'lucide-svelte';
	import { base } from '$app/paths';
	import ImageLightbox from './ImageLightbox.svelte';

	let { src, alt, caption = '' }: { src: string; alt: string; caption?: string } = $props();

	let open = $state(false);
	let failed = $state(false);

	// Screenshots from the VS Code documentation are vendored under
	// static/images/vscode (as WebP) so the site has no runtime dependency
	// on the docs CDN.
	const imageUrl = $derived(
		src.startsWith('http') ? src : `${base}/images/vscode/${src.replace(/\.png$/, '.webp')}`
	);
</script>

<figure class="my-5 overflow-hidden rounded-lg" style="background: var(--color-bg-tertiary);">
	<div class="group flex items-center justify-between px-4 py-2">
		<span class="flex items-center gap-2">
			<Monitor size={14} style="color: var(--color-primary);" />
			<span class="text-xs font-medium" style="color: var(--color-text-secondary);"> VS Code </span>
		</span>
		<button
			type="button"
			onclick={() => (open = true)}
			class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-xs transition-opacity {open
				? 'opacity-100'
				: 'opacity-0 group-hover:opacity-100'}"
			style="color: var(--color-text-muted);"
			aria-label="Expand screenshot"
		>
			<Maximize2 size={14} />
			<span>Expand</span>
		</button>
	</div>
	<div class="flex items-center justify-center px-2 pb-2">
		{#if failed}
			<div
				class="flex w-full items-center justify-center rounded border border-dashed px-6 py-16 text-center"
				style="border-color: var(--color-border); color: var(--color-text-muted);"
			>
				<p class="text-xs italic">{alt}</p>
			</div>
		{:else}
			<button
				type="button"
				onclick={() => (open = true)}
				class="w-full cursor-zoom-in border-none bg-transparent p-0"
				aria-label={`Expand: ${alt}`}
			>
				<img
					src={imageUrl}
					{alt}
					class="w-full rounded"
					loading="lazy"
					style="max-height: 500px; object-fit: contain;"
					onerror={() => (failed = true)}
				/>
			</button>
		{/if}
	</div>
	{#if caption}
		<figcaption class="px-4 py-2.5 text-xs" style="color: var(--color-text-muted);">
			{caption}
		</figcaption>
	{/if}
</figure>

<ImageLightbox {open} src={imageUrl} {alt} onClose={() => (open = false)} />
