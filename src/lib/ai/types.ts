/**
 * Shared contracts for the Agent runtime. Every backend — the deterministic
 * mock shipping now, the transformers.js local model landing next phase —
 * implements `AgentBackend`, so the UI and the approval gate never know
 * which one is talking.
 */

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	/** Links a `role: 'tool'` result back to the ToolCall that produced it. */
	toolCallId?: string;
}

export interface ToolCall {
	id: string;
	name: 'bash' | 'done' | 'search_course';
	args: { cmd?: string; summary?: string; query?: string };
}

export type AgentEvent =
	| { type: 'token'; text: string }
	| { type: 'toolCall'; call: ToolCall }
	| { type: 'doneTurn' }
	| { type: 'error'; message: string };

/** A human verdict on a proposed command (mirrors gate.ts resolutions). */
export interface AgentBashDecision {
	decision: 'allow' | 'deny' | 'edit';
	/** The command to run — rewritten when the decision is 'edit'. */
	cmd: string;
	reason?: string;
}

/**
 * The gated sandbox handed to backends: propose() pauses for the human
 * (approval card), run() executes in the agent's ShellEngine and records
 * the transcript. See bash-bridge.ts.
 */
export interface AgentBash {
	propose(cmd: string): Promise<AgentBashDecision>;
	run(cmd: string): Promise<{ output: string; error?: boolean }>;
	/**
	 * Compact current-file listing of the sandbox (one path per line). Backends
	 * inject it into the system context so demonstrations target real files.
	 */
	listing?(): string;
}

/** Where the learner is reading, for contextual suggested questions. */
export interface SuggestContext {
	/** Human label of the spot, e.g. "5.2 chmod — Permissions & Environment". */
	label: string;
	/** Course excerpts grounding the questions (top chunks for the spot). */
	snippets: string[];
}

export interface SuggestOptions {
	/** Raw suggestion tokens as they decode; the caller parses lines. */
	onToken: (text: string) => void;
	signal?: AbortSignal;
	/** Skip streaming delays (tests). Test mode always skips. */
	instant?: boolean;
}

export interface GenerateOptions {
	/** Enable the bash/done tool loop instead of plain chat. */
	tools?: boolean;
	/** Skip streaming delays (tests, prefetch). Test mode always skips. */
	instant?: boolean;
	/** Gated sandbox access; when present the agent may demonstrate in it. */
	bash?: AgentBash;
	onEvent: (e: AgentEvent) => void;
	signal?: AbortSignal;
}

/**
 * Options for a CLI session (`agent "<task>"` in a playground terminal):
 * a task-oriented loop over exactly two tools — bash (gated, bound to the
 * INVOKING terminal's engine) and done (ends the session with a summary).
 */
export interface CliRunOptions {
	/** The invoking terminal: propose() prompts the human, run() executes. */
	bash: AgentBash;
	/** Skip streaming delays (tests). Test mode always skips. */
	instant?: boolean;
	onEvent: (e: AgentEvent) => void;
	signal?: AbortSignal;
}

export interface AgentBackend {
	readonly name: string;
	generate(messages: ChatMessage[], opts: GenerateOptions): Promise<void>;
	/**
	 * Lightweight, no-tools generation of 4 short learner questions about the
	 * given reading spot, streamed as numbered lines. Optional — the panel
	 * falls back to its static starters when absent or when generation fails.
	 */
	suggest?(ctx: SuggestContext, opts: SuggestOptions): Promise<void>;
	/**
	 * Optional CLI mode. Contract: stream prose as `token` events, announce
	 * each command as a `toolCall` (name 'bash'), await `bash.propose` before
	 * running anything, and finish with a `toolCall` (name 'done',
	 * args.summary) followed by `doneTurn`.
	 */
	generateCli?(task: string, opts: CliRunOptions): Promise<void>;
}

export type RuntimeStatus = 'unavailable' | 'idle' | 'ready' | 'generating';
