<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { searchEntries, type SearchEntry } from '$lib/data/search-index';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';
	import { searchHits } from '$lib/timeline/search-hits.svelte';

	let {
		onNavigate,
		onExpandedChange
	}: {
		onNavigate?: (id: string) => void;
		/**
		 * Fired when the box takes or loses focus, which is the same thing as it
		 * expanding or collapsing — `:focus-within` is what drives the width.
		 *
		 * The header needs this as a fact in JS, not only in CSS: while the box
		 * is open it suspends the Thread rail's minimum width, and that floor is
		 * declared on an ancestor of this component. Reaching it from here with
		 * `:has()` would mean poking a `:global` selector through the component
		 * boundary at exactly the layout rule that most needs to stay legible.
		 */
		onExpandedChange?: (expanded: boolean) => void;
	} = $props();

	let query = $state('');
	let isOpen = $state(false);
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state(undefined);
	let containerEl: HTMLDivElement | undefined = $state(undefined);
	let wrapperEl: HTMLDivElement | undefined = $state(undefined);

	const filtered = $derived.by(() => searchEntries(query));

	const isVisible = $derived(isOpen && query.trim().length > 0 && filtered.length > 0);

	function navigateTo(entry: SearchEntry) {
		if (onNavigate) {
			onNavigate(entry.sectionId);
		} else {
			const el = document.getElementById(entry.sectionId);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth' });
			}
		}
		close();
	}

	function close() {
		isOpen = false;
		query = '';
		selectedIndex = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isVisible) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % filtered.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filtered[selectedIndex]) {
				navigateTo(filtered[selectedIndex]);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
			inputEl?.blur();
		}
	}

	function handleInput() {
		isOpen = true;
		selectedIndex = 0;
	}

	function handleFocus() {
		if (query.trim()) {
			isOpen = true;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			close();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			inputEl?.focus();
		}
	}

	// Mirror the visible result set onto the Thread rail, which lights each
	// matching anchor. Keyed off `isVisible` rather than off `filtered`, so the
	// rail's points and the dropdown are the same statement: close the dropdown,
	// clear the query, or press Escape, and the points go out with it.
	$effect(() => {
		if (isVisible) searchHits.set(filtered.map((e) => e.sectionId));
		else searchHits.clear();
	});

	// The rune module outlives this component, so hand the rail a clean slate on
	// unmount rather than leaving the last query's points burning on the rail.
	$effect(() => {
		return () => searchHits.clear();
	});

	/* In compact mode the box is a 32px magnifier and the input inside it has no
	   width to be clicked. Focusing from the wrapper is what turns the whole
	   icon into the "open the search" target — and because the box expands on
	   :focus-within, focusing IS opening. One state, not two: there is no
	   separate "expanded" flag that could disagree with where focus actually
	   is, and Escape/blur closes it by the path that already existed.

	   Registered here rather than as an onclick attribute so the wrapper stays
	   a plain div: the input is the interactive element, and this is only an
	   enlarged hit area for it. */
	$effect(() => {
		const el = wrapperEl;
		if (!el) return;
		const focusInput = () => inputEl?.focus();
		el.addEventListener('click', focusInput);
		return () => el.removeEventListener('click', focusInput);
	});

	/* Report expansion from focusin/focusout on the WRAPPER rather than from the
	   input's own focus handlers: the clear button lives inside the box too, and
	   clicking it must not read as the box collapsing. focusout fires before the
	   new focus target is settled, so `relatedTarget` is what distinguishes
	   "moved to the clear button" from "left the box entirely". */
	$effect(() => {
		const el = wrapperEl;
		if (!el) return;
		const onIn = () => onExpandedChange?.(true);
		const onOut = (e: FocusEvent) => {
			if (!el.contains(e.relatedTarget as Node | null)) onExpandedChange?.(false);
		};
		el.addEventListener('focusin', onIn);
		el.addEventListener('focusout', onOut);
		return () => {
			el.removeEventListener('focusin', onIn);
			el.removeEventListener('focusout', onOut);
			onExpandedChange?.(false);
		};
	});

	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleGlobalKeydown);
		};
	});
</script>

<div class="search-container" bind:this={containerEl}>
	<div class="search-box">
		<div class="search-input-wrapper" bind:this={wrapperEl}>
			<Search size={15} class="search-icon" />
			<input
				bind:this={inputEl}
				bind:value={query}
				oninput={handleInput}
				onfocus={handleFocus}
				onkeydown={handleKeydown}
				type="text"
				placeholder="Search commands..."
				class="search-input"
				aria-label="Search commands"
				autocomplete="off"
				spellcheck="false"
			/>
			{#if query}
				<button class="clear-btn" onclick={close} aria-label="Clear search">
					<X size={14} />
				</button>
			{:else}
				<kbd class="shortcut-hint">⌘K</kbd>
			{/if}
		</div>
	</div>

	{#if isVisible}
		<div class="search-dropdown" role="listbox" aria-label="Search results">
			{#each filtered as entry, i (entry.id)}
				<button
					class="search-result"
					class:selected={i === selectedIndex}
					role="option"
					aria-selected={i === selectedIndex}
					onclick={() => navigateTo(entry)}
					onmouseenter={() => (selectedIndex = i)}
				>
					<div class="result-main">
						{#if entry.command}
							<span class="result-command"
								>{#each tokenizeGitCommand(entry.command) as token, ti (ti)}<span
										class="tok tok-{token.type}">{token.text}</span
									>{/each}</span
							>
						{:else}
							<span class="result-title">{entry.title}</span>
						{/if}
						<span class="result-description">{entry.description}</span>
					</div>
					<span class="result-part">{entry.part}</span>
				</button>
			{/each}
		</div>
	{:else if isOpen && query.trim().length > 0}
		<div class="search-dropdown search-empty" role="status">
			<p>No commands match “{query.trim()}”</p>
		</div>
	{/if}
</div>

<style>
	.search-container {
		position: relative;
	}

	/* Every width change here comes straight out of the flex-1 cell beside it —
	   which is where the Thread rail lives. That is deliberate: the rail is
	   meant to run all the way up to the search box and yield when it opens.
	   The only obligation is to make the change an ANIMATION rather than a
	   step — a snapped width would re-lay-out the rail's 100+ marks in a
	   single frame and read as the rail jumping. */

	/* ── COMPACT is the default; the full box is what gets added back ────────
	   Below 1120px the box is its own magnifier and nothing else, because the
	   resting search field is the single largest thing the header can hand
	   back to the Thread rail (see the ladder in Header.svelte). Clicking it
	   focuses the input, :focus-within widens the box, and the rail — the
	   flex-1 cell to its LEFT — gives up exactly that many pixels.

	   `justify-content: flex-end` is what makes the growth happen leftward:
	   the box is pinned to its right edge and every pixel it gains is taken
	   from the rail rather than from the controls beside it. */
	.search-box {
		display: flex;
		justify-content: flex-end;
		width: 32px;
		max-width: 32px;
		transition:
			width 200ms ease,
			max-width 200ms ease;
	}

	.search-box:focus-within {
		width: 240px;
		max-width: 240px;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 0;
		height: 32px;
		width: 100%;
		cursor: text;
		overflow: hidden;
		transition:
			gap 200ms ease,
			padding 200ms ease,
			background 200ms ease;
	}

	.search-input-wrapper:focus-within {
		justify-content: flex-start;
		gap: 6px;
		padding: 0 10px;
		background: var(--color-bg-tertiary);
	}

	/* Collapsed, the field has no width to show and no room for the hint. They
	   are not `display: none` — the input must stay focusable, and staying in
	   the layout at zero width is what lets it animate open rather than pop. */
	.search-box:not(:focus-within) .search-input {
		width: 0;
		flex: 0 0 0;
	}

	.search-box:not(:focus-within) .shortcut-hint {
		display: none;
	}

	/* ── the full resting box, where the rail can spare it ────────────────── */
	@media (min-width: 1120px) {
		/* 240px at rest: enough for the full placeholder at 13px without an
		   ellipsis. Focus still opens to 320px and takes those pixels from the
		   rail leftward, so the widest field is one click away whenever it is
		   actually being used. */
		.search-box {
			width: 240px;
			max-width: 240px;
		}

		.search-box:focus-within {
			width: 320px;
			max-width: 320px;
		}

		.search-input-wrapper {
			justify-content: flex-start;
			gap: 6px;
			padding: 0 10px;
		}

		.search-box:not(:focus-within) .search-input {
			width: auto;
			flex: 1;
		}

		.search-box:not(:focus-within) .shortcut-hint {
			display: inline;
		}
	}

	/* The width change moves the rail beside it, so it is real motion on a
	   large surface, not just a box growing. Drop it for readers who asked for
	   less; the rail's own animations are already gated the same way. */
	@media (prefers-reduced-motion: reduce) {
		.search-box,
		.search-input-wrapper {
			transition-duration: 1ms;
		}
	}

	.search-input-wrapper :global(.search-icon) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--color-text);
		font-family: var(--font-sans);
		font-size: 13px;
		outline: none;
		box-shadow: none;
		padding: 0;
		min-width: 0;
	}

	.search-input:focus {
		outline: none;
		box-shadow: none;
		border: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.clear-btn:hover {
		color: var(--color-text);
		background: var(--color-bg-tertiary);
	}

	.shortcut-hint {
		font-family: var(--font-sans);
		font-size: 10px;
		color: var(--color-text-muted);
		background: transparent;
		border: none;
		border-radius: 4px;
		padding: 1px 4px;
		line-height: 1.4;
		flex-shrink: 0;
		opacity: 0.6;
	}

	.search-dropdown {
		position: fixed;
		top: var(--header-height);
		left: 0.5rem;
		right: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		z-index: 100;
		padding: 4px;
	}

	@media (min-width: 640px) {
		.search-dropdown {
			position: absolute;
			top: calc(100% + 6px);
			left: auto;
			right: 0;
			min-width: 360px;
		}
	}

	.search-empty {
		padding: 12px 14px;
	}

	.search-empty p {
		margin: 0;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.search-result {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 6px;
		text-align: left;
		transition: background 0.1s ease;
	}

	@media (min-width: 640px) {
		.search-result {
			gap: 10px;
			padding: 8px 10px;
		}
	}

	.search-result:hover,
	.search-result.selected {
		background: var(--color-primary-dim);
	}

	.result-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.result-command,
	.result-title {
		font-size: 11px;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 640px) {
		.result-command,
		.result-title {
			font-size: 12px;
		}
	}

	.result-command {
		font-family: var(--font-mono);
	}

	.result-command::before {
		content: '$ ';
		color: var(--color-terminal-prompt);
		opacity: 0.75;
	}

	.result-title {
		font-family: var(--font-sans);
	}

	.search-result.selected .result-title {
		color: var(--color-primary-text);
	}

	.result-description {
		font-size: 10px;
		line-height: 1.3;
		color: var(--color-text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@media (min-width: 640px) {
		.result-description {
			font-size: 11px;
			line-height: 1.35;
		}
	}

	.result-part {
		font-size: 9px;
		color: var(--color-text-muted);
		white-space: nowrap;
		flex-shrink: 0;
		padding-top: 2px;
	}

	@media (min-width: 640px) {
		.result-part {
			font-size: 10px;
		}
	}
</style>
