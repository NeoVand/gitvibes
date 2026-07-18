<script lang="ts">
	import { Sparkles } from 'lucide-svelte';

	let {
		prompts
	}: {
		prompts: string[];
	} = $props();
</script>

<div data-fabric class="vibe-box my-5 rounded-lg px-5 py-4">
	<div
		class="mb-2.5 flex items-center gap-2 text-sm font-bold tracking-wide uppercase"
		style="color: var(--color-vibe); font-family: var(--font-heading); letter-spacing: 0.08em;"
	>
		<Sparkles size={16} strokeWidth={2.5} />
		<span>Vibe it</span>
	</div>
	<div class="space-y-2">
		{#each prompts as prompt (prompt)}
			<p class="text-[13px] leading-relaxed italic" style="color: var(--color-text);">
				"{prompt}"
			</p>
		{/each}
	</div>
</div>

<style>
	.vibe-box {
		background: var(--color-vibe-bg);
	}
</style>
