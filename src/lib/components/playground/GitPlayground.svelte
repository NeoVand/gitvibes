<script lang="ts">
	import { onMount } from 'svelte';
	import { GitBranch, Terminal, RotateCcw, Lightbulb, ChevronRight } from 'lucide-svelte';
	import MermaidDiagram from '$lib/components/ui/MermaidDiagram.svelte';
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
	}

	let {
		scenarioId = 'core-loop',
		embedded = false,
		showScenarioPicker = !embedded,
		id = 'playground'
	}: {
		scenarioId?: string;
		embedded?: boolean;
		showScenarioPicker?: boolean;
		id?: string;
	} = $props();

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
						{ type: 'system', text: 'Type git commands below. Enter "help" for supported commands.' }
					]
				: [
						{ type: 'system', text: `Scenario: ${next.title}` },
						{ type: 'system', text: next.description },
						{ type: 'system', text: 'Type git commands below. Enter "help" for supported commands.' }
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
				{ type: 'output', text: 'Repository still initializing. Try again in a moment.', error: true }
			];
			return;
		}

		try {
			const result = await runGitCommand(engine, command);

			if (result.output === '__CLEAR__') {
				history = [];
			} else if (result.output) {
				history = [...history, { type: 'output', text: result.output, error: result.error }];
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

<div class="overflow-hidden rounded-xl" style="background: var(--color-bg-secondary);">
	<!-- Toolbar -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
		style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border);"
	>
		<div class="flex items-center gap-2">
			<GitBranch size={16} style="color: var(--color-primary);" />
			<span class="text-sm font-semibold" style="color: var(--color-text);">
				{embedded ? 'Try it yourself' : 'Git Playground'}
			</span>
			<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background: var(--color-tip-bg); color: var(--color-tip);">
				real git
			</span>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if showScenarioPicker}
				<select
					value={activeScenarioId}
					onchange={(e) => changeScenario(e.currentTarget.value)}
					class="rounded-md px-2 py-1.5 text-xs"
					style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);"
					disabled={loading}
				>
					{#each playgroundScenarios as s (s.id)}
						<option value={s.id}>{s.title}</option>
					{/each}
				</select>
			{/if}
			<button
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

	<!-- Hint bar -->
	<div
		class="flex items-start gap-2 px-5 py-2.5 text-xs"
		style="background: var(--color-tip-bg); border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary);"
	>
		<Lightbulb size={14} class="mt-0.5 flex-shrink-0" style="color: var(--color-tip);" />
		<span>{scenario.hint}</span>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2" style="min-height: {embedded ? '340px' : '420px'};">
		<!-- Terminal -->
		<div class="flex flex-col" style="border-right: 1px solid var(--color-border);">
			<div class="flex items-center gap-2 px-4 py-2" style="background: var(--color-terminal-bg);">
				<div class="flex gap-1.5">
					<span class="block h-3 w-3 rounded-full" style="background: #ef4444;"></span>
					<span class="block h-3 w-3 rounded-full" style="background: #f59e0b;"></span>
					<span class="block h-3 w-3 rounded-full" style="background: #10b981;"></span>
				</div>
				<Terminal size={12} style="color: var(--color-text-muted);" />
				<span class="text-xs" style="color: var(--color-text-muted);">Terminal</span>
			</div>

			<div
				bind:this={terminalEl}
				class="flex-1 overflow-y-auto p-4"
				style="background: var(--color-terminal-bg); min-height: {embedded ? '220px' : '280px'}; max-height: {embedded ? '300px' : '360px'};"
			>
				{#each history as line, i (i)}
					{#if line.type === 'input'}
						<div class="mb-2 flex gap-2" style="font-family: var(--font-mono); font-size: 13px;">
							<span style="color: var(--color-terminal-prompt);">$</span>
							<span style="color: var(--color-terminal-command);">{line.text}</span>
						</div>
					{:else if line.type === 'output'}
						<pre
							class="mb-3 whitespace-pre-wrap pl-5 text-xs leading-relaxed"
							style="color: {line.error ? 'var(--color-warning)' : 'var(--color-terminal-output)'}; font-family: var(--font-mono);"
						>{line.text}</pre>
					{:else}
						<p class="mb-2 text-xs italic" style="color: var(--color-text-muted); font-family: var(--font-mono);">
							# {line.text}
						</p>
					{/if}
				{/each}
				{#if loading}
					<p class="text-xs" style="color: var(--color-text-muted); font-family: var(--font-mono);">
						Initializing repository...
					</p>
				{/if}
			</div>

			<form
				onsubmit={handleSubmit}
				class="flex items-center gap-2 px-4 py-3"
				style="background: var(--color-terminal-bg); border-top: 1px solid var(--color-border);"
			>
				<span style="color: var(--color-terminal-prompt); font-family: var(--font-mono); font-size: 13px;">$</span>
				<input
					bind:this={inputEl}
					bind:value={input}
					onkeydown={handleKeydown}
					disabled={loading}
					placeholder="git status"
					class="flex-1 bg-transparent text-sm outline-none"
					style="color: var(--color-terminal-command); font-family: var(--font-mono);"
					autocomplete="off"
					spellcheck="false"
				/>
			</form>
		</div>

		<!-- Graph -->
		<div class="flex flex-col">
			<div class="flex items-center gap-2 px-4 py-2">
				<GitBranch size={12} style="color: var(--color-primary);" />
				<span class="text-xs" style="color: var(--color-text-muted);">Live commit graph</span>
			</div>
			<div class="flex flex-1 items-center justify-center p-4">
				{#key diagram}
					<MermaidDiagram definition={diagram} id="{id}-graph" />
				{/key}
			</div>
		</div>
	</div>

	<!-- Suggested commands -->
	<div class="px-5 py-3" style="border-top: 1px solid var(--color-border);">
		<p class="mb-2 text-xs font-medium" style="color: var(--color-text-muted);">Try these commands</p>
		<div class="flex flex-wrap gap-2">
			{#each scenario.suggestedCommands as command (command)}
				<button
					onclick={() => runSuggested(command)}
					class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-opacity hover:opacity-80"
					style="background: var(--color-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border); font-family: var(--font-mono);"
				>
					{command}
					<ChevronRight size={12} />
				</button>
			{/each}
		</div>
	</div>
</div>
