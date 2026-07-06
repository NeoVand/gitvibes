<script lang="ts">
	import ImageLightbox from './ImageLightbox.svelte';

	let {
		src,
		alt,
		caption = '',
		class: className = 'w-full rounded-xl',
		loading = 'lazy',
		// Every banner is generated at 1672x941; explicit dimensions let the
		// browser reserve the box before the image loads, so lazy loading
		// doesn't shift the layout under the reader (or under a scroll).
		width = 1672,
		height = 941
	}: {
		src: string;
		alt: string;
		caption?: string;
		class?: string;
		loading?: 'lazy' | 'eager';
		width?: number;
		height?: number;
	} = $props();

	let open = $state(false);
	let failed = $state(false);
</script>

<figure class={caption ? 'my-0' : ''}>
	{#if failed}
		<div
			class="flex w-full items-center justify-center rounded-xl border border-dashed px-6 text-center"
			style="aspect-ratio: {width} / {height}; border-color: var(--color-border); color: var(--color-text-muted);"
		>
			<p class="text-xs italic">{alt}</p>
		</div>
	{:else}
		<button
			type="button"
			class="block w-full cursor-zoom-in border-none bg-transparent p-0 text-left transition-opacity hover:opacity-95"
			onclick={() => (open = true)}
			aria-label={`Expand image: ${alt}`}
		>
			<img
				{src}
				{alt}
				class="h-auto {className}"
				{loading}
				{width}
				{height}
				onerror={() => (failed = true)}
			/>
		</button>
	{/if}
	{#if caption}
		<figcaption
			class="mt-2.5 text-center text-[13px] italic"
			style="color: var(--color-text-muted); font-family: var(--font-sans);"
		>
			{caption}
		</figcaption>
	{/if}
</figure>

<ImageLightbox {open} {src} {alt} onClose={() => (open = false)} />
