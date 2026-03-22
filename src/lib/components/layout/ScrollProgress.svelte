<script lang="ts">
	import { onMount } from 'svelte';

	let progress = $state(0);

	onMount(() => {
		function onScroll() {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<div class="fixed top-0 right-0 left-0 z-[60] h-1" style="background: var(--color-border);">
	<div
		class="h-full transition-[width] duration-150 ease-out"
		style="width: {progress}%; background: var(--color-primary);"
	></div>
</div>
