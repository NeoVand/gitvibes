<script lang="ts">
	import { asset } from '$app/paths';

	// The pre-generated PDF (scripts/make-cheatsheet-pdf.mjs) shipped in static/
	const pdfHref = asset('/gitvibes-cheatsheet.pdf');
	import { autohideScroll } from '$lib/actions/autohide-scroll';
	import {
		X,
		Search,
		ChevronRight,
		Settings,
		GitCommitHorizontal,
		GitBranch,
		Cloud,
		Archive,
		Undo2,
		History,
		GitPullRequest,
		Tag,
		Wrench,
		Check,
		Copy,
		Maximize2,
		Download
	} from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		cheatSheet,
		type CheatSheetCategory,
		type CheatSheetCommand
	} from '$lib/data/cheat-sheet';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';

	let { open = false, onToggle }: { open: boolean; onToggle: () => void } = $props();

	let searchQuery = $state('');
	let expandedCategories = new SvelteSet<string>(cheatSheet.map((c) => c.label));
	let copiedCommand = $state<string | null>(null);
	let modalOpen = $state(false);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && modalOpen) {
			event.stopPropagation();
			modalOpen = false;
		}
	}

	// `autofocus` is ignored on dynamically inserted elements; the modal
	// exists to browse commands, so search is its entry point.
	function focusOnMount(node: HTMLElement) {
		node.focus();
	}

	// Map icon string names to lucide components
	const iconMap: Record<string, typeof Settings> = {
		settings: Settings,
		'git-commit-horizontal': GitCommitHorizontal,
		'git-branch': GitBranch,
		cloud: Cloud,
		archive: Archive,
		'undo-2': Undo2,
		history: History,
		'git-pull-request': GitPullRequest,
		tag: Tag,
		wrench: Wrench
	};

	let filteredCategories = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return cheatSheet;

		const result: CheatSheetCategory[] = [];
		for (const category of cheatSheet) {
			const matchingCommands = category.commands.filter(
				(cmd) =>
					cmd.command.toLowerCase().includes(query) ||
					cmd.description.toLowerCase().includes(query) ||
					cmd.detail?.toLowerCase().includes(query)
			);
			if (matchingCommands.length > 0) {
				result.push({ ...category, commands: matchingCommands });
			}
		}
		return result;
	});

	function toggleCategory(label: string) {
		if (expandedCategories.has(label)) expandedCategories.delete(label);
		else expandedCategories.add(label);
	}

	async function copyCommand(command: string) {
		try {
			await navigator.clipboard.writeText(command);
			copiedCommand = command;
			setTimeout(() => {
				copiedCommand = null;
			}, 1500);
		} catch {
			// Clipboard API not available
		}
	}

	// When searching, expand all categories that have results
	$effect(() => {
		if (searchQuery.trim()) {
			expandedCategories.clear();
			for (const category of filteredCategories) expandedCategories.add(category.label);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet commandRow(cmd: CheatSheetCommand, showDetail: boolean = false)}
	{@const isCopied = copiedCommand === cmd.command}
	<!-- The copy affordance overlays on hover instead of reserving a column —
	     in the 336px panel that width is the difference between commands
	     fitting on one line and wrapping -->
	<button
		onclick={() => copyCommand(cmd.command)}
		class="group relative block w-full cursor-pointer rounded-md px-1.5 py-[6px] text-left transition-colors"
		style="background: transparent;"
		title="Click to copy"
	>
		<code
			class="block w-fit max-w-full rounded px-1 py-0.5 text-[11px] leading-relaxed break-all"
			style="background: var(--color-code-bg); color: var(--color-code-text); font-family: var(--font-mono);"
			>{#each tokenizeGitCommand(cmd.command) as token, ti (ti)}<span class="tok tok-{token.type}"
					>{token.text}</span
				>{/each}</code
		>
		<span
			class="absolute top-[7px] right-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
			style="color: {isCopied
				? 'var(--color-tip)'
				: 'var(--color-text-muted)'}; background: var(--color-bg-secondary);"
		>
			{#if isCopied}
				<Check size={11} />
			{:else}
				<Copy size={11} />
			{/if}
		</span>
		<p class="mt-0.5 text-[11px] leading-snug" style="color: var(--color-text-muted);">
			{cmd.description}
		</p>
		{#if showDetail && cmd.detail}
			<p
				class="mt-1 text-[11px] leading-relaxed"
				style="color: color-mix(in srgb, var(--color-text-muted) 78%, transparent);"
			>
				{cmd.detail}
			</p>
		{/if}
		{#if isCopied}
			<span class="mt-0.5 inline-block text-[10px] font-medium" style="color: var(--color-tip);">
				Copied!
			</span>
		{/if}
	</button>
{/snippet}

<!-- Backdrop on mobile -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
		onclick={onToggle}
		aria-label="Close cheat sheet"
	></button>
{/if}

<!-- Right-side sliding panel -->
<aside
	data-fabric
	class="cheat-panel fixed top-0 right-0 bottom-0 z-40 flex w-84 flex-col border-l transition-transform duration-200 ease-out"
	style="padding-top: var(--header-height); border-color: var(--color-border);"
	class:translate-x-0={open}
	class:translate-x-full={!open}
>
	<!-- Header -->
	<div
		class="flex items-center justify-between border-b px-4 py-3"
		style="border-color: var(--color-border);"
	>
		<span
			class="text-xs font-semibold tracking-wider uppercase"
			style="color: var(--color-text-muted); letter-spacing: 0.08em;"
		>
			Git Cheat Sheet
		</span>
		<div class="flex items-center gap-0.5">
			<a
				href={pdfHref}
				download="gitvibes-cheatsheet.pdf"
				class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
				style="color: var(--color-text-muted);"
				aria-label="Download as PDF"
				title="Download as PDF"
			>
				<Download size={14} />
			</a>
			<button
				onclick={() => (modalOpen = true)}
				class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
				style="color: var(--color-text-muted);"
				aria-label="Expand cheat sheet"
				title="Expand"
			>
				<Maximize2 size={13} />
			</button>
			<button
				onclick={onToggle}
				class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
				style="color: var(--color-text-muted);"
				aria-label="Close cheat sheet"
			>
				<X size={15} />
			</button>
		</div>
	</div>

	<!-- Search -->
	<div
		class="flex items-center gap-2 px-4 py-2.5"
		style="background: color-mix(in srgb, var(--color-bg-tertiary) 55%, transparent);"
	>
		<Search size={13} style="color: var(--color-text-muted); flex-shrink: 0;" />
		<input
			type="text"
			placeholder="Filter commands..."
			bind:value={searchQuery}
			class="w-full border-none bg-transparent text-xs shadow-none outline-none focus:border-none focus:shadow-none focus:ring-0 focus:outline-none"
			style="color: var(--color-text); font-family: var(--font-sans);"
		/>
	</div>

	<!-- Scrollable command list -->
	<div class="flex-1 overflow-y-auto px-2 py-2.5" use:autohideScroll>
		{#each filteredCategories as category (category.label)}
			{@const IconComponent = iconMap[category.icon]}
			{@const isExpanded = expandedCategories.has(category.label)}
			<div class="mb-1">
				<!-- Category header -->
				<button
					onclick={() => toggleCategory(category.label)}
					class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] font-semibold transition-colors"
					style="color: var(--color-text-secondary);"
				>
					{#if IconComponent}
						<IconComponent size={14} strokeWidth={2} />
					{/if}
					<span class="flex-1">{category.label}</span>
					<span class="text-[10px] font-normal" style="color: var(--color-text-muted);">
						{category.commands.length}
					</span>
					<ChevronRight
						size={12}
						class="transition-transform duration-150"
						style="transform: rotate({isExpanded ? '90deg' : '0deg'}); opacity: 0.5;"
					/>
				</button>

				<!-- Commands: no guide line, minimal indent — the 320px panel
				     needs every pixel to keep commands on one line -->
				{#if isExpanded}
					<div class="mt-0.5 ml-1 space-y-px">
						{#each category.commands as cmd (cmd.command)}
							{@render commandRow(cmd)}
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#if filteredCategories.length === 0}
			<div class="px-2 py-8 text-center">
				<p class="text-xs" style="color: var(--color-text-muted);">
					No commands match your search.
				</p>
			</div>
		{/if}
	</div>
</aside>

<!-- ───── EXPANDED MODAL ───── -->
{#if modalOpen}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
		<button
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={() => (modalOpen = false)}
			aria-label="Close expanded cheat sheet"
		></button>
		<div
			class="cheat-modal relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
			style="border-color: var(--color-border);"
			role="dialog"
			aria-modal="true"
			aria-label="Git cheat sheet"
		>
			<div
				class="flex shrink-0 items-center justify-between border-b px-5 py-3"
				style="border-color: var(--color-border);"
			>
				<span
					class="text-xs font-semibold tracking-wider uppercase"
					style="color: var(--color-text-muted); letter-spacing: 0.08em;"
				>
					Git Cheat Sheet
				</span>
				<div class="flex items-center gap-1">
					<a
						href={pdfHref}
						download="gitvibes-cheatsheet.pdf"
						class="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors hover:opacity-80"
						style="color: var(--color-text-secondary); border-color: var(--color-border);"
						aria-label="Download as PDF"
					>
						<Download size={12} />
						PDF
					</a>
					<button
						onclick={() => (modalOpen = false)}
						class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
						style="color: var(--color-text-muted);"
						aria-label="Close expanded cheat sheet"
					>
						<X size={15} />
					</button>
				</div>
			</div>

			<div
				class="flex shrink-0 items-center gap-2 border-b px-5 py-2.5"
				style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-bg-tertiary) 55%, transparent);"
			>
				<Search size={13} style="color: var(--color-text-muted); flex-shrink: 0;" />
				<input
					type="text"
					placeholder="Filter commands..."
					bind:value={searchQuery}
					use:focusOnMount
					class="w-full border-none bg-transparent text-xs shadow-none outline-none focus:border-none focus:shadow-none focus:ring-0 focus:outline-none"
					style="color: var(--color-text); font-family: var(--font-sans);"
				/>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4" use:autohideScroll>
				<div class="cheat-modal-columns">
					{#each filteredCategories as category (category.label)}
						{@const IconComponent = iconMap[category.icon]}
						<section class="cheat-modal-category mb-4">
							<h3
								class="mb-1.5 flex items-center gap-2 px-1 pb-1.5 text-[13px] font-semibold"
								style="color: var(--color-text); border-bottom: 1px solid var(--color-border);"
							>
								{#if IconComponent}
									<IconComponent size={14} strokeWidth={2} />
								{/if}
								<span class="flex-1">{category.label}</span>
								<span class="text-[10px] font-normal" style="color: var(--color-text-muted);">
									{category.commands.length}
								</span>
							</h3>
							{#each category.commands as cmd (cmd.command)}
								{@render commandRow(cmd, true)}
							{/each}
						</section>
					{/each}
				</div>

				{#if filteredCategories.length === 0}
					<div class="px-2 py-8 text-center">
						<p class="text-xs" style="color: var(--color-text-muted);">
							No commands match your search.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Frosted glass, matching the header and sidebar */
	.cheat-panel {
		background: color-mix(in srgb, var(--color-bg-secondary) 62%, transparent);
		backdrop-filter: blur(24px) saturate(1.4);
		-webkit-backdrop-filter: blur(24px) saturate(1.4);
	}

	.cheat-modal {
		background: color-mix(in srgb, var(--color-bg-secondary) 78%, transparent);
		backdrop-filter: blur(28px) saturate(1.5);
		-webkit-backdrop-filter: blur(28px) saturate(1.5);
	}

	/* Categories flow through balanced columns; each stays whole */
	.cheat-modal-columns {
		column-count: 1;
		column-gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.cheat-modal-columns {
			column-count: 2;
		}
	}

	@media (min-width: 1024px) {
		.cheat-modal-columns {
			column-count: 3;
		}
	}

	.cheat-modal-category {
		break-inside: avoid;
	}
</style>
