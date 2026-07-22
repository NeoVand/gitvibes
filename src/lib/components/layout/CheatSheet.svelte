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
		Gamepad2,
		ListFilter,
		Puzzle,
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
		cheatSheetLegend,
		type CheatSheetCategory,
		type CheatSheetCommand
	} from '$lib/data/cheat-sheet';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';
	import { readingContext } from '$lib/ai/reading-context.svelte';

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

	/* ── exercise focus ──────────────────────────────────────────────────
	   When the learner is AT a playground or challenge — the scroll-spy
	   anchor resolves to one, or the panel opened on one — the sheet can
	   narrow itself to the commands that exercise actually reaches for.
	   The ListFilter toggle in the toolbar turns it off and on, and stays in
	   the toolbar even when there is nothing to focus on, disabled.

	   The exercise registries include the nine challenge modules, which the
	   rest of the page keeps out of the entry bundle on purpose (the seeds
	   and checks drag the whole engine along). The sheet honors that: the
	   mapping loads on the panel's first open, never at page load. */
	let focusEnabled = $state(true);
	let focusApi = $state<typeof import('$lib/playground/exercise-commands') | null>(null);

	$effect(() => {
		if (open && !focusApi) {
			import('$lib/playground/exercise-commands').then((module) => {
				focusApi = module;
			});
		}
	});

	const exercise = $derived(
		focusApi?.exerciseFocusOf(readingContext.scenarioId ?? readingContext.sectionId) ?? null
	);

	/** The sheet narrowed to the exercise's commands — null when that would
	 *  leave nothing to show (an exercise whose commands the sheet lacks). */
	const focusedCategories = $derived.by(() => {
		if (!exercise || !focusApi) return null;
		const { rowUsesWords } = focusApi;
		const result: CheatSheetCategory[] = [];
		for (const category of cheatSheet) {
			const commands = category.commands.filter((cmd) => rowUsesWords(cmd.command, exercise.words));
			if (commands.length > 0) result.push({ ...category, commands });
		}
		return result.length > 0 ? result : null;
	});

	const focusActive = $derived(focusEnabled && focusedCategories !== null);
	const focusAccent = $derived(
		exercise?.kind === 'challenge' ? 'var(--color-challenge)' : 'var(--color-important)'
	);
	const FocusIcon = $derived(exercise?.kind === 'challenge' ? Puzzle : Gamepad2);

	let filteredCategories = $derived.by(() => {
		const base = focusActive && focusedCategories ? focusedCategories : cheatSheet;
		const query = searchQuery.toLowerCase().trim();
		if (!query) return base;

		const result: CheatSheetCategory[] = [];
		for (const category of base) {
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

	// A focused sheet is short; a collapsed category inside it hides half of
	// an already-small kit. Expand what the focus surfaces (never collapse).
	$effect(() => {
		if (focusActive && focusedCategories) {
			for (const category of focusedCategories) expandedCategories.add(category.label);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet focusToggle()}
	<!-- Always present, so the control is somewhere you can learn rather than
	     something that appears and vanishes as you scroll. It reports three
	     states: filtering, not filtering, and nothing nearby to filter by —
	     the last one disabled, because a reader who cannot find the button
	     assumes the feature is broken, while a greyed one explains itself. -->
	{@const canFocus = Boolean(exercise && focusedCategories)}
	<button
		onclick={() => (focusEnabled = !focusEnabled)}
		disabled={!canFocus}
		class="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
		class:cursor-pointer={canFocus}
		style="color: {focusActive ? focusAccent : 'var(--color-text-muted)'}; background: {focusActive
			? `color-mix(in srgb, ${focusAccent} 14%, transparent)`
			: 'transparent'}; opacity: {canFocus ? 1 : 0.35};"
		aria-pressed={focusActive}
		aria-label="Show only this exercise's commands"
		title={!canFocus
			? 'Scroll to a playground or a challenge to filter by it'
			: focusActive
				? 'Showing this exercise’s commands — click for all'
				: 'Show only this exercise’s commands'}
	>
		<ListFilter size={14} />
	</button>
{/snippet}

{#snippet focusStrip()}
	<!-- Names what the filter is doing, so a suddenly-short list reads as a
	     feature rather than as missing content. -->
	{#if focusActive && exercise}
		<div
			class="flex items-center gap-2 px-4 py-1.5"
			style="background: color-mix(in srgb, {focusAccent} 7%, transparent);"
		>
			<FocusIcon size={12} style="color: {focusAccent}; flex-shrink: 0;" />
			<p class="min-w-0 truncate text-[11px]" style="color: var(--color-text-secondary);">
				Commands for <strong style="font-weight: 600;">{exercise.title}</strong>
			</p>
		</div>
	{/if}
{/snippet}

{#snippet chipText(text: string)}
	<!-- Command mentions sit in `backticks`; render those segments as the same
	     syntax-highlighted chips the command column wears. -->
	{#each text.split('`') as seg, si (si)}{#if si % 2 === 1}<code class="cs-ic"
				>{#each tokenizeGitCommand(seg) as token, ti (ti)}<span class="tok tok-{token.type}"
						>{token.text}</span
					>{/each}</code
			>{:else}{seg}{/if}{/each}
{/snippet}

{#snippet legend()}
	<!-- Placeholder key. Sits above the list rather than inside a category:
	     it explains how to read every row, so it must be seen before them. -->
	<div
		class="mb-2 rounded-md border px-2.5 py-2"
		style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-bg-tertiary) 45%, transparent);"
	>
		<p class="text-[11px] leading-snug" style="color: var(--color-text-secondary);">
			{cheatSheetLegend.lead}
		</p>
		<ul class="mt-1.5 space-y-1">
			{#each cheatSheetLegend.entries as entry (entry.notation)}
				<li class="text-[11px] leading-snug" style="color: var(--color-text-muted);">
					<code
						class="rounded px-1 py-0.5 text-[10px]"
						style="background: var(--color-code-bg); color: var(--color-code-text); font-family: var(--font-mono);"
						>{entry.notation}</code
					>
					{@render chipText(entry.meaning)}
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet commandRow(cmd: CheatSheetCommand, showDetail: boolean = false)}
	{@const isCopied = copiedCommand === cmd.command}
	<!-- The copy affordance overlays on hover instead of reserving a column —
	     the panel is sized so the longest command JUST fits on one line, and
	     a reserved column would push it into wrapping -->
	<button
		onclick={() => copyCommand(cmd.command)}
		class="group relative block w-full cursor-pointer rounded-md px-1.5 py-[6px] text-left transition-colors"
		style="background: transparent;"
		title="Click to copy"
	>
		<code
			class="cs-cmd block w-fit max-w-full rounded px-1 py-0.5 text-[11px] leading-relaxed"
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
			{@render chipText(cmd.description)}
		</p>
		{#if showDetail && cmd.detail}
			<p
				class="mt-1 text-[11px] leading-relaxed"
				style="color: color-mix(in srgb, var(--color-text-muted) 78%, transparent);"
			>
				{@render chipText(cmd.detail)}
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
	class="cheat-panel fixed top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l transition-transform duration-200 ease-out sm:w-[var(--cheatsheet-width)]"
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
			{@render focusToggle()}
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

	{@render focusStrip()}

	<!-- Scrollable command list. The legend rests while the sheet is focused
	     on an exercise: a learner mid-exercise is copying commands, not
	     decoding notation, and the short list should read at a glance. -->
	<div class="cheat-list flex-1 overflow-y-auto px-2 py-2.5" use:autohideScroll>
		{#if filteredCategories.length > 0 && !focusActive}
			{@render legend()}
		{/if}
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

				<!-- Commands: no guide line, minimal indent — the panel needs
				     every pixel to keep commands on one line -->
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
					{@render focusToggle()}
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

			{@render focusStrip()}

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4" use:autohideScroll>
				{#if filteredCategories.length > 0 && !focusActive}
					{@render legend()}
				{/if}
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
	/* Reserve the scrollbar's gutter whether or not the platform draws one
	   inside the box. Without this the list is ~15px narrower on Linux and
	   Windows than on macOS, and a panel width chosen against overlay
	   scrollbars wraps its longest command everywhere else. */
	.cheat-list {
		scrollbar-gutter: stable;
	}

	/* The few longest commands wrap rather than widen the whole panel. Break at
	   spaces, never inside a flag or a path: `--force-with-lease` split across
	   two lines stops looking like one token, which is the only thing the row
	   is trying to teach. `anywhere` is the fallback for a single word that is
	   genuinely wider than the column. */
	.cs-cmd {
		overflow-wrap: anywhere;
		word-break: normal;
	}

	/* A command mentioned inside prose — narrower than a command-column chip,
	   so it sits in a sentence without breaking the line rhythm. */
	.cs-ic {
		font-family: var(--font-mono);
		font-size: 0.95em;
		background: var(--color-code-bg);
		border-radius: 0.2rem;
		padding: 0 0.25em;
	}

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
