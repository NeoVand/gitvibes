<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { searchIndex, type SearchEntry } from '$lib/data/search-index';

	let query = $state('');
	let isOpen = $state(false);
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state(undefined);
	let containerEl: HTMLDivElement | undefined = $state(undefined);

	const filtered = $derived.by(() => {
		if (!query.trim()) return [];
		const q = query.toLowerCase().trim();
		return searchIndex
			.filter((entry) => {
				const haystack = `${entry.title} ${entry.keywords.join(' ')}`.toLowerCase();
				return haystack.includes(q);
			})
			.slice(0, 8);
	});

	const isVisible = $derived(isOpen && filtered.length > 0);

	function getFirstMatchingKeyword(entry: SearchEntry, q: string): string | null {
		const lower = q.toLowerCase().trim();
		if (!lower) return null;
		return entry.keywords.find((kw) => kw.toLowerCase().includes(lower)) ?? null;
	}

	function navigateTo(entry: SearchEntry) {
		const el = document.getElementById(entry.id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
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
			<kbd class="shortcut-hint">⌘K</kbd>
		{/if}
	</div>

	{#if isVisible}
		<div class="search-dropdown" role="listbox">
			{#each filtered as entry, i (entry.id)}
				{@const matchedKeyword = getFirstMatchingKeyword(entry, query)}
				<button
					class="search-result"
					class:selected={i === selectedIndex}
					role="option"
					aria-selected={i === selectedIndex}
					onclick={() => navigateTo(entry)}
					onmouseenter={() => (selectedIndex = i)}
				>
					<span class="result-title">{entry.title}</span>
					<span class="result-part">{entry.part}</span>
					{#if matchedKeyword}
						<span class="result-keyword">{matchedKeyword}</span>
					{/if}
				</button>
			{/each}
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
		width: 260px;
		transition: all 0.2s ease;
	}

	.search-input-wrapper:focus-within {
		width: 320px;
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
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		min-width: 320px;
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

	.search-result {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 6px;
		text-align: left;
		transition: background 0.1s ease;
	}

	.search-result:hover,
	.search-result.selected {
		background: var(--color-primary-dim);
	}

	.result-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
	}

	.search-result.selected .result-title {
		color: var(--color-primary-text);
	}

	.result-part {
		font-size: 11px;
		color: var(--color-text-muted);
		white-space: nowrap;
		margin-left: auto;
	}

	.result-keyword {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-primary-text);
		background: var(--color-primary-dim);
		padding: 1px 6px;
		border-radius: 4px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.search-result.selected .result-keyword {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
	}
</style>
