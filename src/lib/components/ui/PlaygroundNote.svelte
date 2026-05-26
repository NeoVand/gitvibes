<script lang="ts">
	import { Gamepad2 } from 'lucide-svelte';

	let {
		children
	}: {
		children: import('svelte').Snippet;
	} = $props();
</script>

<div
	class="my-4 flex items-start gap-2 rounded-lg px-4 py-3 text-[13px] leading-relaxed"
	style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-secondary);"
>
	<Gamepad2 size={16} class="mt-0.5 flex-shrink-0" style="color: var(--color-important);" />
	<div>{@render children()}</div>
</div>
