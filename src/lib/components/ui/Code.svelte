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
		/* `nowrap` here used to push the whole page sideways on a phone. These
		   chips sit in running prose, a few of them quote something long — a
		   divergent-branches error, a rejected-push message — and an inline
		   element cannot scroll, so that width went straight to the document
		   and EVERY page scrolled horizontally at 390px.

		   Wrapping is the only fix available to an inline box, and it costs
		   something: normal line-breaking may split after a hyphen or a slash,
		   so on a narrow screen about seven of the ~370 chips break inside a
		   token (`--force-with-lease` across two lines). Measured at zero on
		   desktop. Keeping tokens whole instead was tried and reintroduces the
		   bug outright — one quoted error tokenizes as a single 739px word,
		   which no amount of wrapping between tokens can place.

		   `break-word` rather than `anywhere`: it breaks a word only when the
		   word cannot fit a line by itself, leaving the ordinary chip alone. */
		overflow-wrap: break-word;
		word-break: normal;
	}
</style>
