<script lang="ts">
	import { onMount } from 'svelte';
	import {
		GitBranch,
		Terminal,
		RotateCcw,
		Lightbulb,
		ChevronRight,
		ChevronDown,
		X,
		CornerDownLeft
	} from 'lucide-svelte';
	import MermaidDiagram from '$lib/components/ui/MermaidDiagram.svelte';
	import { tokenizeGitCommand } from '$lib/data/git-syntax';
	import { GitEngine } from '$lib/playground/git-engine';
	import { runGitCommand } from '$lib/playground/commands';
	import { buildGitGraph } from '$lib/playground/git-graph';
	import {
		playgroundScenarios,
		getScenario,
		loadScenarioSeed,
		type PlaygroundScenario
	} from '$lib/playground/scenarios';

	interface HistoryLine {
		type: 'input' | 'output' | 'system';
		text: string;
		error?: boolean;
		colored?: boolean;
	}

	let {
		scenarioId = 'core-loop',
		embedded = false,
		panel = false,
		showScenarioPicker = !embedded,
		hideHeader = false,
		onClose,
		onResetReady,
		id = 'playground'
	}: {
		scenarioId?: string;
		embedded?: boolean;
		panel?: boolean;
		showScenarioPicker?: boolean;
		hideHeader?: boolean;
		onClose?: () => void;
		onResetReady?: (reset: () => void) => void;
		id?: string;
	} = $props();

	let graphCollapsed = $state(false);

	let activeScenarioId = $state(scenarioId);
	let engine = $state<GitEngine | null>(null);
	let history = $state<HistoryLine[]>([]);
	let input = $state('');
	let diagram = $state('gitGraph\n  commit id: "loading..."');
	let loading = $state(true);
	let historyIndex = $state(-1);
	let inputEl: HTMLInputElement | undefined = $state(undefined);
	let terminalEl: HTMLDivElement | undefined = $state(undefined);

	let scenario = $derived(getScenario(activeScenarioId));

	$effect(() => {
		if (scenarioId !== activeScenarioId && embedded) {
			activeScenarioId = scenarioId;
			loadScenario(getScenario(scenarioId));
		}
	});

	async function refreshDiagram() {
		if (!engine) return;
		diagram = await buildGitGraph(engine);
	}

	async function loadScenario(next: PlaygroundScenario) {
		loading = true;
		try {
			engine = new GitEngine(embedded ? `embedded-${id}` : 'gitvibes-playground');
			await loadScenarioSeed(engine, next);
			history = embedded
				? [
						{ type: 'system', text: next.description },
						{
							type: 'system',
							text: 'Type git commands below. Enter "help" for supported commands.'
						}
					]
				: panel
					? [
							{ type: 'system', text: next.description },
							{
								type: 'system',
								text: 'Type git commands below. Enter "help" for supported commands.'
							}
						]
					: [
							{ type: 'system', text: `Scenario: ${next.title}` },
							{ type: 'system', text: next.description },
							{
								type: 'system',
								text: 'Type git commands below. Enter "help" for supported commands.'
							}
						];
			await refreshDiagram();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			history = [{ type: 'output', text: `Failed to initialize repo: ${message}`, error: true }];
		} finally {
			loading = false;
			inputEl?.focus();
		}
	}

	onMount(() => {
		loadScenario(getScenario(activeScenarioId));
		onResetReady?.(resetScenario);
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const command = input.trim();
		if (!command) return;

		history = [...history, { type: 'input', text: command }];
		input = '';
		historyIndex = -1;

		if (!engine) {
			history = [
				...history,
				{
					type: 'output',
					text: 'Repository still initializing. Try again in a moment.',
					error: true
				}
			];
			return;
		}

		try {
			const result = await runGitCommand(engine, command);

			if (result.output === '__CLEAR__') {
				history = [];
			} else if (result.output) {
				history = [
					...history,
					{ type: 'output', text: result.output, error: result.error, colored: result.colored }
				];
			}

			await refreshDiagram();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			history = [...history, { type: 'output', text: `error: ${message}`, error: true }];
		}
		scrollTerminal();
	}

	function scrollTerminal() {
		requestAnimationFrame(() => {
			if (terminalEl) terminalEl.scrollTop = terminalEl.scrollHeight;
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			const inputs = history.filter((h) => h.type === 'input').map((h) => h.text);
			if (inputs.length === 0) return;
			historyIndex = Math.min(historyIndex + 1, inputs.length - 1);
			input = inputs[inputs.length - 1 - historyIndex] ?? '';
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (historyIndex <= 0) {
				historyIndex = -1;
				input = '';
				return;
			}
			historyIndex -= 1;
			const inputs = history.filter((h) => h.type === 'input').map((h) => h.text);
			input = inputs[inputs.length - 1 - historyIndex] ?? '';
		}
	}

	async function resetScenario() {
		await loadScenario(getScenario(activeScenarioId));
	}

	async function changeScenario(nextId: string) {
		activeScenarioId = nextId;
		await loadScenario(getScenario(nextId));
	}

	function runSuggested(command: string) {
		input = command;
		inputEl?.focus();
	}
</script>

{#snippet scenarioSelect()}
	{#if showScenarioPicker}
		<div class="pg-select-wrap">
			<select
				value={activeScenarioId}
				onchange={(e) => changeScenario(e.currentTarget.value)}
				class="pg-select"
				disabled={loading}
				aria-label="Scenario"
			>
				{#each playgroundScenarios as s (s.id)}
					<option value={s.id}>{s.title}</option>
				{/each}
			</select>
			<span class="pg-select-icon" aria-hidden="true">
				<ChevronDown size={12} />
			</span>
		</div>
	{/if}
{/snippet}

{#snippet commandLabel(command: string)}
	{#each tokenizeGitCommand(command) as token, ti (ti)}<span class="tok tok-{token.type}"
			>{token.text}</span
		>{/each}
{/snippet}

{#snippet terminalHistory()}
	{#each history as line, i (i)}
		{#if line.type === 'input'}
			<div class="mb-1.5 flex gap-2" style="font-family: var(--font-mono); font-size: 12.5px;">
				<span style="color: var(--color-terminal-prompt);">$</span>
				<span style="color: var(--color-terminal-command);">{@render commandLabel(line.text)}</span>
			</div>
		{:else if line.type === 'output'}
			{#if line.colored}
				<pre
					class="mb-2.5 pl-5 text-[11.5px] leading-relaxed whitespace-pre-wrap"
					style="font-family: var(--font-mono);">{@html line.text}</pre>
			{:else}
				<pre
					class="mb-2.5 pl-5 text-[11.5px] leading-relaxed whitespace-pre-wrap"
					style="color: {line.error
						? 'var(--color-warning)'
						: 'var(--color-terminal-output)'}; font-family: var(--font-mono);">{line.text}</pre>
			{/if}
		{:else}
			<p
				class="mb-1.5 text-[11.5px] italic"
				style="color: var(--color-text-muted); font-family: var(--font-mono);"
			>
				# {line.text}
			</p>
		{/if}
	{/each}
	{#if loading}
		<p class="text-xs" style="color: var(--color-text-muted); font-family: var(--font-mono);">
			Initializing repository...
		</p>
	{/if}
{/snippet}

{#snippet promptForm()}
	<form onsubmit={handleSubmit} class="pg-prompt-line">
		<span class="pg-prompt" aria-hidden="true">$</span>
		<input
			bind:this={inputEl}
			bind:value={input}
			onkeydown={handleKeydown}
			disabled={loading}
			placeholder="git status"
			class="pg-input"
			autocomplete="off"
			spellcheck="false"
			enterkeyhint="send"
			aria-label="Git command"
		/>
		<button
			type="submit"
			class="pg-return-hint"
			disabled={loading || !input.trim()}
			aria-label="Run command (Enter)"
		>
			<CornerDownLeft size={12} />
		</button>
	</form>
{/snippet}

{#snippet suggestedCommands()}
	<div class="flex flex-wrap gap-1.5">
		{#each scenario.suggestedCommands as command, i (i)}
			<button type="button" onclick={() => runSuggested(command)} class="pg-chip">
				{@render commandLabel(command)}
				<ChevronRight size={11} />
			</button>
		{/each}
	</div>
{/snippet}

{#if panel}
	<div class="pg-shell flex min-h-0 flex-1 flex-col overflow-hidden">
		<header
			class="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-3"
			style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border);"
		>
			<Terminal size={14} style="color: var(--color-important);" />
			<span class="text-sm font-semibold" style="color: var(--color-text);">Playground</span>
			<span class="pg-badge hidden sm:inline">real git</span>

			<div class="ml-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
				{@render scenarioSelect()}
				<button
					type="button"
					onclick={resetScenario}
					disabled={loading}
					class="pg-icon-btn"
					aria-label="Reset scenario"
				>
					<RotateCcw size={13} />
				</button>
				{#if onClose}
					<button type="button" onclick={onClose} class="pg-icon-btn" aria-label="Close playground">
						<X size={14} />
					</button>
				{/if}
			</div>
		</header>

		<p
			class="shrink-0 px-3 py-2 text-[11px] leading-snug sm:px-5 sm:py-2.5 sm:text-xs sm:leading-relaxed"
			style="color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary);"
		>
			{scenario.hint}
		</p>

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
			<section class="shrink-0" style="border-bottom: 1px solid var(--color-border);">
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-2 px-5 py-2"
					style="background: var(--color-bg-tertiary);"
					onclick={() => (graphCollapsed = !graphCollapsed)}
					aria-expanded={!graphCollapsed}
					aria-label="Toggle commit graph"
				>
					<GitBranch size={13} style="color: var(--color-important);" />
					<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
						Commit Graph
					</span>
					<ChevronDown
						size={12}
						class="ml-auto transition-transform duration-150"
						style="color: var(--color-text-muted); transform: rotate({graphCollapsed
							? '-90deg'
							: '0deg'});"
					/>
				</button>
				{#if !graphCollapsed}
					<div
						class="pg-graph-body flex items-center justify-center px-4 py-1"
						style="background: var(--color-bg-secondary);"
					>
						{#key diagram}
							<MermaidDiagram definition={diagram} id="{id}-graph" />
						{/key}
					</div>
				{/if}
			</section>

			<section class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div
					class="flex items-center gap-2 px-5 py-2"
					style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border);"
				>
					<Terminal size={13} style="color: var(--color-text-muted);" />
					<span class="text-xs font-medium" style="color: var(--color-text-secondary);">
						Terminal
					</span>
				</div>

				<div bind:this={terminalEl} class="pg-terminal min-h-0 flex-1 overflow-y-auto px-4 py-3">
					{@render terminalHistory()}
				</div>

				{@render promptForm()}
			</section>

			<section
				class="pg-suggestions shrink-0 px-4 py-2"
				style="border-top: 1px solid var(--color-border); background: var(--color-bg-tertiary);"
			>
				<p
					class="mb-1.5 text-[10px] font-semibold tracking-widest uppercase"
					style="color: var(--color-text-muted);"
				>
					Try these
				</p>
				{@render suggestedCommands()}
			</section>
		</div>
	</div>
{:else}
	<div class="overflow-hidden rounded-xl" style="background: var(--color-bg-secondary);">
		{#if !hideHeader}
			<div
				class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
				style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border);"
			>
				<div class="flex items-center gap-2">
					<GitBranch size={16} style="color: var(--color-important);" />
					<span class="text-sm font-semibold" style="color: var(--color-text);">
						{embedded ? 'Try it yourself' : 'Git Playground'}
					</span>
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-medium"
						style="background: color-mix(in srgb, var(--color-important) 12%, var(--color-bg-tertiary)); color: var(--color-important);"
					>
						real git
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{@render scenarioSelect()}
					<button
						type="button"
						onclick={resetScenario}
						disabled={loading}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
						style="color: var(--color-text-muted); border: 1px solid var(--color-border);"
					>
						<RotateCcw size={13} />
						Reset
					</button>
				</div>
			</div>
		{/if}

		<div
			class="flex items-start gap-2 px-5 py-2.5 text-xs"
			style="background: color-mix(in srgb, var(--color-important) 5%, var(--color-bg-secondary)); border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary);"
		>
			<Lightbulb size={14} class="mt-0.5 flex-shrink-0" style="color: var(--color-important);" />
			<span>{scenario.hint}</span>
		</div>

		<div
			class="grid grid-cols-1 lg:grid-cols-2"
			style="min-height: {embedded ? '340px' : '420px'};"
		>
			<div
				class="order-2 flex flex-col border-t lg:order-1 lg:border-t-0 lg:border-r"
				style="border-top-color: var(--color-playground-border); border-right-color: var(--color-border);"
			>
				<div
					class="flex items-center gap-2 px-4 py-2"
					style="background: var(--color-playground-bg);"
				>
					<Terminal size={13} style="color: var(--color-important);" />
					<span class="text-xs font-medium" style="color: var(--color-text-secondary);"
						>Terminal</span
					>
				</div>

				<div
					bind:this={terminalEl}
					class="pg-terminal flex-1 overflow-y-auto p-4"
					style="min-height: {embedded ? '220px' : '280px'}; max-height: {embedded
						? '300px'
						: '360px'};"
				>
					{@render terminalHistory()}
				</div>

				{@render promptForm()}
			</div>

			<div class="order-1 flex flex-col lg:order-2">
				<div class="flex items-center gap-2 px-4 py-2">
					<GitBranch size={13} style="color: var(--color-important);" />
					<span class="text-xs font-medium" style="color: var(--color-text-secondary);"
						>Commit Graph</span
					>
				</div>
				<div class="flex flex-1 items-center justify-center px-4 py-1">
					{#key diagram}
						<MermaidDiagram definition={diagram} id="{id}-graph" />
					{/key}
				</div>
			</div>
		</div>

		<div class="px-5 py-3" style="border-top: 1px solid var(--color-border);">
			<p class="mb-2 text-xs font-medium" style="color: var(--color-text-muted);">
				Try these commands
			</p>
			<div class="flex flex-wrap gap-2">
				{#each scenario.suggestedCommands as command, i (i)}
					<button
						type="button"
						onclick={() => runSuggested(command)}
						class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-opacity hover:opacity-80"
						style="background: var(--color-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border); font-family: var(--font-mono);"
					>
						{@render commandLabel(command)}
						<ChevronRight size={12} />
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.pg-shell {
		background: var(--color-bg-secondary);
	}

	.pg-badge {
		border-radius: 9999px;
		padding: 0.175rem 0.5rem;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-important);
		background: color-mix(in srgb, var(--color-important) 12%, var(--color-bg-tertiary));
	}

	.pg-select-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.pg-select {
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 0.4rem 1.75rem 0.4rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.3;
		color: var(--color-text);
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			box-shadow 0.15s ease;
	}

	.pg-select:hover:not(:disabled) {
		border-color: var(--color-important);
	}

	.pg-select:focus {
		outline: none;
		border-color: var(--color-important);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-important) 18%, transparent);
	}

	.pg-select:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pg-select-icon {
		position: absolute;
		right: 0.5rem;
		display: inline-flex;
		pointer-events: none;
		color: var(--color-text-muted);
		opacity: 0.7;
	}

	.pg-icon-btn {
		display: inline-flex;
		height: 1.875rem;
		width: 1.875rem;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			opacity 0.15s ease;
	}

	.pg-icon-btn:hover:not(:disabled) {
		border-color: var(--color-important);
		color: var(--color-important);
	}

	.pg-icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* The terminal always renders dark-terminal text colors: colored git
	   output and the global .tok-* syntax classes resolve through these
	   variables, so re-mapping them here restyles everything inside. In
	   dark mode these match the theme palette (with brighter muted text);
	   in light mode they make the dark terminal surface work. */
	.pg-terminal,
	.pg-prompt-line {
		--color-terminal-text: #cdd6f4;
		--color-terminal-prompt: #a6e3a1;
		--color-terminal-command: #f5f5f5;
		--color-terminal-output: #a6adc8;
		--color-text-muted: #7f7a9e;
		--color-text-secondary: #cdd6f4;
		--color-primary-text: #a5b4fc;
		--color-vibe-text: #c4b5fd;
		--color-warning: #fab387;
		--color-diff-add: #a6e3a1;
		--color-diff-add-bg: rgba(166, 227, 161, 0.1);
		--color-diff-del: #f38ba8;
		--color-diff-del-bg: rgba(243, 139, 168, 0.1);
		--color-diff-hunk: #89b4fa;
		--color-diff-hash: #f9e2af;
		--color-diff-meta: #a6e3a1;
	}

	/* The terminal surface is always a crisp near-black, in both themes,
	   so it reads as a real terminal against the playground chrome. */
	.pg-terminal {
		background: #0a0813;
		color: var(--color-terminal-text);
	}

	.pg-prompt-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--color-playground-border) 55%, transparent);
		background: #14101f;
	}

	.pg-prompt {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 16px;
		font-weight: 600;
		color: var(--color-terminal-prompt);
		user-select: none;
	}

	@media (min-width: 640px) {
		.pg-prompt {
			font-size: 12.5px;
		}
	}

	.pg-input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		box-shadow: none;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		font-family: var(--font-mono);
		font-size: 16px;
		line-height: 1.4;
		color: var(--color-terminal-command);
		caret-color: var(--color-terminal-prompt);
	}

	@media (min-width: 640px) {
		.pg-input {
			font-size: 12.5px;
		}
	}

	.pg-input::placeholder {
		color: color-mix(in srgb, var(--color-terminal-output) 55%, transparent);
	}

	.pg-input:focus {
		outline: none;
		box-shadow: none;
	}

	.pg-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pg-return-hint {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.45rem;
		border-radius: 0.3rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-terminal-output);
		opacity: 0.5;
		font-size: 10px;
		user-select: none;
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			border-color 0.15s ease;
	}

	.pg-return-hint:hover:not(:disabled) {
		opacity: 0.8;
		border-color: var(--color-terminal-prompt);
		color: var(--color-terminal-prompt);
	}

	.pg-return-hint:active:not(:disabled) {
		opacity: 1;
	}

	.pg-return-hint:disabled {
		opacity: 0.25;
		cursor: default;
	}

	.pg-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 0.3rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}

	.pg-chip:hover {
		border-color: var(--color-important);
		color: var(--color-important);
		background: color-mix(in srgb, var(--color-important) 8%, var(--color-surface));
	}

	@media (max-width: 639px) {
		.pg-graph-body {
			padding-top: 0.5rem;
			padding-bottom: 0.5rem;
		}

		.pg-suggestions {
			padding: 0.375rem 0.75rem;
		}

		.pg-suggestions .pg-chip {
			font-size: 10px;
			padding: 0.2rem 0.5rem;
		}

		.pg-prompt-line {
			padding: 0.5rem 0.75rem;
		}

		.pg-chip {
			font-size: 10px;
			padding: 0.2rem 0.5rem;
		}
	}
</style>
