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
		note: { icon: Info, label: 'Note', color: 'var(--color-note)', bg: 'var(--color-note-bg)' },
		tip: {
			icon: Lightbulb,
			label: 'Tip',
			color: 'var(--color-tip)',
			bg: 'var(--color-tip-bg)'
		},
		important: {
			icon: Star,
			label: 'Important',
			color: 'var(--color-important)',
			bg: 'var(--color-important-bg)'
		},
		warning: {
			icon: AlertTriangle,
			label: 'Warning',
			color: 'var(--color-warning)',
			bg: 'var(--color-warning-bg)'
		},
		caution: {
			icon: AlertOctagon,
			label: 'Caution',
			color: 'var(--color-caution)',
			bg: 'var(--color-caution-bg)'
		}
	};

	const c = $derived(config[type]);
</script>

<div
	class="my-5 rounded-lg border-l-4 px-5 py-4"
	style="background: {c.bg}; border-color: {c.color};"
>
	<div class="mb-2 flex items-center gap-2 text-sm font-semibold" style="color: {c.color};">
		<c.icon size={16} />
		<span>{title || c.label}</span>
	</div>
	<div class="text-sm leading-relaxed" style="color: var(--color-text-secondary);">
		{@render children()}
	</div>
</div>
