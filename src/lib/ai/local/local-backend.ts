/**
 * The real local backend: Qwen3.5 via transformers.js in a Web Worker, driven
 * through the trimmed deep-agents loop with the search_course tool (agentic
 * RAG — the model decides when to search the course). Implements the same
 * `AgentBackend` interface as the mock, so the runtime and panel don't care
 * which is talking.
 */
import { HumanMessage, AIMessage, type BaseMessage } from '@langchain/core/messages';
import type {
	AgentBackend,
	AgentBash,
	ChatMessage,
	CliRunOptions,
	GenerateOptions,
	SuggestContext,
	SuggestOptions
} from '../types';
import { TransformersJsChatModel, disposeHost, type TjsProgress } from './transformers-js';
import { createCourseAgent, type CourseAgent } from './deepagent';
import { buildAgentTools, tutorSystemPrompt } from './tools';
import { buildSuggestionPrompt } from '../suggestions';
import { buildCliTools, CLI_SYSTEM_PROMPT } from './cli-tools';
import { attemptCascade, detectCaps, getModelSpec, type LocalModelSpec } from './models';

export interface WarmResult {
	device: 'webgpu' | 'wasm';
	/** Milliseconds the timed tiny generation took on the accepted device. */
	probeMs: number;
}

export interface WarmOptions {
	onProgress?: (p: TjsProgress) => void;
	/** Phase notes for the UI: 'loading (webgpu)…', 'warming up (wasm)…'. */
	onPhase?: (phase: string) => void;
	initTimeoutMs?: number;
	probeTimeoutMs?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		p.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			}
		);
	});
}

/**
 * Marker-guard for live token streaming: shows the model's prose as it
 * decodes, but hides tool-call syntax and <think> blocks. Because markers
 * can arrive split across tokens, a holdback tail (the longest buffer
 * suffix that could still become a marker) is withheld until disambiguated.
 */
const HIDE_FOREVER = ['<|tool_call_start|>', '<tool_call>', '<function='];
const THINK_OPEN = '<think>';
const THINK_CLOSE = '</think>';
const ALL_MARKERS = [...HIDE_FOREVER, THINK_OPEN];

export class StreamFilter {
	#buf = '';
	#thinking = false;
	#suppressed = false;
	#emitted = 0;

	constructor(private emit: (t: string) => void) {}

	get emittedChars(): number {
		return this.#emitted;
	}

	/** A new model call begins (next graph round): tool syntax may show again. */
	nextCall(): void {
		this.#buf = '';
		this.#thinking = false;
		this.#suppressed = false;
		if (this.#emitted > 0) {
			this.#send('\n\n');
		}
	}

	push(text: string): void {
		if (this.#suppressed && !this.#thinking) return;
		this.#buf += text;
		this.#drain(false);
	}

	/** End of the turn: release any held-back tail that never became a marker. */
	flush(): void {
		this.#drain(true);
	}

	#send(text: string): void {
		if (!text) return;
		this.#emitted += text.length;
		this.emit(text);
	}

	#drain(final: boolean): void {
		for (;;) {
			if (this.#thinking) {
				const close = this.#buf.indexOf(THINK_CLOSE);
				if (close < 0) {
					// Keep only enough tail to detect a split closing tag.
					this.#buf = this.#buf.slice(-THINK_CLOSE.length);
					return;
				}
				this.#buf = this.#buf.slice(close + THINK_CLOSE.length).replace(/^\s+/, '');
				this.#thinking = false;
				continue;
			}
			if (this.#suppressed) {
				this.#buf = '';
				return;
			}

			// Earliest full marker in the buffer?
			let at = -1;
			let marker = '';
			for (const m of ALL_MARKERS) {
				const i = this.#buf.indexOf(m);
				if (i >= 0 && (at < 0 || i < at)) {
					at = i;
					marker = m;
				}
			}
			if (at >= 0) {
				this.#send(
					this.#buf
						.slice(0, at)
						.replace(/\s+$/, final ? '' : ' ')
						.trimEnd()
				);
				this.#buf = this.#buf.slice(at + marker.length);
				if (marker === THINK_OPEN) {
					this.#thinking = true;
				} else {
					// Tool syntax to the end of this call — the parser handles it.
					this.#suppressed = true;
				}
				continue;
			}

			// No full marker: hold back the longest tail that could still
			// become one, emit the rest.
			let hold = 0;
			if (!final) {
				for (let len = Math.min(this.#buf.length, 20); len > 0; len--) {
					const tail = this.#buf.slice(-len);
					if (ALL_MARKERS.some((m) => m.startsWith(tail))) {
						hold = len;
						break;
					}
				}
			}
			let emitPart = hold > 0 ? this.#buf.slice(0, -hold) : this.#buf;
			let rest = hold > 0 ? this.#buf.slice(-hold) : '';
			if (!final) {
				// Hold trailing whitespace too: if a marker follows next, the
				// visible prose ends clean instead of with a dangling space.
				const ws = emitPart.match(/\s+$/);
				if (ws) {
					rest = ws[0] + rest;
					emitPart = emitPart.slice(0, -ws[0].length);
				}
			}
			this.#send(emitPart);
			this.#buf = rest;
			return;
		}
	}
}

export class LocalBackend implements AgentBackend {
	readonly name = 'local';
	readonly spec: LocalModelSpec;
	device: 'webgpu' | 'wasm' | null = null;
	probeMs: number | null = null;
	/** Which devices survived (or failed) the warm-up probe. */
	probed: { webgpu?: boolean; wasm?: boolean } = {};

	#model: TransformersJsChatModel | null = null;
	#agent: CourseAgent | null = null;
	#bash: AgentBash | null = null;
	#thread = `chat-${Date.now()}`;
	#turnsInThread = 0;

	constructor(modelId: string) {
		const spec = getModelSpec(modelId);
		if (!spec) throw new Error(`Unknown local model: ${modelId}`);
		this.spec = spec;
	}

	/**
	 * Load the model with LangX's kokoro-style warm-up guard: walk the device
	 * cascade (webgpu → wasm where allowed), and only accept a device after a
	 * timed tiny generation actually produces text — a pipeline that loads but
	 * can't generate (broken WebGPU adapters do exactly this) falls through to
	 * the next device instead of shipping a dead chatbot.
	 */
	async warm(opts: WarmOptions = {}): Promise<WarmResult> {
		const attempts = attemptCascade(this.spec, detectCaps());
		if (attempts.length === 0) {
			throw new Error(`${this.spec.label} is not supported on this device.`);
		}
		const initTimeout = opts.initTimeoutMs ?? 600_000; // first run downloads weights
		const probeTimeout = opts.probeTimeoutMs ?? 120_000; // first inference compiles kernels

		let lastError: Error | null = null;
		for (const device of attempts) {
			try {
				opts.onPhase?.(`loading (${device})`);
				const model = new TransformersJsChatModel({
					model: this.spec.id,
					dtype: this.spec.dtype,
					device,
					maxNewTokens: 512,
					temperature: 0.2,
					onProgress: opts.onProgress
				});
				await withTimeout(model.warm(opts.onProgress), initTimeout, `${device} init`);

				opts.onPhase?.(`warming up (${device})`);
				const started = performance.now();
				const out = await withTimeout(
					model.host.generate(
						[new HumanMessage('Reply with the single word: ok')],
						undefined,
						false,
						undefined,
						8
					),
					probeTimeout,
					`${device} warm-up generate`
				);
				if (typeof out !== 'string') throw new Error('warm-up produced no text');
				this.probeMs = Math.round(performance.now() - started);
				this.probed[device] = true;
				this.device = device;
				this.#model = model;
				this.#agent = null;
				return { device, probeMs: this.probeMs };
			} catch (e) {
				this.probed[device] = false;
				lastError = e instanceof Error ? e : new Error(String(e));
				// Drop the failed worker before trying the next device.
				disposeHost();
			}
		}
		throw lastError ?? new Error('No usable device for the local model.');
	}

	#ensureAgent(onEvent: GenerateOptions['onEvent']): CourseAgent {
		if (!this.#model) throw new Error('LocalBackend.warm() must succeed before generate().');
		if (!this.#agent) {
			// The bash tool executes through a delegate so the bridge handed to
			// the CURRENT generate() call is always the one that runs — the
			// agent (and its tool closures) is built once per backend.
			const bashDelegate: AgentBash = {
				propose: (cmd) => {
					if (!this.#bash) return Promise.resolve({ decision: 'deny' as const, cmd });
					return this.#bash.propose(cmd);
				},
				run: (cmd) => {
					if (!this.#bash) throw new Error('No sandbox terminal is available right now.');
					return this.#bash.run(cmd);
				}
			};
			this.#agent = createCourseAgent({
				model: this.#model,
				tools: buildAgentTools({ bash: bashDelegate }),
				// Rebuilt per model round: the tutor contract plus a live snapshot
				// of the sandbox files, so demos always target paths that exist —
				// even after the agent's own commands mutated the VFS mid-turn.
				systemPrompt: () => tutorSystemPrompt(this.#bash?.listing?.() ?? null),
				// Every bash call pauses for a human verdict BEFORE executing.
				interruptOn: ['bash'],
				hooks: {
					onToolCall: (name, args) => {
						onEvent({
							type: 'toolCall',
							call: {
								id: `call-${Date.now().toString(36)}`,
								name: name === 'search_course' ? 'search_course' : 'bash',
								args: {
									query: typeof args.query === 'string' ? args.query : undefined,
									cmd: typeof args.cmd === 'string' ? args.cmd : undefined
								}
							}
						});
					}
				},
				maxIterations: 12
			});
		}
		return this.#agent;
	}

	async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<void> {
		const { onEvent, signal } = opts;
		if (signal?.aborted) return;

		const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
		// A fresh conversation (first user turn) gets a fresh checkpointer thread;
		// within a conversation the MemorySaver carries the full agent history.
		const userTurns = messages.filter((m) => m.role === 'user').length;
		if (userTurns <= 1 || userTurns <= this.#turnsInThread) {
			this.#thread = `chat-${Date.now()}`;
			this.#turnsInThread = 0;
		}
		this.#turnsInThread = userTurns;

		this.#bash = opts.bash ?? null;
		const agent = this.#ensureAgent(onEvent);

		// Live streaming: real tokens flow from the worker into the pending
		// assistant message as they decode; the filter hides tool syntax and
		// thinking. The whole multi-round turn streams into ONE message.
		const filter = new StreamFilter((t) => {
			if (!signal?.aborted) onEvent({ type: 'token', text: t });
		});
		const host = this.#model!.host;
		host.modelOpts.onCallStart = () => filter.nextCall();
		host.modelOpts.onLiveToken = (t) => {
			if (!signal?.aborted) filter.push(t);
		};

		try {
			let result = await agent.start(question, this.#thread);

			// The interrupt loop: every gated bash call surfaces as an approval
			// card (gate.propose) and the human's verdict resumes the graph.
			while (result.status === 'interrupted') {
				if (signal?.aborted) return;
				const cmd = String(result.interrupt.args.cmd ?? '');
				if (result.interrupt.tool !== 'bash' || !this.#bash) {
					result = await agent.resume(
						{ type: 'reject', message: 'No sandbox terminal is available right now.' },
						this.#thread
					);
					continue;
				}
				onEvent({
					type: 'toolCall',
					call: { id: `gate-${Date.now().toString(36)}`, name: 'bash', args: { cmd } }
				});
				const verdict = await this.#bash.propose(cmd);
				if (signal?.aborted) return;
				const decision =
					verdict.decision === 'allow'
						? ({ type: 'approve' } as const)
						: verdict.decision === 'edit'
							? ({ type: 'edit', args: { cmd: verdict.cmd } } as const)
							: ({ type: 'reject', message: verdict.reason } as const);
				result = await agent.resume(decision, this.#thread);
			}
			if (signal?.aborted) return;
			filter.flush();

			// Fallback: if the entire turn produced no visible tokens (e.g. the
			// model answered wholly inside a think block), stream the parsed
			// final answer word-by-word instead.
			if (filter.emittedChars === 0) {
				const answer = finalAnswer(result.messages);
				const instant = opts.instant || import.meta.env.MODE === 'test';
				for (const word of answer.match(/\S+\s*/g) ?? []) {
					if (signal?.aborted) return;
					onEvent({ type: 'token', text: word });
					if (!instant) await new Promise((r) => setTimeout(r, 12));
				}
			}
			if (signal?.aborted) return;
			onEvent({ type: 'doneTurn' });
		} catch (e) {
			if (signal?.aborted) return;
			onEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
			onEvent({ type: 'doneTurn' });
		} finally {
			host.modelOpts.onCallStart = undefined;
			host.modelOpts.onLiveToken = undefined;
		}
	}

	/**
	 * Lightweight no-tools generation of 4 suggested questions: one direct
	 * worker call (no agent graph, no search_course), a small token budget,
	 * and the same marker-guard filter chat uses so <think> blocks or stray
	 * tool syntax never leak into the chips. The worker serializes jobs, so
	 * this never corrupts a chat generation — at worst it queues ahead of one,
	 * which is why the budget stays small.
	 */
	async suggest(ctx: SuggestContext, opts: SuggestOptions): Promise<void> {
		if (!this.#model) throw new Error('LocalBackend.warm() must succeed before suggest().');
		if (opts.signal?.aborted) return;
		const filter = new StreamFilter((t) => {
			if (!opts.signal?.aborted) opts.onToken(t);
		});
		await this.#model.host.generate(
			[new HumanMessage(buildSuggestionPrompt(ctx))],
			(t) => {
				if (!opts.signal?.aborted) filter.push(t);
			},
			true,
			undefined,
			160
		);
		filter.flush();
	}

	/**
	 * CLI mode (`agent "<task>"` in a playground terminal): a fresh one-shot
	 * agent over the SAME loaded model/worker, with the CLI tool roster —
	 * bash bound to the invoking terminal + done. Both are interruptOn:
	 * bash pauses for the human verdict, and done ends the session by simply
	 * never being resumed. Streaming reuses the exact StreamFilter plumbing
	 * of generate(); sessions and chat turns are mutually exclusive (the
	 * runtime enforces one generation at a time), so swapping the host's
	 * live-token hooks is safe.
	 */
	async generateCli(task: string, opts: CliRunOptions): Promise<void> {
		const { onEvent, signal } = opts;
		if (signal?.aborted) return;
		if (!this.#model) throw new Error('LocalBackend.warm() must succeed before generateCli().');

		const agent = createCourseAgent({
			model: this.#model,
			tools: buildCliTools({ bash: opts.bash }),
			systemPrompt: CLI_SYSTEM_PROMPT,
			interruptOn: ['bash', 'done'],
			maxIterations: 16
		});
		const thread = `cli-${Date.now().toString(36)}`;

		const filter = new StreamFilter((t) => {
			if (!signal?.aborted) onEvent({ type: 'token', text: t });
		});
		const host = this.#model.host;
		host.modelOpts.onCallStart = () => filter.nextCall();
		host.modelOpts.onLiveToken = (t) => {
			if (!signal?.aborted) filter.push(t);
		};

		let ranCount = 0;
		let nudgedEmptyDone = false;
		try {
			let result = await agent.start(task, thread);
			while (result.status === 'interrupted') {
				if (signal?.aborted) return;
				const pending = result.interrupt;
				if (pending.tool === 'done') {
					// Small instruct models sometimes call done as their very first
					// move, completing nothing. Push back once and make it act.
					if (ranCount === 0 && !nudgedEmptyDone) {
						nudgedEmptyDone = true;
						result = await agent.resume(
							{
								type: 'reject',
								message:
									"You haven't run any commands yet, so the task is NOT done. Propose the " +
									'first bash command that makes progress on the task now — one command at a ' +
									'time. Do not call done again until you have actually run commands.'
							},
							thread
						);
						continue;
					}
					filter.flush();
					onEvent({
						type: 'toolCall',
						call: {
							id: `done-${Date.now().toString(36)}`,
							name: 'done',
							args: { summary: String(pending.args.summary ?? '') }
						}
					});
					onEvent({ type: 'doneTurn' });
					return;
				}
				if (pending.tool !== 'bash') {
					result = await agent.resume(
						{ type: 'reject', message: `The tool ${pending.tool} is not available here.` },
						thread
					);
					continue;
				}
				const cmd = String(pending.args.cmd ?? '');
				onEvent({
					type: 'toolCall',
					call: { id: `gate-${Date.now().toString(36)}`, name: 'bash', args: { cmd } }
				});
				const verdict = await opts.bash.propose(cmd);
				if (signal?.aborted) return;
				const decision =
					verdict.decision === 'allow'
						? ({ type: 'approve' } as const)
						: verdict.decision === 'edit'
							? ({ type: 'edit', args: { cmd: verdict.cmd } } as const)
							: ({ type: 'reject', message: verdict.reason } as const);
				if (verdict.decision !== 'deny') ranCount++;
				result = await agent.resume(decision, thread);
			}
			// The model stopped calling tools without done — flush whatever
			// prose it produced and end the session gracefully.
			if (signal?.aborted) return;
			filter.flush();
			onEvent({ type: 'doneTurn' });
		} catch (e) {
			if (signal?.aborted) return;
			onEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) });
			onEvent({ type: 'doneTurn' });
		} finally {
			host.modelOpts.onCallStart = undefined;
			host.modelOpts.onLiveToken = undefined;
		}
	}

	dispose() {
		disposeHost();
		this.#model = null;
		this.#agent = null;
		this.device = null;
	}
}

function finalAnswer(messages: BaseMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m instanceof AIMessage) {
			const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
			if (text.trim()) return text.trim();
		}
	}
	return "I couldn't produce an answer for that — try rephrasing your question.";
}
