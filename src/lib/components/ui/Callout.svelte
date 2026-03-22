<script lang="ts">
	import { Info, Lightbulb, AlertTriangle, AlertOctagon, Star } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		type = 'note',
		title = '',
		children
	}: {
		type?: 'note' | 'tip' | 'important' | 'warning' | 'caution';
		title?: string;
		children: Snippet;
	} = $props();

	const config = {
		note: { icon: Info, label: 'Note', color: 'var(--color-note)', bg: 'var(--color-note-bg)', border: 'var(--color-note-border)' },
		tip: { icon: Lightbulb, label: 'Tip', color: 'var(--color-tip)', bg: 'var(--color-tip-bg)', border: 'var(--color-tip-border)' },
		important: { icon: Star, label: 'Important', color: 'var(--color-important)', bg: 'var(--color-important-bg)', border: 'var(--color-important-border)' },
		warning: { icon: AlertTriangle, label: 'Warning', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)' },
		caution: { icon: AlertOctagon, label: 'Caution', color: 'var(--color-caution)', bg: 'var(--color-caution-bg)', border: 'var(--color-caution-border)' }
	};

	const c = $derived(config[type]);
</script>

<div
	class="my-5 rounded-lg border border-l-4 px-5 py-4"
	style="background: {c.bg}; border-color: {c.border}; border-left-color: {c.color};"
>
	<div class="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide" style="color: {c.color};">
		<c.icon size={20} strokeWidth={2.5} />
		<span>{title || c.label}</span>
	</div>
	<div class="callout-content text-sm leading-relaxed" style="color: var(--color-text);">
		{@render children()}
	</div>
</div>

<style>
	.callout-content :global(strong) {
		font-weight: 700;
	}
	.callout-content :global(em) {
		font-style: italic;
	}
</style>
