<script lang="ts">
	import { Sparkles } from 'lucide-svelte';

	let {
		prompts
	}: {
		prompts: string[];
	} = $props();
</script>

<div
	class="vibe-box my-5 rounded-lg px-5 py-4"
>
	<div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--color-vibe);">
		<Sparkles size={14} strokeWidth={2.5} />
		<span>Vibe it</span>
	</div>
	<div class="space-y-2">
		{#each prompts as prompt}
			<p class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
				<span class="italic" style="color: var(--color-vibe-text);">"{prompt}"</span>
			</p>
		{/each}
	</div>
</div>

<style>
	.vibe-box {
		background: var(--color-vibe-bg);
	}
</style>
