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
	class="my-4 rounded-lg border px-4 py-3.5"
	style="background: {c.bg}; border-color: {c.border};"
>
	<div class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style="color: {c.color};">
		<c.icon size={14} strokeWidth={2.5} />
		<span>{title || c.label}</span>
	</div>
	<div class="text-[13px] leading-relaxed" style="color: var(--color-text-secondary);">
		{@render children()}
	</div>
</div>
