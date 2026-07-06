<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		// The redirect carries a query string, which resolve() route ids can't express
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/')}?playground`, { replaceState: true });
	});
</script>
