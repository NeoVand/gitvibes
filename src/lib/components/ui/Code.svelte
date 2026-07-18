<script lang="ts">
	import { tokenizeInlineCode } from '$lib/data/git-syntax';

	/**
	 * An inline code mention, syntax-highlighted the same way the terminal and
	 * code blocks are — so `git commit -m "msg"` reads with its subcommand and
	 * flag colored, not as one flat grey word. Used everywhere prose names a
	 * command, file, or ref.
	 */
	let { code }: { code: string } = $props();

	let tokens = $derived(tokenizeInlineCode(code));
</script>

<code class="gv-code"
	>{#each tokens as t, i (i)}<span class="tok tok-{t.type}">{t.text}</span>{/each}</code
>

<style>
	.gv-code {
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-family: var(--font-mono);
		font-size: 0.8em;
		background: var(--color-code-bg);
		white-space: nowrap;
	}
</style>
