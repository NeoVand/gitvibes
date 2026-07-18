<script lang="ts">
	import { tokenizeInlineCode } from '$lib/data/git-syntax';

	// Renders a hint string, turning `backtick spans` into syntax-highlighted
	// code chips (same .tok-* classes the cheat sheet and CodeBlock use) and
	// leaving everything else as plain text.
	let { text }: { text: string } = $props();

	// Even indices are prose, odd indices are code — the invariant of
	// String.split on the delimiter. Hints are audited (unit test) to have
	// balanced backticks, so an unmatched trailing tick can't occur.
	const parts = $derived(text.split('`'));
</script>

{#each parts as part, i (i)}{#if i % 2 === 1}<code
			class="rounded px-1 py-0.5"
			style="background: var(--color-code-bg); font-family: var(--font-mono);"
			>{#each tokenizeInlineCode(part) as token, ti (ti)}<span class="tok tok-{token.type}"
					>{token.text}</span
				>{/each}</code
		>{:else}{part}{/if}{/each}
