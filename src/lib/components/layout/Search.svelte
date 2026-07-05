<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { searchEntries, type SearchEntry } from '$lib/data/search-index';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';

	let {
		onNavigate
	}: {
		onNavigate?: (id: string) => void;
	} = $props();

	let query = $state('');
	let isOpen = $state(false);
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state(undefined);
	let containerEl: HTMLDivElement | undefined = $state(undefined);

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
	<div class="search-input-wrapper">
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
			autocomplete="off"
			spellcheck="false"
		/>
		{#if query}
			<button class="clear-btn" onclick={close} aria-label="Clear search">
				<X size={14} />
			</button>
		{:else}
			<kbd class="shortcut-hint hidden sm:inline">⌘K</kbd>
		{/if}
	</div>

	{#if isVisible}
		<div class="search-dropdown" role="listbox">
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

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 0 10px;
		height: 32px;
		width: 100%;
		max-width: 260px;
		transition: all 0.2s ease;
	}

	.search-input-wrapper:focus-within {
		max-width: 320px;
		background: var(--color-bg-tertiary);
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
			left: 0;
			right: auto;
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
