<script lang="ts">
	/**
	 * Companion to [GithubIcon]: lucide removed its brand icons in v1, so this
	 * keeps lucide's own `linkedin` geometry to match the outline icons beside
	 * it. See GithubIcon.svelte for the full reasoning.
	 *
	 * Artwork © Lucide Contributors, ISC licensed — https://lucide.dev
	 */
	let { size = 24 }: { size?: number | string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
	<rect width="4" height="12" x="2" y="9" />
	<circle cx="4" cy="4" r="2" />
</svg>
