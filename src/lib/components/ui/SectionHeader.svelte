<script lang="ts">
	let {
		partLabel = '',
		title,
		icon: Icon,
		color = 'var(--color-primary)',
		level = 'part'
	}: {
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
			<div class="mb-3 flex items-center gap-2">
				<Icon size={16} style="color: {color};" strokeWidth={2.5} />
				<span
					class="text-xs font-bold tracking-widest uppercase"
					style="color: {color}; letter-spacing: 0.14em; font-family: var(--font-heading);"
				>
					{partLabel}
				</span>
			</div>
		{/if}
		<h2
			class="text-[28px] leading-tight font-bold sm:text-[32px]"
			style="color: var(--color-text); letter-spacing: -0.03em; font-family: var(--font-heading);"
		>
			{title}
		</h2>
	</div>
{:else}
	<div class="mb-5 flex items-center gap-2.5">
		<Icon size={18} style="color: {color};" strokeWidth={2} />
		<h3
			class="text-xl font-semibold"
			style="color: var(--color-text); letter-spacing: -0.02em; font-family: var(--font-heading);"
		>
			{title}
		</h3>
	</div>
{/if}
