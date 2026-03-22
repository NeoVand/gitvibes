<script lang="ts">
	let {
		partNumber = '',
		partLabel = '',
		title,
		icon,
		color = 'var(--color-primary)',
		level = 'part'
	}: {
		partNumber?: string;
		partLabel?: string;
		title: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		color?: string;
		level?: 'part' | 'section';
	} = $props();
</script>

{#if level === 'part'}
	<div class="mb-10">
		{#if partLabel}
			<div class="mb-2 flex items-center gap-1.5">
				<svelte:component this={icon} size={14} style="color: {color};" strokeWidth={2.5} />
				<span class="text-xs font-semibold tracking-wide uppercase" style="color: {color}; letter-spacing: 0.05em;">
					{partLabel}
				</span>
			</div>
		{/if}
		<h2
			class="text-[22px] leading-snug font-bold tracking-tight"
			style="color: var(--color-text); letter-spacing: -0.015em;"
		>
			{title}
		</h2>
	</div>
{:else}
	<div class="mb-4 flex items-center gap-2">
		<svelte:component this={icon} size={16} style="color: {color};" strokeWidth={2} />
		<h3
			class="text-[17px] font-semibold tracking-tight"
			style="color: var(--color-text); letter-spacing: -0.01em;"
		>
			{title}
		</h3>
	</div>
{/if}
