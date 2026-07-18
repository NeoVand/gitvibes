/**
 * The Agent panel's reactive store. Owns the conversation, the backend
 * selection (mock ↔ local Qwen), the download/activation state machine, and
 * abort plumbing. The local backend is dynamically imported on activation so
 * transformers.js + langgraph never weigh down the initial bundle.
 */
import { SvelteMap } from 'svelte/reactivity';
import { MockBackend } from './mock-backend';
import { createGate, type Gate, type GateDecision } from './gate';
import { createGitBridge, type GitBridge, type TerminalLine } from './git-bridge';
import {
	groundingSnippets,
	SuggestionLineParser,
	topUpSuggestions,
	STATIC_STARTERS
} from './suggestions';
import type { ReadingSpot } from './reading-context.svelte';
import type { AgentBackend, AgentBash, ChatMessage, RuntimeStatus } from './types';
import {
	deleteLegacyModelCaches,
	detectCaps,
	downloadedModels,
	forgetSelectedModel,
	getModelSpec,
	markDownloaded,
	purgeLegacyFlags,
	rememberSelectedModel,
	selectedModel,
	type DeviceCaps
} from './local/models';
import type { LocalBackend } from './local/local-backend';

export type LocalPhase = 'idle' | 'downloading' | 'loading' | 'probing' | 'ready' | 'error';

export interface DownloadProgress {
	file: string | null;
	percent: number;
	status: string | null;
}

/**
 * Test breadcrumb (like __tvAgentClear): lets e2e force the mock backend to
 * serve contextual suggestions — the product rule stays "real model only".
 */
function mockSuggestForced(): boolean {
	try {
		return (
			typeof localStorage !== 'undefined' && localStorage.getItem('tv-agent-suggest-mock') === '1'
		);
	} catch {
		return false;
	}
}

export class AgentRuntime {
	status = $state<RuntimeStatus>('idle');
	backendName = $state<'mock' | 'local'>('mock');
	messages = $state<ChatMessage[]>([]);
	/** Live note while the agent works: "searching the course for …". */
	activity = $state<string | null>(null);

	/* ── local model lifecycle ── */
	localPhase = $state<LocalPhase>('idle');
	localModelId = $state<string | null>(null);
	localDevice = $state<'webgpu' | 'wasm' | null>(null);
	localError = $state<string | null>(null);
	download = $state<DownloadProgress>({ file: null, percent: 0, status: null });
	caps = $state<DeviceCaps>({ webgpu: false, ramGb: null });
	/** Reactive mirror of the localStorage downloaded-models flags. */
	downloaded = $state<string[]>([]);

	/* ── the agent's own terminal + approval gate ── */
	terminal = $state<TerminalLine[]>([]);
	terminalOpen = $state(false);
	/** Command awaiting a human verdict (renders the inline approval card). */
	pendingCmd = $state<string | null>(null);

	/* ── contextual suggested questions ── */
	/** The generated chips (never the static starters — the panel falls back). */
	suggestions = $state<string[]>([]);
	/** A suggestion round is streaming in. */
	suggesting = $state(false);
	/** Short title of the spot the current suggestions are about. */
	suggestedTitle = $state<string | null>(null);
	#suggestedKey: string | null = null;
	#suggestCache = new SvelteMap<string, string[]>();
	#suggestSeq = 0;

	#mock: AgentBackend = new MockBackend();
	#local: LocalBackend | null = null;
	#abort: AbortController | null = null;
	#warmAbort: AbortController | null = null;
	#initDone = false;
	#gate: Gate = createGate();
	#bridge: GitBridge | null = null;

	constructor() {
		this.#gate.subscribe((pending) => {
			this.pendingCmd = pending;
		});
		// Breadcrumb for the smoke test: reset the conversation between runs.
		if (typeof window !== 'undefined') {
			(globalThis as { __tvAgentClear?: () => void }).__tvAgentClear = () => this.clear();
		}
	}

	get backend(): AgentBackend {
		return this.backendName === 'local' && this.#local ? this.#local : this.#mock;
	}

	/**
	 * Label for the header badge. NEVER the generic line while a model is
	 * active or waking — the badge tells the truth about the actual state.
	 */
	get badgeLabel(): string {
		if (this.localModelId) {
			const label = getModelSpec(this.localModelId)?.label ?? 'local model';
			if (this.backendName === 'local') return `${label} · local`;
			if (this.localBusy) return `${label} · waking…`;
		}
		return 'local · in your browser';
	}

	/** A model download/load/probe is in flight. */
	get localBusy(): boolean {
		return (
			this.localPhase === 'downloading' ||
			this.localPhase === 'loading' ||
			this.localPhase === 'probing'
		);
	}

	/** Nothing downloaded yet — the only state that shows the intro banner. */
	get firstRun(): boolean {
		return this.downloaded.length === 0;
	}

	/**
	 * Contextual suggestions run only when a real model is downloaded + ready
	 * (or under the mock test breadcrumb) — otherwise the static starters stay
	 * exactly as they are today.
	 */
	get canSuggest(): boolean {
		if (this.backendName === 'local') {
			return this.localPhase === 'ready' && typeof this.#local?.suggest === 'function';
		}
		return mockSuggestForced();
	}

	/**
	 * Generate (or serve from the session cache) 4 questions about `spot`.
	 * Fire-and-forget from the panel: never blocks the composer, and a failed
	 * or aborted round simply leaves the static starters in place. `force`
	 * (the refresh button) always regenerates for the spot handed in.
	 */
	refreshSuggestions(spot: ReadingSpot, force = false): void {
		if (!this.canSuggest || this.status === 'generating') return;
		if (!force) {
			const cached = this.#suggestCache.get(spot.key);
			if (cached) {
				this.suggestions = [...cached];
				this.suggestedTitle = spot.title;
				this.#suggestedKey = spot.key;
				return;
			}
			// Already streaming this very spot — let it finish.
			if (this.suggesting && this.#suggestedKey === spot.key) return;
		}
		void this.#generateSuggestions(spot);
	}

	async #generateSuggestions(spot: ReadingSpot): Promise<void> {
		const seq = ++this.#suggestSeq;
		this.suggesting = true;
		this.suggestedTitle = spot.title;
		this.#suggestedKey = spot.key;
		this.suggestions = [];
		const parser = new SuggestionLineParser();
		try {
			await this.backend.suggest!(
				{ label: spot.label, snippets: groundingSnippets(spot) },
				{
					onToken: (text) => {
						if (seq !== this.#suggestSeq) return;
						// Each completed line materializes as a chip immediately.
						for (const q of parser.push(text)) this.suggestions.push(q);
					}
				}
			);
			if (seq !== this.#suggestSeq) return;
			for (const q of parser.flush()) this.suggestions.push(q);
			this.suggestions = topUpSuggestions(this.suggestions, STATIC_STARTERS);
			this.#suggestCache.set(spot.key, [...this.suggestions]);
		} catch {
			// Silent fallback: an empty list makes the panel show the starters.
			if (seq === this.#suggestSeq) this.suggestions = [];
		} finally {
			if (seq === this.#suggestSeq) this.suggesting = false;
		}
	}

	/** Resolve the pending approval card (allow / edit / deny). */
	decide(decision: GateDecision, opts?: { cmd?: string; reason?: string }): void {
		if (this.pendingCmd === null) return;
		this.#gate.resolve(decision, opts);
		if (this.status === 'generating') {
			this.activity = decision === 'deny' ? 'thinking…' : 'running the approved command…';
		}
	}

	/** Lazily build the sandbox bridge (browser only). */
	async #ensureBash(): Promise<AgentBash | undefined> {
		if (typeof window === 'undefined') return undefined;
		if (!this.#bridge) {
			this.#bridge = await createGitBridge({
				gate: this.#gate,
				onLine: (line) => {
					this.terminal.push(line);
					// First activity auto-expands the agent's terminal strip.
					this.terminalOpen = true;
				}
			});
		}
		return {
			propose: (cmd) => this.#bridge!.propose(cmd),
			run: (cmd) => this.#bridge!.run(cmd),
			listing: () => this.#bridge!.listing()
		};
	}

	/**
	 * Called when the panel first opens (browser only): sniff capabilities and,
	 * if a model was downloaded + selected before, warm it from Cache Storage —
	 * never a fresh download without an explicit click.
	 */
	initLocal(): void {
		if (this.#initDone) return;
		this.#initDone = true;
		this.caps = detectCaps();
		purgeLegacyFlags();
		this.downloaded = downloadedModels();
		const remembered = selectedModel();
		if (remembered && downloadedModels().includes(remembered) && getModelSpec(remembered)) {
			void this.activateLocal(remembered);
		}
	}

	/** Explicit activation (download button, retry, model switch, revisit warm). */
	async activateLocal(modelId: string): Promise<void> {
		if (
			this.localPhase === 'downloading' ||
			this.localPhase === 'loading' ||
			this.localPhase === 'probing'
		) {
			return;
		}
		const cached = downloadedModels().includes(modelId);
		this.localError = null;
		this.localModelId = modelId;
		this.localPhase = cached ? 'loading' : 'downloading';
		this.download = { file: null, percent: 0, status: null };

		this.#warmAbort = new AbortController();
		const cancelled = new Promise<never>((_, reject) => {
			this.#warmAbort!.signal.addEventListener('abort', () =>
				reject(new Error('activation cancelled'))
			);
		});

		try {
			const { LocalBackend } = await import('./local/local-backend');
			this.#local?.dispose();
			this.#local = null;
			const backend = new LocalBackend(modelId);
			const result = await Promise.race([
				backend.warm({
					onProgress: (p) => {
						if (p.file) this.download.file = p.file;
						if (p.status) this.download.status = p.status;
						if (typeof p.progress === 'number') this.download.percent = Math.round(p.progress);
					},
					onPhase: (phase) => {
						if (phase.startsWith('warming')) this.localPhase = 'probing';
					}
				}),
				cancelled
			]);
			this.#local = backend;
			this.localDevice = result.device;
			// Breadcrumbs for the real-model smoke test (harmless in production).
			(globalThis as { __tvAgentDevice?: string }).__tvAgentDevice = result.device;
			(globalThis as { __tvAgentProbeMs?: number }).__tvAgentProbeMs = backend.probeMs ?? -1;
			markDownloaded(modelId);
			this.downloaded = downloadedModels();
			rememberSelectedModel(modelId);
			this.backendName = 'local';
			this.localPhase = 'ready';
			if (this.status === 'idle') this.status = 'ready';
			// Fire-and-forget: retired models' weights leave the cache now that
			// a current model is in place.
			void deleteLegacyModelCaches();
		} catch (e) {
			if (e instanceof Error && e.message === 'activation cancelled') {
				// User pressed Cancel: tear down whatever was mid-flight and go
				// back to the offer state — no error banner for a chosen exit.
				const { disposeHost } = await import('./local/transformers-js');
				disposeHost();
				this.localPhase = 'idle';
				this.localModelId = null;
			} else {
				this.localPhase = 'error';
				this.localError = e instanceof Error ? e.message : String(e);
			}
			this.backendName = 'mock';
		} finally {
			this.#warmAbort = null;
		}
	}

	/** Cancel an in-flight download/warm (the Cancel affordance on the card). */
	cancelActivation(): void {
		this.#warmAbort?.abort();
	}

	/** Fall back to the scripted guide (keeps the downloaded weights cached). */
	useMock(): void {
		this.backendName = 'mock';
		forgetSelectedModel();
		if (this.localPhase === 'ready') this.localPhase = 'idle';
	}

	/** Chat entry point: append the question, stream the answer. */
	async ask(question: string): Promise<void> {
		const trimmed = question.trim();
		if (!trimmed || this.status === 'generating') return;

		this.messages.push({ role: 'user', content: trimmed });
		this.messages.push({ role: 'assistant', content: '' });
		const reply = this.messages[this.messages.length - 1];
		const history = this.messages.slice(0, -1);

		this.status = 'generating';
		// There is never a frozen instant: the status line shows immediately
		// and clears the moment the first real token lands.
		this.activity = 'thinking…';
		this.#abort = new AbortController();
		const bash = await this.#ensureBash();

		try {
			await this.backend.generate(history, {
				tools: false,
				signal: this.#abort.signal,
				bash,
				onEvent: (event) => {
					if (event.type === 'token') {
						this.activity = null;
						reply.content += event.text;
					} else if (event.type === 'toolCall' && event.call.name === 'bash') {
						this.activity = 'wants to run a command — see the approval card';
					} else if (event.type === 'toolCall' && event.call.name === 'search_course') {
						this.activity = event.call.args.query
							? `searching the course for “${event.call.args.query}”`
							: 'searching the course';
						(globalThis as { __tvAgentSearches?: string[] }).__tvAgentSearches?.push(
							event.call.args.query ?? ''
						);
					} else if (event.type === 'error') {
						reply.content += `${reply.content ? '\n\n' : ''}Something went wrong: ${event.message}`;
					}
				}
			});
		} catch (error) {
			reply.content += `${reply.content ? '\n\n' : ''}Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			if (reply.content === '') {
				// Aborted before the first token — drop the empty bubble.
				this.messages.pop();
			}
			this.activity = null;
			this.status = 'ready';
			this.#abort = null;
		}
	}

	/** Stop the in-flight generation, keeping whatever already streamed. */
	stop(): void {
		// A generation paused at the approval gate would otherwise hang the
		// abort — resolve the pending proposal as a denial first.
		if (this.pendingCmd !== null) {
			this.#gate.resolve('deny', { reason: 'generation stopped' });
		}
		this.#abort?.abort();
		// A playground CLI session claimed the runtime — interrupt it too.
		this.#cliStop?.();
	}

	/* ── playground CLI sessions (`agent "<task>"` in a terminal) ── */

	#cliStop: (() => void) | null = null;
	#statusBeforeCli: RuntimeStatus = 'idle';

	/**
	 * A playground terminal wants to run a CLI session on the shared backend.
	 * One generation at a time across chat + every terminal: returns false
	 * (caller prints a one-line refusal) when a chat turn or another session
	 * is in flight — CLI sessions REFUSE rather than queue, so the learner
	 * never has a terminal silently waiting on a hidden chat generation.
	 */
	beginCliSession(onStop: () => void): boolean {
		if (this.status === 'generating') return false;
		this.#cliStop = onStop;
		this.#statusBeforeCli = this.status;
		this.status = 'generating';
		this.activity = 'running in a playground terminal…';
		return true;
	}

	/** The CLI session ended (any reason) — release the runtime. */
	endCliSession(): void {
		if (this.#cliStop === null) return;
		this.#cliStop = null;
		this.activity = null;
		this.status = this.#statusBeforeCli;
	}

	clear(): void {
		this.stop();
		this.messages = [];
	}
}

export const agentRuntime = new AgentRuntime();
