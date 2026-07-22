<script lang="ts">
	import { tick, untrack } from 'svelte';
	import {
		Bot,
		X,
		ArrowUp,
		Square,
		ChevronRight,
		ChevronDown,
		Check,
		Download,
		Pencil,
		RefreshCw,
		Settings,
		ShieldAlert,
		Terminal
	} from 'lucide-svelte';
	import { autohideScroll } from '$lib/actions/autohide-scroll';
	import { agentRuntime } from '$lib/ai/runtime.svelte';
	import { readingContext } from '$lib/ai/reading-context.svelte';
	import { STATIC_STARTERS, SUGGESTION_COUNT } from '$lib/ai/suggestions';
	import {
		canRunModel,
		DEFAULT_MODEL_ID,
		getModelSpec,
		QUALITY_MODEL_ID,
		type LocalModelSpec
	} from '$lib/ai/local/models';
	import {
		extractCitations,
		parseMarkdown,
		type InlineToken,
		type MarkdownBlock
	} from '$lib/ai/markdown';
	import { titleForId } from '$lib/ai/retrieval';
	import { tokenizeGitCommand, type GitToken } from '$lib/data/git-syntax';

	let {
		open = false,
		onToggle,
		onNavigate
	}: {
		open: boolean;
		onToggle: () => void;
		onNavigate?: (id: string) => void;
	} = $props();

	let hasOpened = $state(false);
	let introDismissed = $state(false);
	let settingsOpen = $state(false);
	let input = $state('');
	let taEl: HTMLTextAreaElement | undefined = $state(undefined);
	let messagesEl: HTMLDivElement | undefined = $state(undefined);
	let termEl: HTMLDivElement | undefined = $state(undefined);

	/* approval-card edit mode */
	let editingCmd = $state(false);
	let editedCmd = $state('');

	/* ── suggested questions: contextual when a model is ready, static else ── */
	let contextualChips = $derived(
		agentRuntime.canSuggest && (agentRuntime.suggesting || agentRuntime.suggestions.length > 0)
	);
	let chips = $derived(contextualChips ? agentRuntime.suggestions : [...STATIC_STARTERS]);
	/** Shimmer placeholders for chips still streaming in. */
	let ghostCount = $derived(
		agentRuntime.suggesting ? Math.max(0, SUGGESTION_COUNT - agentRuntime.suggestions.length) : 0
	);

	$effect(() => {
		if (open) {
			hasOpened = true;
			// Capability sniff + auto-warm of a previously downloaded model
			// (from Cache Storage — never a fresh download without a click).
			agentRuntime.initLocal();
			// Autofocus on desktop only — on mobile the keyboard would cover
			// the panel before the user has read anything.
			if (window.innerWidth >= 768) {
				tick().then(() => taEl?.focus());
			}
		}
	});

	// Opening the panel with a ready model kicks off contextual suggestions
	// for wherever the learner is reading. The context read is untracked on
	// purpose: scrolling the course must not churn regenerations — the
	// refresh button is the "bring me up to here" affordance.
	$effect(() => {
		if (open && agentRuntime.canSuggest && agentRuntime.messages.length === 0) {
			agentRuntime.refreshSuggestions(untrack(() => readingContext.current));
		}
	});

	const defaultSpec = getModelSpec(DEFAULT_MODEL_ID)!;
	const qualitySpec = getModelSpec(QUALITY_MODEL_ID)!;
	let activeLocalId = $derived(
		agentRuntime.backendName === 'local' ? agentRuntime.localModelId : null
	);
	/**
	 * Downloaded means chat, period: after the first successful download the
	 * intro banner + model cards never render in the chat area again — model
	 * management lives behind the gear, and warm/error states show as a slim
	 * status line instead.
	 */
	let showIntro = $derived(agentRuntime.firstRun && !introDismissed);
	let statusLine = $derived(
		!agentRuntime.firstRun &&
			agentRuntime.backendName !== 'local' &&
			(agentRuntime.localBusy || agentRuntime.localPhase === 'error')
	);
	let busyModelLabel = $derived(
		agentRuntime.localModelId
			? (getModelSpec(agentRuntime.localModelId)?.label ?? 'the local model')
			: 'the local model'
	);

	// Follow the streaming answer (and the approval card).
	$effect(() => {
		const last = agentRuntime.messages.at(-1);
		void last?.content;
		void agentRuntime.pendingCmd;
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	});

	// Follow the agent's terminal output.
	$effect(() => {
		void agentRuntime.terminal.length;
		if (termEl) {
			termEl.scrollTop = termEl.scrollHeight;
		}
	});

	// A new proposal resets the approval card's edit mode.
	$effect(() => {
		void agentRuntime.pendingCmd;
		editingCmd = false;
		editedCmd = agentRuntime.pendingCmd ?? '';
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onToggle();
		}
	}

	function send() {
		const question = input.trim();
		if (!question || agentRuntime.status === 'generating') return;
		input = '';
		if (taEl) taEl.style.height = 'auto';
		void agentRuntime.ask(question);
	}

	/** The composer grows with the draft, up to a few lines. */
	function autoGrow() {
		if (!taEl) return;
		taEl.style.height = 'auto';
		taEl.style.height = `${Math.min(taEl.scrollHeight, 128)}px`;
	}

	function onComposerKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function askStarter(question: string) {
		if (agentRuntime.status === 'generating') return;
		void agentRuntime.ask(question);
	}

	function navigateTo(id: string) {
		if (onNavigate) {
			onNavigate(id);
		} else {
			window.location.hash = id;
		}
	}

	/** Cheat-sheet chunks have no page anchor — only sections get link chips. */
	function isAnchor(id: string): boolean {
		return !id.startsWith('cheat-');
	}

	interface RenderedMessage {
		blocks: MarkdownBlock[];
		sourceIds: string[];
	}

	/** Citations out of the prose (sources row), markdown into blocks. */
	function renderMessage(content: string): RenderedMessage {
		const split = extractCitations(content);
		return { blocks: parseMarkdown(split.text), sourceIds: split.ids };
	}

	const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal']);

	/** Tokenized lines for a fenced block; plain text for non-shell langs. */
	function codeLines(block: { lang: string | null; code: string }): GitToken[][] {
		const shell = block.lang === null || SHELL_LANGS.has(block.lang.toLowerCase());
		return block.code
			.split('\n')
			.map((line) => (shell ? tokenizeGitCommand(line) : [{ text: line, type: 'text' as const }]));
	}
</script>

{#snippet inlineTokens(tokens: InlineToken[])}
	{#each tokens as t, j (j)}
		{#if t.kind === 'text'}{t.value}{:else if t.kind === 'bold'}<strong>{t.value}</strong
			>{:else}<code class="agent-code">{t.value}</code>{/if}
	{/each}
{/snippet}

{#snippet shellTokens(tokens: GitToken[])}
	{#each tokens as t, j (j)}<span class="tok-{t.type}">{t.text}</span>{/each}
{/snippet}

{#snippet modelCard(spec: LocalModelSpec, tint: 'tan' | 'amber')}
	{@const gate = canRunModel(spec, agentRuntime.caps)}
	{@const downloaded = agentRuntime.downloaded.includes(spec.id)}
	{@const active = activeLocalId === spec.id}
	{@const busy = agentRuntime.localBusy && agentRuntime.localModelId === spec.id}
	{@const sizeLabel =
		spec.sizeMb >= 1000 ? `${(spec.sizeMb / 1000).toFixed(1)} GB` : `${spec.sizeMb} MB`}
	<div class="agent-model-card agent-model-{tint}" class:active class:dimmed={!gate.ok}>
		<span class="agent-model-name">{spec.label}</span>
		<span class="agent-model-meta">
			~{sizeLabel} · {spec.tagline}
		</span>
		<div class="agent-model-action">
			{#if busy}
				<div class="agent-model-progress" role="status" aria-live="polite">
					{#if agentRuntime.localPhase === 'downloading'}
						<span class="agent-model-pct">
							{agentRuntime.download.percent}% · {Math.round(
								(spec.sizeMb * agentRuntime.download.percent) / 100
							)} / {spec.sizeMb} MB
						</span>
					{:else if agentRuntime.localPhase === 'loading'}
						<span class="agent-model-pct">loading into memory…</span>
					{:else}
						<span class="agent-model-pct">warming up…</span>
					{/if}
					<button
						type="button"
						class="agent-model-cancel"
						onclick={() => agentRuntime.cancelActivation()}
					>
						Cancel
					</button>
				</div>
				<div class="agent-model-track" aria-hidden="true">
					{#if agentRuntime.localPhase === 'downloading'}
						<div class="agent-model-fill" style:width="{agentRuntime.download.percent}%"></div>
					{:else}
						<div class="agent-model-fill indeterminate"></div>
					{/if}
				</div>
			{:else if active}
				<span class="agent-model-active"><Check size={11} /> Active</span>
			{:else if !downloaded}
				<!-- Download gates activation: until the weights are local, the only
				     live affordance is the download itself (and not even that when
				     the device can't run the model — no 1.3 GB bricks). -->
				<button
					type="button"
					class="agent-model-dl"
					disabled={!gate.ok || agentRuntime.localBusy}
					onclick={() => agentRuntime.activateLocal(spec.id)}
				>
					<Download size={11} />
					Download · {sizeLabel}
				</button>
			{:else}
				<button
					type="button"
					class="agent-model-use"
					disabled={!gate.ok || agentRuntime.localBusy}
					onclick={() => agentRuntime.activateLocal(spec.id)}
				>
					Use this model
				</button>
			{/if}
		</div>
		{#if !gate.ok}
			<span class="agent-model-reason">{gate.reason}</span>
		{/if}
	</div>
{/snippet}

{#snippet modelPicker()}
	<!-- The two local models, side by side: tan 0.8B, amber 2B — flat sibling
	     tiles, each carrying its own download / activate lifecycle. -->
	<div class="agent-model-grid">
		{@render modelCard(defaultSpec, 'tan')}
		{@render modelCard(qualitySpec, 'amber')}
	</div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
		onclick={onToggle}
		aria-label="Close agent"
	></button>
{/if}

<aside
	class="agent-panel fixed top-0 right-0 bottom-0 z-40 flex w-full flex-col border-l shadow-2xl transition-transform duration-200 ease-out md:w-[var(--agent-reading-width)]"
	style="padding-top: var(--header-height); border-color: var(--color-border);"
	class:translate-x-0={open}
	class:translate-x-full={!open}
	aria-hidden={!open}
	aria-label="Agent"
>
	{#if hasOpened}
		<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
			<header
				class="flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-3"
				style="background: color-mix(in srgb, var(--color-bg-tertiary) 55%, transparent); border-bottom: 1px solid var(--color-border);"
				data-fabric
			>
				<Bot size={14} style="color: var(--color-important);" />
				<span class="text-sm font-semibold" style="color: var(--color-text);">Agent</span>
				<span class="agent-badge hidden sm:inline">{agentRuntime.badgeLabel}</span>

				<div class="ml-auto flex items-center gap-1.5 sm:gap-2">
					<button
						type="button"
						onclick={() => (settingsOpen = !settingsOpen)}
						class="agent-icon-btn"
						class:agent-icon-btn-on={settingsOpen}
						aria-label="Agent settings"
						aria-expanded={settingsOpen}
					>
						<Settings size={14} />
					</button>
					<button type="button" onclick={onToggle} class="agent-icon-btn" aria-label="Close agent">
						<X size={14} />
					</button>
				</div>
			</header>

			{#if settingsOpen}
				<button
					class="agent-settings-backdrop"
					type="button"
					aria-label="Close settings"
					onclick={() => (settingsOpen = false)}
				></button>
				<div class="agent-settings" role="dialog" aria-label="Agent settings">
					<!-- A tiny settings list — future entries (command allowlists,
					     clear conversation, …) append as further .agent-setting rows. -->
					<div class="agent-setting">
						<p class="agent-setting-label">Model</p>
						{@render modelPicker()}
						<p class="agent-card-note">
							{defaultSpec.label}: {defaultSpec.license} · {qualitySpec.label}: {qualitySpec.license}
						</p>
					</div>
					<div class="agent-setting">
						<p class="agent-setting-label">Mode</p>
						{#if agentRuntime.backendName === 'local'}
							<button type="button" class="agent-mode-link" onclick={() => agentRuntime.useMock()}>
								use scripted mode
							</button>
						{:else}
							<p class="agent-card-note">Scripted guide (answers come from the course index).</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if statusLine}
				<!-- Downloaded models wake silently; this slim line is ALL the
				     ceremony a revisit gets. -->
				<div class="agent-status shrink-0" role="status" aria-live="polite">
					{#if agentRuntime.localPhase === 'error'}
						<span class="agent-status-err">
							couldn't wake {busyModelLabel}: {agentRuntime.localError}
						</span>
						<button
							type="button"
							class="agent-mode-link"
							onclick={() =>
								agentRuntime.activateLocal(agentRuntime.localModelId ?? DEFAULT_MODEL_ID)}
						>
							retry
						</button>
					{:else}
						<span>waking {busyModelLabel}…</span>
						<span class="terminal-caret agent-status-caret" aria-hidden="true"></span>
					{/if}
				</div>
			{/if}

			<div
				bind:this={messagesEl}
				class="autohide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
				use:autohideScroll
				data-testid="agent-messages"
			>
				{#if agentRuntime.messages.length === 0}
					<div class="flex h-full flex-col justify-center gap-4">
						{#if showIntro}
							<!-- First-run only: after any model is downloaded, this
							     banner never returns (models live behind the gear). -->
							<div class="agent-intro" data-testid="agent-intro">
								<div class="mb-2 flex items-start gap-2">
									<p class="agent-card-title flex-1">
										Right now I'm a <strong>scripted guide</strong> answering strictly from the lessons.
										Want the real thing? Download a model once — it runs entirely in your browser.
									</p>
									<button
										type="button"
										onclick={() => (introDismissed = true)}
										class="agent-icon-btn agent-intro-x"
										aria-label="Use scripted mode"
									>
										<X size={13} />
									</button>
								</div>
								{@render modelPicker()}
								{#if agentRuntime.localPhase === 'error'}
									<p class="agent-status-err mt-2 text-[11px]">
										That didn't work: {agentRuntime.localError}
									</p>
								{/if}
							</div>
						{/if}
						<div class="flex flex-col items-center gap-4 text-center">
							<Bot size={28} style="color: var(--color-important); opacity: 0.7;" />
							<p class="max-w-xs text-sm" style="color: var(--color-text-secondary);">
								Ask anything about Git — answers come straight from the course, with links to the
								right section.
							</p>
							<div class="flex flex-col items-stretch gap-2" data-testid="agent-suggestions">
								{#if agentRuntime.canSuggest}
									<!-- Contextual questions carry a tiny provenance row: where
									     they were generated for, and the "regenerate for HERE"
									     refresh. Static starters never show it. -->
									<div class="agent-chips-head">
										<span class="agent-chips-label">
											{agentRuntime.suggestedTitle
												? `questions for ${agentRuntime.suggestedTitle}`
												: 'suggested questions'}
										</span>
										<button
											type="button"
											class="agent-chip-refresh"
											onclick={() => agentRuntime.refreshSuggestions(readingContext.current, true)}
											disabled={agentRuntime.suggesting}
											aria-label="Refresh suggested questions"
											data-testid="suggest-refresh"
										>
											<span class="agent-refresh-icon" class:spinning={agentRuntime.suggesting}>
												<RefreshCw size={12} />
											</span>
										</button>
									</div>
								{/if}
								{#each chips as chip (chip)}
									<button
										type="button"
										class="agent-chip agent-chip-in"
										data-testid="agent-chip"
										onclick={() => askStarter(chip)}
									>
										<span class="truncate">{chip}</span>
										<ChevronRight size={12} class="shrink-0" />
									</button>
								{/each}
								{#each Array.from({ length: ghostCount }, (_, i) => i) as g (g)}
									<div class="agent-chip-ghost" aria-hidden="true"></div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each agentRuntime.messages as message, i (i)}
							{#if message.role === 'user'}
								<div class="flex justify-end">
									<div
										class="agent-msg-user max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-relaxed"
									>
										{message.content}
									</div>
								</div>
							{:else if message.role === 'assistant'}
								{@const rendered = renderMessage(message.content)}
								<div
									class="agent-msg-assistant max-w-full text-[13.5px] leading-relaxed"
									data-role="assistant"
								>
									{#each rendered.blocks as block, b (b)}
										{#if block.kind === 'p'}
											<p class="agent-md-p">{@render inlineTokens(block.inlines)}</p>
										{:else if block.kind === 'list'}
											<ul class="agent-md-list">
												{#each block.items as item, k (k)}
													<li>{@render inlineTokens(item)}</li>
												{/each}
											</ul>
										{:else}
											<!-- The {'\n'} mustache is load-bearing: a literal newline between
											     tokenized lines inside the <pre>. -->
											<!-- eslint-disable svelte/no-useless-mustaches -->
											<pre
												class="agent-md-code">{#each codeLines(block) as lineTokens, li (li)}{#if li > 0}{'\n'}{/if}{@render shellTokens(
														lineTokens
													)}{/each}</pre>
											<!-- eslint-enable svelte/no-useless-mustaches -->
										{/if}
									{/each}
									{#if agentRuntime.status === 'generating' && i === agentRuntime.messages.length - 1}
										<span class="agent-caret terminal-caret" aria-hidden="true"></span>
									{/if}
									{#if rendered.sourceIds.length > 0}
										<div class="agent-sources">
											<span class="agent-sources-label">Sources</span>
											{#each rendered.sourceIds as id (id)}
												{@const title = titleForId(id)}
												{#if title && isAnchor(id)}
													<a
														href="#{id}"
														class="agent-cite"
														onclick={(e) => {
															e.preventDefault();
															navigateTo(id);
														}}
													>
														{title}
													</a>
												{:else if title}
													<span class="agent-cite agent-cite-static">{title}</span>
												{/if}
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{/each}

						{#if agentRuntime.pendingCmd !== null}
							<!-- The approval gate, section 6.1 pedagogy: read the
							     command, then allow, edit, or deny. -->
							<div class="agent-approve" data-testid="approval-card">
								<p class="agent-approve-title">
									<ShieldAlert size={12} />
									The agent wants to run:
								</p>
								{#if editingCmd}
									<input
										type="text"
										class="agent-approve-edit"
										bind:value={editedCmd}
										aria-label="Edit command"
										spellcheck="false"
										autocapitalize="off"
									/>
								{:else}
									<code class="agent-approve-cmd" data-testid="approval-cmd"
										>{@render shellTokens(tokenizeGitCommand(agentRuntime.pendingCmd))}</code
									>
								{/if}
								<div class="agent-approve-actions">
									{#if editingCmd}
										<button
											type="button"
											class="agent-approve-btn allow"
											onclick={() => agentRuntime.decide('edit', { cmd: editedCmd })}
										>
											<Check size={12} /> Run edited
										</button>
										<button
											type="button"
											class="agent-approve-btn"
											onclick={() => (editingCmd = false)}
										>
											Back
										</button>
									{:else}
										<button
											type="button"
											class="agent-approve-btn allow"
											onclick={() => agentRuntime.decide('allow')}
										>
											<Check size={12} /> Allow
										</button>
										<button
											type="button"
											class="agent-approve-btn"
											onclick={() => (editingCmd = true)}
										>
											<Pencil size={11} /> Edit
										</button>
										<button
											type="button"
											class="agent-approve-btn deny"
											onclick={() => agentRuntime.decide('deny', { reason: 'denied by learner' })}
										>
											<X size={12} /> Deny
										</button>
									{/if}
								</div>
							</div>
						{/if}

						{#if agentRuntime.activity}
							<div class="agent-activity" role="status" data-testid="agent-activity">
								<span class="terminal-caret agent-activity-caret" aria-hidden="true"></span>
								{agentRuntime.activity}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if agentRuntime.terminal.length > 0}
				<!-- The agent's own sandbox, styled like the playground terminal.
				     Auto-expands when the first command runs. -->
				<section class="agent-term shrink-0">
					<button
						type="button"
						class="agent-term-header"
						onclick={() => (agentRuntime.terminalOpen = !agentRuntime.terminalOpen)}
						aria-expanded={agentRuntime.terminalOpen}
					>
						<Terminal size={13} style="color: var(--color-important);" />
						<span>Agent's terminal</span>
						<ChevronDown
							size={12}
							class="ml-auto transition-transform duration-150"
							style="transform: rotate({agentRuntime.terminalOpen ? '0deg' : '-90deg'});"
						/>
					</button>
					{#if agentRuntime.terminalOpen}
						<div
							bind:this={termEl}
							class="agent-term-body autohide-scrollbar"
							use:autohideScroll
							data-testid="agent-terminal"
						>
							{#each agentRuntime.terminal as line, i (i)}
								{#if line.type === 'input'}
									<div class="agent-term-line">
										<span class="agent-pp-user">vibe@sandbox</span>
										<span class="agent-pp-path">({line.promptCwd ?? 'main'})</span><span
											class="agent-pp-sep">$</span
										>
										<span>{@render shellTokens(tokenizeGitCommand(line.text))}</span>
									</div>
								{:else if line.colored}
									<!-- Safe {@html}: pre-escaped HTML from our own runShellCommand
									     colorizers — the same contract the playground renders. -->
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									<pre class="agent-term-out">{@html line.text}</pre>
								{:else}
									<pre class="agent-term-out" class:err={line.error}>{line.text}</pre>
								{/if}
							{/each}
						</div>
					{/if}
				</section>
			{/if}

			{#if agentRuntime.backendName === 'local'}
				<div class="agent-mode-row shrink-0">
					<span
						>{agentRuntime.badgeLabel}{agentRuntime.localDevice
							? ` · ${agentRuntime.localDevice}`
							: ''}</span
					>
					<button type="button" class="agent-mode-link" onclick={() => agentRuntime.useMock()}>
						use scripted mode
					</button>
				</div>
			{/if}

			<!-- Seamless composer: a label so clicking anywhere focuses the field;
			     the send affordance floats in the corner over the same surface.
			     No box around the typing area — just a hairline separator. -->
			<label class="agent-composer shrink-0">
				<textarea
					bind:this={taEl}
					bind:value={input}
					rows="1"
					class="agent-text-in"
					placeholder="Ask about a command…"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="send"
					aria-label="Ask the agent"
					oninput={autoGrow}
					onkeydown={onComposerKey}
				></textarea>
				{#if agentRuntime.status === 'generating'}
					<button
						type="button"
						onclick={() => agentRuntime.stop()}
						class="agent-send"
						aria-label="Stop generating"
					>
						<Square size={12} />
					</button>
				{:else}
					<button
						type="button"
						onclick={send}
						class="agent-send"
						disabled={!input.trim()}
						aria-label="Send question"
					>
						<ArrowUp size={16} strokeWidth={2.5} />
					</button>
				{/if}
			</label>
		</div>
	{/if}
</aside>

<style>
	.agent-panel {
		background: var(--panel-glass);
		backdrop-filter: blur(24px) saturate(1.4);
		-webkit-backdrop-filter: blur(24px) saturate(1.4);
	}

	.agent-badge {
		border-radius: 9999px;
		padding: 0.175rem 0.5rem;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-important);
		background: color-mix(in srgb, var(--color-important) 12%, var(--color-bg-tertiary));
	}

	.agent-icon-btn {
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
			color 0.15s ease;
	}

	.agent-icon-btn:hover {
		border-color: var(--color-important);
		color: var(--color-important);
	}

	.agent-chip {
		display: inline-flex;
		cursor: pointer;
		align-items: center;
		gap: 0.375rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 0.375rem 0.625rem;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-secondary);
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.agent-chip:hover {
		border-color: var(--color-important);
		color: var(--color-important);
	}

	/* ── Contextual suggestions: streamed chips + shimmer placeholders ───── */
	.agent-chip-in {
		animation: agent-chip-in 0.28s ease-out both;
	}

	@keyframes agent-chip-in {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	/* A chip-shaped promise: same footprint, dashed edge, phosphor shimmer. */
	.agent-chip-ghost {
		height: 1.95rem;
		border-radius: 0.5rem;
		border: 1px dashed var(--color-border);
		background: linear-gradient(
			100deg,
			transparent 30%,
			color-mix(in srgb, var(--color-important) 9%, transparent) 50%,
			transparent 70%
		);
		background-size: 220% 100%;
		animation: agent-ghost-shimmer 1.3s ease-in-out infinite;
	}

	@keyframes agent-ghost-shimmer {
		0% {
			background-position: 160% 0;
		}
		100% {
			background-position: -60% 0;
		}
	}

	.agent-chips-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0 0.125rem;
	}

	.agent-chips-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-muted);
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.agent-chip-refresh {
		display: inline-flex;
		height: 1.375rem;
		width: 1.375rem;
		flex-shrink: 0;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-muted);
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.agent-chip-refresh:hover:not(:disabled) {
		border-color: var(--color-important);
		color: var(--color-important);
	}

	.agent-chip-refresh:disabled {
		cursor: default;
		opacity: 0.6;
	}

	.agent-refresh-icon {
		display: inline-flex;
	}

	.agent-refresh-icon.spinning {
		animation: agent-refresh-spin 0.9s linear infinite;
	}

	@keyframes agent-refresh-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.agent-chip-in {
			animation: none;
		}

		.agent-chip-ghost {
			animation: none;
			opacity: 0.6;
		}

		.agent-refresh-icon.spinning {
			animation: none;
		}
	}

	.agent-msg-user {
		background: color-mix(in srgb, var(--color-important) 10%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-important) 25%, transparent);
		color: var(--color-text);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.agent-msg-assistant {
		color: var(--color-text-secondary);
		overflow-wrap: anywhere;
	}

	/* ── Markdown blocks ─────────────────────────────────────────────────── */
	.agent-md-p {
		margin: 0 0 0.5rem;
	}

	.agent-md-p:last-child {
		margin-bottom: 0;
	}

	.agent-md-p :global(strong) {
		color: var(--color-text);
		font-weight: 650;
	}

	.agent-md-list {
		margin: 0 0 0.5rem;
		padding-left: 1.1rem;
		list-style: disc;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.agent-md-code {
		margin: 0.25rem 0 0.6rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-terminal-border);
		background: var(--color-terminal-bg);
		color: var(--color-terminal-text);
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.6;
		overflow-x: auto;
		white-space: pre;
	}

	.agent-code {
		border-radius: 0.25rem;
		background: var(--color-code-bg);
		padding: 0.1rem 0.3rem;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-code-text);
	}

	/* ── Sources row (citations live here, not mid-sentence) ────────────── */
	.agent-sources {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border-light);
	}

	.agent-sources-label {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}

	.agent-cite {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		border-radius: 9999px;
		border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
		padding: 0.05rem 0.5rem;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-primary-text);
		text-decoration: none;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.agent-cite:hover {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
	}

	.agent-cite-static {
		cursor: default;
	}

	/* ── Approval card (section 6.1 pedagogy) ───────────────────────────── */
	.agent-approve {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-radius: 0.625rem;
		border: 1px solid color-mix(in srgb, var(--color-important) 40%, transparent);
		background: color-mix(in srgb, var(--color-important) 7%, var(--color-surface));
		padding: 0.625rem 0.75rem;
	}

	.agent-approve-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 11px;
		font-weight: 700;
		color: var(--color-important);
	}

	.agent-approve-cmd {
		display: block;
		border-radius: 0.4rem;
		border: 1px solid var(--color-terminal-border);
		background: var(--color-terminal-bg);
		padding: 0.4rem 0.6rem;
		font-family: var(--font-mono);
		font-size: 12.5px;
		color: var(--color-terminal-command);
		overflow-x: auto;
		white-space: pre;
	}

	.agent-approve-edit {
		width: 100%;
		border-radius: 0.4rem;
		border: 1px solid var(--color-important);
		background: var(--color-terminal-bg);
		padding: 0.4rem 0.6rem;
		font-family: var(--font-mono);
		font-size: 12.5px;
		color: var(--color-terminal-command);
	}

	.agent-approve-edit:focus {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-important) 20%, transparent);
	}

	.agent-approve-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.agent-approve-btn {
		display: inline-flex;
		cursor: pointer;
		align-items: center;
		gap: 0.3rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: 0.3rem 0.7rem;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--color-text-secondary);
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}

	.agent-approve-btn:hover {
		border-color: var(--color-text-muted);
	}

	.agent-approve-btn.allow {
		border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
		background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
		color: var(--color-primary-text);
	}

	.agent-approve-btn.allow:hover {
		border-color: var(--color-primary);
	}

	.agent-approve-btn.deny {
		border-color: color-mix(in srgb, var(--color-caution) 40%, transparent);
		background: color-mix(in srgb, var(--color-caution) 8%, var(--color-surface));
		color: var(--color-caution);
	}

	.agent-approve-btn.deny:hover {
		border-color: var(--color-caution);
	}

	/* ── Agent's terminal strip (playground look) ───────────────────────── */
	.agent-term {
		border-top: 1px solid var(--color-border);
	}

	.agent-term-header {
		display: flex;
		width: 100%;
		cursor: pointer;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 1.25rem;
		background: color-mix(in srgb, var(--color-bg-tertiary) 55%, transparent);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.agent-term-body {
		max-height: 11rem;
		overflow-y: auto;
		padding: 0.5rem 1.25rem 0.625rem;
		background-color: var(--color-terminal-bg);
		color: var(--color-terminal-text);
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.55;
	}

	.agent-term-line {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.agent-pp-user {
		color: var(--color-terminal-prompt);
		font-weight: 600;
	}

	.agent-pp-sep {
		color: var(--color-terminal-output);
	}

	.agent-pp-path {
		color: var(--color-diff-hunk);
	}

	.agent-term-out {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 12px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--color-terminal-output);
	}

	.agent-term-out.err {
		color: var(--color-diff-del);
	}

	/* ── Slim status line (revisit warm / error) ────────────────────────── */
	.agent-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 1.25rem;
		border-bottom: 1px solid var(--color-border-light);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-muted);
	}

	.agent-status-caret {
		display: inline-block;
	}

	.agent-status-err {
		color: var(--color-caution);
	}

	/* ── First-run intro (chat area, once, dismissible) ─────────────────── */
	.agent-intro {
		border-radius: 0.75rem;
		border: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-important) 5%, var(--color-surface));
		padding: 0.75rem 0.875rem;
	}

	.agent-intro-x {
		height: 1.5rem;
		width: 1.5rem;
		flex-shrink: 0;
		border-radius: 0.4rem;
	}

	.agent-card-title {
		font-size: 11.5px;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}

	.agent-card-title strong {
		color: var(--color-text);
	}

	.agent-card-note {
		font-size: 10.5px;
		color: var(--color-text-muted);
	}

	/* Live status note ("thinking…", "running the approved command…") —
	   there is never a frozen instant while the agent works. */
	.agent-activity {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 11px;
		font-style: italic;
		color: var(--color-text-muted);
	}

	.agent-activity-caret {
		display: inline-block;
		flex-shrink: 0;
	}

	/* Slim mode row above the composer when the real model is active. */
	.agent-mode-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.25rem 1.25rem;
		font-size: 10px;
		color: var(--color-text-muted);
		border-top: 1px solid var(--color-border-light);
	}

	.agent-mode-link {
		cursor: pointer;
		border: none;
		background: transparent;
		padding: 0;
		font-size: 10px;
		color: var(--color-text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.agent-mode-link:hover {
		color: var(--color-important);
	}

	/* ── Settings popover (gear in the header) ──────────────────────────── */
	.agent-icon-btn-on {
		border-color: var(--color-important);
		color: var(--color-important);
	}

	.agent-settings-backdrop {
		position: fixed;
		inset: 0;
		z-index: 45;
		border: 0;
		padding: 0;
		background: transparent;
		cursor: default;
	}

	.agent-settings {
		position: absolute;
		top: 3.25rem;
		right: 0.75rem;
		z-index: 46;
		width: min(24rem, calc(100% - 1.5rem));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		box-shadow: 0 14px 36px -16px rgba(0, 0, 0, 0.5);
	}

	.agent-setting {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.agent-setting-label {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}

	/* ── Model tiles: flat, generous, tinted by a left accent bar ───────── */
	.agent-model-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.625rem;
		align-items: stretch;
	}

	@media (max-width: 420px) {
		.agent-model-grid {
			grid-template-columns: 1fr;
		}
	}

	.agent-model-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		overflow: hidden;
		padding: 0.75rem 0.875rem 0.8rem;
		border-radius: 0.625rem;
		background: color-mix(in srgb, var(--color-surface) 70%, transparent);
		text-align: left;
	}

	.agent-model-card.dimmed > .agent-model-name,
	.agent-model-card.dimmed > .agent-model-meta {
		opacity: 0.55;
	}

	.agent-model-name {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--color-text);
	}

	.agent-model-meta {
		font-size: 10.5px;
		line-height: 1.45;
		color: var(--color-text-muted);
	}

	/* One clear action per state, pinned to the tile bottom. */
	.agent-model-action {
		margin-top: auto;
		padding-top: 0.5rem;
		width: 100%;
	}

	.agent-model-active {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 11px;
		font-weight: 700;
		color: var(--color-primary-text);
	}

	.agent-model-reason {
		font-size: 9.5px;
		font-style: italic;
		color: var(--color-text-muted);
	}

	.agent-model-dl,
	.agent-model-use {
		display: inline-flex;
		cursor: pointer;
		align-items: center;
		gap: 0.3rem;
		border: none;
		border-radius: 0.4rem;
		padding: 0.3rem 0.55rem;
		font-size: 10.5px;
		font-weight: 700;
		transition: opacity 0.15s ease;
	}

	.agent-model-dl:hover:not(:disabled),
	.agent-model-use:hover:not(:disabled) {
		opacity: 0.85;
	}

	.agent-model-dl:disabled,
	.agent-model-use:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.agent-model-progress {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.agent-model-pct {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
	}

	.agent-model-cancel {
		margin-left: auto;
		cursor: pointer;
		border: none;
		background: transparent;
		padding: 0;
		font-size: 10px;
		color: var(--color-text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.agent-model-cancel:hover {
		color: var(--color-caution);
	}

	.agent-model-track {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		overflow: hidden;
	}

	.agent-model-fill {
		height: 100%;
		transition: width 0.25s ease;
	}

	.agent-model-fill.indeterminate {
		width: 35%;
		animation: agent-dl-slide 1.1s ease-in-out infinite;
	}

	@keyframes agent-dl-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(320%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.agent-model-fill.indeterminate {
			animation: none;
			width: 100%;
			opacity: 0.5;
		}
	}

	/* Sibling tints: a thin full border in each card's own tint — subtle at
	   rest, stronger when active. */
	.agent-model-tan {
		border: 1px solid color-mix(in srgb, var(--color-vibe) 40%, transparent);
	}

	.agent-model-tan.active {
		border-color: var(--color-vibe);
		background: color-mix(in srgb, var(--color-vibe) 10%, var(--color-surface));
	}

	.agent-model-tan .agent-model-dl,
	.agent-model-tan .agent-model-use {
		background: color-mix(in srgb, var(--color-vibe) 16%, var(--color-surface));
		color: var(--color-vibe-text);
	}

	.agent-model-tan .agent-model-pct {
		color: var(--color-vibe-text);
	}

	.agent-model-tan .agent-model-fill {
		background: var(--color-vibe);
	}

	.agent-model-amber {
		border: 1px solid color-mix(in srgb, var(--color-important) 40%, transparent);
	}

	.agent-model-amber.active {
		border-color: var(--color-important);
		background: color-mix(in srgb, var(--color-important) 10%, var(--color-surface));
	}

	.agent-model-amber .agent-model-dl,
	.agent-model-amber .agent-model-use {
		background: color-mix(in srgb, var(--color-important) 16%, var(--color-surface));
		color: var(--color-important);
	}

	.agent-model-amber .agent-model-pct {
		color: var(--color-important);
	}

	.agent-model-amber .agent-model-fill {
		background: var(--color-important);
	}

	/* ── Composer: flat, no box, LangX-lesson style ─────────────────────── */
	.agent-composer {
		position: relative;
		display: block;
		margin: 0;
		border: none;
		border-top: 1px solid var(--color-border);
		border-radius: 0;
		background: transparent;
		padding: 0.75rem 3rem 0.75rem 1.25rem;
		cursor: text;
	}

	/* Seamless field: strip every surface the browser or the forms plugin
	   would paint (border, ring, shadow, background) — the composer itself
	   is the surface, so focus shows only the caret. Same treatment as the
	   playground's .pg-input. */
	.agent-text-in,
	.agent-text-in:focus {
		display: block;
		width: 100%;
		min-height: 1.5rem;
		max-height: 8rem;
		padding: 0;
		border: none;
		border-radius: 0;
		outline: none;
		box-shadow: none;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		resize: none;
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text);
		caret-color: var(--color-important);
	}

	.agent-text-in::placeholder {
		color: var(--color-text-muted);
		opacity: 0.55;
	}

	.agent-send {
		position: absolute;
		right: 0.75rem;
		bottom: 0.6rem;
		display: inline-flex;
		height: 1.75rem;
		width: 1.75rem;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: none;
		background: var(--color-important);
		color: var(--color-text-inverse);
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.agent-send:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.agent-send:disabled {
		opacity: 0.35;
		cursor: default;
	}

	/* The shared .terminal-caret (layout.css) supplies size, phosphor color,
	   and the 1.1s step blink — identical to the playground's idle cursor.
	   Here it only needs to sit inline at the streaming text tip. */
	.agent-caret {
		display: inline-block;
		margin-left: 2px;
		vertical-align: text-bottom;
	}
</style>
