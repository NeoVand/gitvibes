<script lang="ts">
	import ImageLightbox from './ImageLightbox.svelte';

	let {
		src,
		alt,
		caption = '',
		class: className = 'w-full rounded-xl',
		loading = 'lazy'
	}: {
		src: string;
		alt: string;
		caption?: string;
		class?: string;
		loading?: 'lazy' | 'eager';
	} = $props();

	let open = $state(false);
</script>

<figure class={caption ? 'my-0' : ''}>
	<button
		type="button"
		class="block w-full cursor-zoom-in border-none bg-transparent p-0 text-left transition-opacity hover:opacity-95"
		onclick={() => (open = true)}
		aria-label={`Expand image: ${alt}`}
	>
		<img {src} {alt} class={className} {loading} />
	</button>
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
