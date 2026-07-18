/**
 * Lifted from LangX (src/lib/runtime/llm/transformers-js.ts, same author):
 * WorkerHost + TransformersJsChatModel + the tolerant tool-call parser.
 * Adapted for TerminalVibes: LangX's global download-banner stores are
 * replaced by the `onProgress` callback (the agent runtime owns UI state),
 * and the shared-host global slot is renamed. Everything hard-won is kept —
 * single shared worker, model swap disposes the old one, tool calls parsed
 * out of raw text with fallbacks, streaming via a pull queue.
 */
import {
	BaseChatModel,
	type BaseChatModelParams,
	type BaseChatModelCallOptions,
	type BindToolsInput
} from '@langchain/core/language_models/chat_models';
import {
	AIMessage,
	AIMessageChunk,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	type BaseMessage
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';

// Plain runtime check instead of SvelteKit's $app/environment so this module
// stays importable from vitest (node) without aliasing.
const browser = typeof window !== 'undefined' && typeof Worker !== 'undefined';

/** Call options carry the tools bound via `.bindTools([...])`. */
export interface TransformersJsCallOptions extends BaseChatModelCallOptions {
	tools?: unknown[];
}

export interface TjsProgress {
	status?: string;
	progress?: number;
	file?: string;
}

export interface TransformersJsModelOptions extends BaseChatModelParams {
	model: string;
	dtype?: string;
	device?: 'webgpu' | 'wasm' | 'auto';
	maxNewTokens?: number;
	temperature?: number;
	onProgress?: (p: TjsProgress) => void;
	/** Live token tap for EVERY generate — including tools-bound calls. */
	onLiveToken?: (t: string) => void;
	/** Fired when a model call starts (per graph round) — resets UI filters. */
	onCallStart?: () => void;
}

interface PendingJob {
	resolve: (value: string) => void;
	reject: (err: Error) => void;
	tokens: string[];
	onToken?: (t: string) => void;
}

export class WorkerHost {
	worker: Worker | null = null;
	ready = false;
	private waitReady: Promise<void> | null = null;
	private jobs = new Map<string, PendingJob>();
	private modelId: string | null = null;

	constructor(public modelOpts: TransformersJsModelOptions) {}

	private id() {
		return Math.random().toString(36).slice(2, 10);
	}

	private ensureWorker() {
		if (!browser) throw new Error('Transformers.js can only run in the browser.');
		if (this.worker) return;
		this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		this.worker.addEventListener('message', (ev: MessageEvent) => this.handle(ev.data));
	}

	private handle(msg: {
		type: string;
		id?: string;
		text?: string;
		message?: string;
		payload?: TjsProgress;
	}) {
		if (msg.type === 'progress' && msg.payload) {
			this.modelOpts.onProgress?.(msg.payload);
			return;
		}
		if (!msg.id) return;
		const job = this.jobs.get(msg.id);
		if (!job && msg.type !== 'ready') return;
		if (msg.type === 'token' && msg.text != null) {
			job!.tokens.push(msg.text);
			job!.onToken?.(msg.text);
		} else if (msg.type === 'done') {
			job!.resolve(msg.text ?? job!.tokens.join(''));
			this.jobs.delete(msg.id);
		} else if (msg.type === 'error') {
			job!.reject(new Error(msg.message || 'Worker error'));
			this.jobs.delete(msg.id);
		} else if (msg.type === 'ready') {
			this.modelId = this.modelOpts.model;
			this.ready = true;
		}
	}

	async ensureReady() {
		this.ensureWorker();
		if (this.ready && this.modelId === this.modelOpts.model) return;
		if (this.waitReady) return this.waitReady;
		this.waitReady = new Promise<void>((resolve, reject) => {
			const id = this.id();
			const onReady = (ev: MessageEvent) => {
				const msg = ev.data as { type: string; id?: string; message?: string };
				if (msg.id !== id) return;
				if (msg.type === 'ready') {
					this.worker!.removeEventListener('message', onReady);
					this.ready = true;
					this.modelId = this.modelOpts.model;
					resolve();
				} else if (msg.type === 'error') {
					this.worker!.removeEventListener('message', onReady);
					reject(new Error(msg.message || 'init error'));
				}
			};
			this.worker!.addEventListener('message', onReady);
			this.worker!.postMessage({
				type: 'init',
				id,
				model: this.modelOpts.model,
				dtype: this.modelOpts.dtype,
				device: this.modelOpts.device ?? 'webgpu'
			});
		});
		try {
			await this.waitReady;
		} finally {
			this.waitReady = null;
		}
	}

	/** Tear down the worker (and free the model it holds in memory). */
	dispose() {
		this.worker?.terminate();
		this.worker = null;
		this.ready = false;
		this.modelId = null;
		this.waitReady = null;
		this.jobs.clear();
	}

	async generate(
		messages: BaseMessage[],
		onToken?: (t: string) => void,
		stream = true,
		tools?: unknown[],
		maxNewTokens?: number
	) {
		await this.ensureReady();
		this.modelOpts.onCallStart?.();
		return new Promise<string>((resolve, reject) => {
			const id = this.id();
			this.jobs.set(id, { resolve, reject, tokens: [], onToken });
			this.worker!.postMessage({
				type: 'generate',
				id,
				messages: messagesToChatTemplate(messages),
				max_new_tokens: maxNewTokens ?? this.modelOpts.maxNewTokens ?? 512,
				temperature: this.modelOpts.temperature ?? 0.7,
				stream,
				tools
			});
		});
	}
}

// Keep the worker on globalThis so it's a single shared instance for the whole app and
// survives dev HMR module re-execution — the model loads into memory once. Switching
// models terminates the old worker first, so we never hold two model copies at once.
const _g = globalThis as unknown as { __tvTjs?: { host: WorkerHost | null; key: string } };
_g.__tvTjs ??= { host: null, key: '' };

export function getHost(opts: TransformersJsModelOptions): WorkerHost {
	const key = `${opts.model}|${opts.dtype}|${opts.device ?? 'webgpu'}`;
	const slot = _g.__tvTjs!;
	if (slot.host && slot.key === key) {
		slot.host.modelOpts = opts;
		return slot.host;
	}
	slot.host?.dispose();
	slot.host = new WorkerHost(opts);
	slot.key = key;
	return slot.host;
}

/** Drop the shared host entirely (used when a device attempt fails mid-probe). */
export function disposeHost() {
	const slot = _g.__tvTjs!;
	slot.host?.dispose();
	slot.host = null;
	slot.key = '';
}

export class TransformersJsChatModel extends BaseChatModel<TransformersJsCallOptions> {
	host: WorkerHost;

	constructor(public opts: TransformersJsModelOptions) {
		super(opts);
		this.host = getHost(opts);
	}

	_llmType() {
		return 'transformers-js';
	}

	/**
	 * Bind tools the same way every other chat model does — convert to the OpenAI
	 * tool schema and carry them as a call option. The worker advertises them via the
	 * model's chat template, and `_generate` parses any tool calls back out.
	 */
	override bindTools(tools: BindToolsInput[], kwargs?: Partial<TransformersJsCallOptions>) {
		return this.withConfig({
			tools: tools.map((t) => convertToOpenAITool(t)),
			...kwargs
		} as Partial<TransformersJsCallOptions>);
	}

	async warm(onProgress?: (p: TjsProgress) => void) {
		if (onProgress) this.host.modelOpts.onProgress = onProgress;
		await this.host.ensureReady();
	}

	async _generate(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		runManager?: CallbackManagerForLLMRun
	): Promise<ChatResult> {
		const tools = options.tools;
		// Tokens stream live even with tools bound: the UI taps them through
		// `onLiveToken` (with a marker-guard that hides tool-call syntax), and
		// tool calls are parsed from the completed text afterwards.
		const raw = await this.host.generate(
			messages,
			(t) => {
				this.host.modelOpts.onLiveToken?.(t);
				void runManager?.handleLLMNewToken(t);
			},
			true,
			tools
		);
		const { content, toolCalls } = parseToolCalls(raw);
		const message = new AIMessage({ content, tool_calls: toolCalls });
		return { generations: [{ text: content, message }] };
	}

	async *_streamResponseChunks(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		runManager?: CallbackManagerForLLMRun
	) {
		// Tool calls can't be streamed token-by-token; generate fully, parse, and emit
		// a single final chunk that carries the tool-call chunks.
		if (options.tools?.length) {
			const raw = await this.host.generate(messages, undefined, false, options.tools);
			const { content, toolCalls } = parseToolCalls(raw);
			if (content) await runManager?.handleLLMNewToken(content);
			yield new ChatGenerationChunk({
				text: content,
				message: new AIMessageChunk({
					content,
					tool_call_chunks: toolCalls.map((tc, i) => ({
						name: tc.name,
						args: JSON.stringify(tc.args),
						id: tc.id,
						index: i,
						type: 'tool_call_chunk' as const
					}))
				})
			});
			return;
		}

		const queue: { text: string }[] = [];
		let done = false;
		let err: Error | null = null;
		let resume: (() => void) | null = null;

		const promise = this.host
			.generate(messages, (t) => {
				queue.push({ text: t });
				resume?.();
			})
			.catch((e: Error) => {
				err = e;
			})
			.finally(() => {
				done = true;
				resume?.();
			});

		while (!done || queue.length) {
			if (queue.length === 0) {
				await new Promise<void>((res) => (resume = res));
				resume = null;
				continue;
			}
			const item = queue.shift()!;
			await runManager?.handleLLMNewToken(item.text);
			yield new ChatGenerationChunk({
				text: item.text,
				message: new AIMessageChunk({ content: item.text })
			});
		}
		await promise;
		if (err) throw err;
	}
}

function roleFor(m: BaseMessage): string {
	if (m instanceof SystemMessage) return 'system';
	if (m instanceof HumanMessage) return 'user';
	if (m instanceof ToolMessage) return 'tool';
	if (m instanceof AIMessage) return 'assistant';
	return 'user';
}

function messagesToChatTemplate(messages: BaseMessage[]) {
	return messages.map((m) => ({
		role: roleFor(m),
		content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
	}));
}

function toolCallId() {
	return 'call_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Pull tool calls out of a local model's raw output. Handles BOTH formats
 * Qwen-family templates produce:
 *  - Hermes JSON: `<tool_call>{"name":...,"arguments":{...}}</tool_call>`
 *  - Qwen3.5 XML: `<tool_call><function=bash><parameter=cmd>…</parameter></function></tool_call>`
 * plus a lone top-level JSON object as a last resort. Any `<think>` reasoning
 * is stripped, everything after a hallucinated `<tool_response>` (small models
 * love to imagine the whole conversation) is discarded, and the leftover
 * prose becomes the message content.
 */
export function parseToolCalls(raw: string): { content: string; toolCalls: ToolCall[] } {
	let text = (raw ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
	// Everything from the first (hallucinated) tool_response onward is the
	// model imagining results it never received — cut it.
	const fake = text.indexOf('<tool_response>');
	if (fake >= 0) text = text.slice(0, fake);
	const toolCalls: ToolCall[] = [];

	// ── LFM branch: Pythonic call list between <|tool_call_start|> tokens ──
	const lfm = parseLfmToolCalls(text);
	if (lfm.toolCalls.length > 0) return lfm;

	const re = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const tc = coerceToolCall(m[1]) ?? coerceXmlToolCall(m[1]);
		if (tc) toolCalls.push(tc);
	}

	// An unterminated trailing block (generation stopped mid-call) still counts.
	if (toolCalls.length === 0) {
		const open = text.match(/<tool_call>\s*([\s\S]+)$/);
		if (open) {
			const tc = coerceToolCall(open[1]) ?? coerceXmlToolCall(open[1]);
			if (tc) {
				return { content: text.slice(0, open.index).trim(), toolCalls: [tc] };
			}
		}
	}

	if (toolCalls.length > 0) {
		const content = text.slice(0, text.indexOf('<tool_call>')).trim();
		return { content, toolCalls };
	}

	// No tags — some templates emit a bare JSON object for a single call.
	const bare = text.match(/\{[\s\S]*"(?:name)"[\s\S]*\}/);
	if (bare) {
		const tc = coerceToolCall(bare[0]);
		if (tc) return { content: '', toolCalls: [tc] };
	}

	return { content: text, toolCalls: [] };
}

/* ── LFM2/LFM2.5 Pythonic tool calls ─────────────────────────────────────
 * Adapted from LiquidAI's official LFM2-WebGPU Space (src/utils.ts —
 * `parseArguments` / `extractPythonicCalls` / `parsePythonicCalls`), with
 * Python-literal coercion and truncation salvage added. LFM emits e.g.
 *   <|tool_call_start|>[bash(cmd="printf 'a\n' > f.txt")]<|tool_call_end|>
 * — possibly multiple calls in one list, possibly a single bare call, and
 * (when special tokens are stripped by decoding) possibly with no marker
 * tokens at all, leaving just the bare Pythonic list as the whole output.
 */

/** Split a Pythonic argument string on top-level commas (quote/paren aware). */
function splitPyArguments(argsString: string): string[] {
	const args: string[] = [];
	let current = '';
	let inQuotes = false;
	let quoteChar = '';
	let depth = 0;
	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];
		const prev = argsString[i - 1];
		if (!inQuotes && (char === '"' || char === "'")) {
			inQuotes = true;
			quoteChar = char;
			current += char;
		} else if (inQuotes && char === quoteChar && prev !== '\\') {
			inQuotes = false;
			quoteChar = '';
			current += char;
		} else if (!inQuotes && (char === '(' || char === '[' || char === '{')) {
			depth++;
			current += char;
		} else if (!inQuotes && (char === ')' || char === ']' || char === '}')) {
			depth--;
			current += char;
		} else if (!inQuotes && char === ',' && depth === 0) {
			args.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) args.push(current.trim());
	return args;
}

/** Coerce a Pythonic literal: JSON first, then quoted-string unescape, then keywords. */
function pyValue(rawValue: string): unknown {
	const t = rawValue.trim();
	try {
		return JSON.parse(t);
	} catch {
		/* not JSON */
	}
	if (
		t.length >= 2 &&
		((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')))
	) {
		return t
			.slice(1, -1)
			.replace(/\\(['"\\nt])/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
	}
	if (t === 'True') return true;
	if (t === 'False') return false;
	if (t === 'None') return null;
	return t;
}

/** One `name(arg=..., ...)` call → ToolCall, or null. */
function coercePythonicCall(command: string): ToolCall | null {
	const callMatch = command.trim().match(/^([a-zA-Z0-9_]+)\((([\s\S])*)\)$/);
	if (!callMatch) return null;
	const name = callMatch[1];
	const args: Record<string, unknown> = {};
	const positional: unknown[] = [];
	for (const arg of splitPyArguments(callMatch[2])) {
		const kwarg = arg.match(/^([a-zA-Z0-9_]+)\s*=\s*([\s\S]*)$/);
		if (kwarg) {
			args[kwarg[1]] = pyValue(kwarg[2]);
		} else if (arg) {
			positional.push(pyValue(arg));
		}
	}
	// Our tools are keyword-first; map a lone positional onto the tool's
	// single parameter so `bash("ls")` still works.
	if (positional.length === 1 && Object.keys(args).length === 0) {
		const paramFor: Record<string, string> = {
			bash: 'cmd',
			search_course: 'query',
			done: 'summary'
		};
		args[paramFor[name] ?? 'input'] = positional[0];
	}
	return { name, args, id: toolCallId(), type: 'tool_call' };
}

/** Salvage a call truncated mid-generation: close open quote/paren and retry. */
function salvagePythonicCall(fragment: string): ToolCall | null {
	const t = fragment.trim().replace(/[\])]*$/, '');
	if (!/^[a-zA-Z0-9_]+\(/.test(t)) return null;
	const quotes = (t.match(/(?<!\\)"/g) ?? []).length;
	const closed = t + (quotes % 2 === 1 ? '"' : '') + ')';
	return coercePythonicCall(closed);
}

/** The LFM branch of parseToolCalls. */
export function parseLfmToolCalls(text: string): { content: string; toolCalls: ToolCall[] } {
	const toolCalls: ToolCall[] = [];
	let content = text;

	const tokenRe = /<\|tool_call_start\|>([\s\S]*?)(?:<\|tool_call_end\|>|$)/g;
	const blocks: string[] = [];
	let bareBranch = false;
	if (text.includes('<|tool_call_start|>')) {
		let m: RegExpExecArray | null;
		while ((m = tokenRe.exec(text)) !== null) blocks.push(m[1]);
		content = text.slice(0, text.indexOf('<|tool_call_start|>')).trim();
	} else {
		// Special tokens may be stripped by decoding: accept output whose
		// trailing text is a bare Pythonic call list — but ONLY for names in
		// our actual tool roster, so prose like "see wc(1)" can't misparse.
		const bare = text.trim().match(/^([\s\S]*?)(\[?\s*(?:bash|search_course|done)\([\s\S]*)$/);
		if (bare) {
			bareBranch = true;
			blocks.push(bare[2]);
			content = bare[1].trim();
		}
	}

	for (const block of blocks) {
		let inner = block.trim();
		if (inner.startsWith('[')) {
			inner = inner.endsWith(']') ? inner.slice(1, -1) : inner.slice(1);
		}
		for (const callStr of splitPyArguments(inner)) {
			const tc = coercePythonicCall(callStr) ?? salvagePythonicCall(callStr);
			if (tc && (!bareBranch || ['bash', 'search_course', 'done'].includes(tc.name))) {
				toolCalls.push(tc);
			}
		}
	}

	if (toolCalls.length === 0) return { content: text, toolCalls: [] };
	return { content, toolCalls };
}

/**
 * Qwen3.5's XML function-call format:
 *   <function=bash>
 *   <parameter=cmd>echo hi > note.txt</parameter>
 *   </function>
 */
export function coerceXmlToolCall(block: string): ToolCall | null {
	const fn = block.match(/<function=([\w.-]+)>/);
	if (!fn) return null;
	const args: Record<string, unknown> = {};
	for (const p of block.matchAll(/<parameter=([\w.-]+)>\s*([\s\S]*?)\s*<\/parameter>/g)) {
		args[p[1]] = p[2];
	}
	// A parameter left open at the end of generation still carries its value.
	const openParam = block.match(/<parameter=([\w.-]+)>\s*([\s\S]*?)$/);
	if (openParam && !(openParam[1] in args)) {
		args[openParam[1]] = openParam[2].replace(/<\/?[\w=./-]*>?\s*$/g, '').trim();
	}
	return { name: fn[1], args, id: toolCallId(), type: 'tool_call' };
}

export function coerceToolCall(json: string): ToolCall | null {
	try {
		const obj = JSON.parse(json.trim()) as {
			name?: string;
			arguments?: unknown;
			args?: unknown;
			parameters?: unknown;
		};
		if (!obj.name) return null;
		let args = obj.arguments ?? obj.args ?? obj.parameters ?? {};
		if (typeof args === 'string') {
			try {
				args = JSON.parse(args);
			} catch {
				args = { input: args };
			}
		}
		return {
			name: obj.name,
			args: (args ?? {}) as Record<string, unknown>,
			id: toolCallId(),
			type: 'tool_call'
		};
	} catch {
		return null;
	}
}
