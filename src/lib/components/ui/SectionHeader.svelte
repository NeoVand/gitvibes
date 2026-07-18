<script lang="ts">
	import { tokenizeInlineCode } from '$lib/data/git-syntax';

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

	// A title may name a command in `backticks`; those segments render as
	// highlighted code so headings match the syntax-highlighted prose.
	let parts = $derived(title.split('`'));
</script>

{#snippet titleContent()}
	{#each parts as part, i (i)}{#if i % 2 === 1}<code class="hdr-code"
				>{#each tokenizeInlineCode(part) as t, j (j)}<span class="tok tok-{t.type}">{t.text}</span
					>{/each}</code
			>{:else}{part}{/if}{/each}
{/snippet}

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
			{@render titleContent()}
		</h2>
	</div>
{:else}
	<div class="mb-5 flex items-center gap-2.5">
		<Icon size={18} style="color: {color};" strokeWidth={2} />
		<h3
			class="text-xl font-semibold"
			style="color: var(--color-text); letter-spacing: -0.02em; font-family: var(--font-heading);"
		>
			{@render titleContent()}
		</h3>
	</div>
{/if}

<style>
	.hdr-code {
		font-family: var(--font-mono);
		font-size: 0.82em;
		background: var(--color-code-bg);
		border-radius: 0.25rem;
		padding: 0.05em 0.32em;
	}
</style>
