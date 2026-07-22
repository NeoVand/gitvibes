<script lang="ts">
	import { base } from '$app/paths';
	import { cheatSheet, cheatSheetLegend } from '$lib/data/cheat-sheet';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';
</script>

{#snippet chipText(text: string)}
	<!-- Command mentions sit in `backticks` in the data; on paper they get the
	     same monospace treatment as the command column. -->
	{#each text.split('`') as seg, si (si)}{#if si % 2 === 1}<code class="inline-code"
				>{#each tokenizeGitCommand(seg) as token, ti (ti)}<span class="tok tok-{token.type}"
						>{token.text}</span
					>{/each}</code
			>{:else}{seg}{/if}{/each}
{/snippet}

<!-- Print-only source page for static/gitvibes-cheatsheet.pdf.
     Not linked from the site; regenerate the PDF with
     `node scripts/make-cheatsheet-pdf.mjs` (dev server running). -->
<svelte:head>
	<title>GitVibes — Git Cheat Sheet</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="sheet">
	<!-- div, not <header>: the site-wide print stylesheet hides `header`
	     to strip app chrome, and page.pdf renders in print media -->
	<div class="masthead">
		<img src="{base}/images/logo.webp" alt="" class="logo" />
		<div>
			<h1>Git Cheat Sheet</h1>
			<p class="sub">
				GitVibes — Git for Vibe Coders · <span class="url">neovand.github.io/gitvibes</span>
			</p>
		</div>
	</div>

	<div class="legend">
		<p class="legend-lead">{cheatSheetLegend.lead}</p>
		<ul>
			{#each cheatSheetLegend.entries as entry (entry.notation)}
				<li><code>{entry.notation}</code> {@render chipText(entry.meaning)}</li>
			{/each}
		</ul>
	</div>

	<div class="columns">
		{#each cheatSheet as category (category.label)}
			<section class="category">
				<h2>{category.label}</h2>
				<ul>
					{#each category.commands as cmd (cmd.command)}
						<li>
							<code
								>{#each tokenizeGitCommand(cmd.command) as token, ti (ti)}<span
										class="tok tok-{token.type}">{token.text}</span
									>{/each}</code
							>
							<p>{@render chipText(cmd.description)}</p>
							{#if cmd.detail}
								<p class="detail">{@render chipText(cmd.detail)}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</div>

<style>
	/* Self-contained light palette: the PDF must look right regardless of the
	   reader's theme, and dark pages waste ink. */
	:global(html):has(.sheet),
	:global(body):has(.sheet) {
		background: #ffffff !important;
	}

	.sheet {
		max-width: 186mm;
		margin: 0 auto;
		background: #ffffff;
		color: #1e293b;
		font-family: var(--font-sans);
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}

	/* The placeholder key reads before the commands do, so it spans the full
	   width above the columns rather than joining the flow. */
	.legend {
		border: 1px solid #cbd5e1;
		border-radius: 3pt;
		padding: 5pt 7pt;
		margin-bottom: 7pt;
		background: #f8fafc;
	}

	.legend-lead {
		font-size: 7.5pt;
		font-weight: 600;
		color: #334155;
		margin: 0 0 3pt;
	}

	.legend ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.legend li {
		font-size: 7pt;
		line-height: 1.45;
		color: #475569;
		margin-bottom: 1.5pt;
	}

	/* The command column's `code` is a block — one command per line is the
	   whole point there. A mention inside a sentence has to opt back out, or
	   every chip breaks its own line and the sentence arrives in pieces. */
	.legend code,
	.inline-code {
		display: inline;
		font-family: var(--font-mono);
		font-size: 6.8pt;
		background: #e2e8f0;
		border: 0;
		border-radius: 2pt;
		padding: 0 2pt;
		white-space: nowrap;
	}

	.masthead {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 10px;
		margin-bottom: 12px;
		border-bottom: 2.5px solid #818cf8;
	}

	.logo {
		width: 42px;
		height: 42px;
	}

	h1 {
		font-family: var(--font-heading);
		font-size: 21px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #1e1b4b;
		margin: 0;
	}

	.sub {
		margin: 2px 0 0;
		font-size: 10.5px;
		color: #64748b;
	}

	.url {
		color: #6366f1;
		font-weight: 600;
	}

	.columns {
		column-count: 2;
		column-gap: 7mm;
		/* auto, not balance: Chromium's balancing pass across page
		   fragments pushes the whole multicol box past page 1 once the
		   content grows — auto fills sequentially and fragments cleanly */
		column-fill: auto;
	}

	/* Categories may split across columns/pages — with the detail text the
	   big ones are taller than a full column, and break-inside: avoid on a
	   too-tall first category blanks page 1 entirely. Each command (li)
	   stays whole, and headings stick to their first command. */
	.category {
		margin-bottom: 11px;
	}

	h2 {
		font-family: var(--font-heading);
		font-size: 12.5px;
		font-weight: 700;
		color: #4338ca;
		margin: 0 0 5px;
		padding: 2px 0 2px 8px;
		border-left: 3px solid #818cf8;
		background: #eef2ff;
		border-radius: 0 4px 4px 0;
		break-after: avoid;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		margin-bottom: 6px;
		break-inside: avoid;
	}

	code {
		display: block;
		font-family: var(--font-mono);
		font-size: 9.5px;
		line-height: 1.45;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		padding: 2.5px 6px;
		color: #334155;
	}

	li p {
		margin: 1.5px 0 0 2px;
		font-size: 8.75px;
		line-height: 1.4;
		color: #64748b;
	}

	li p.detail {
		font-size: 8px;
		color: #94a3b8;
	}

	/* Token colors tuned for white paper (the app's dark-theme tok-* colors
	   are too pale for print) */
	.sheet :global(.tok-git) {
		color: #db2777;
		font-weight: 600;
	}
	.sheet :global(.tok-subcommand),
	.sheet :global(.tok-command) {
		color: #4f46e5;
		font-weight: 600;
	}
	.sheet :global(.tok-flag) {
		color: #0e7490;
	}
	.sheet :global(.tok-string) {
		color: #047857;
	}
	.sheet :global(.tok-placeholder) {
		color: #b45309;
		font-style: italic;
	}
	.sheet :global(.tok-hash) {
		color: #b45309;
	}
	.sheet :global(.tok-arg) {
		color: #334155;
	}
	.sheet :global(.tok-comment) {
		color: #94a3b8;
	}
</style>
