<script lang="ts">
	import ImageLightbox from './ImageLightbox.svelte';

	let {
		src,
		alt,
		class: className = 'w-full rounded-xl',
		loading = 'lazy'
	}: {
		src: string;
		alt: string;
		class?: string;
		loading?: 'lazy' | 'eager';
	} = $props();

	let open = $state(false);
</script>

<button
	type="button"
	class="block w-full cursor-zoom-in border-none bg-transparent p-0 text-left transition-opacity hover:opacity-95"
	onclick={() => (open = true)}
	aria-label={`Expand image: ${alt}`}
>
	<img {src} {alt} class={className} {loading} />
</button>

<ImageLightbox {open} {src} {alt} onClose={() => (open = false)} />
