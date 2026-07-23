/**
 * CliSession — the state machine behind `agent "<task>"` in a playground
 * terminal. Pure TypeScript (no Svelte, no DOM): the terminal component
 * feeds it keystroke verdicts and renders its events, and the unit tests
 * drive it with the mock backend the same way.
 *
 *   idle → generating → awaiting-approval → executing → … → done
 *                 ↘ interrupted (Ctrl+C / Esc)   ↘ error
 *
 * The approval gate is the SAME pure gate the chat panel uses (gate.ts) —
 * the backend awaits `bash.propose(cmd)` and the human's keystroke resolves
 * it: [y]/Enter → allow, [n] → deny, [e] → edit (the terminal pre-fills its
 * input with the command; submitting resolves the gate with the edit).
 */

import { createGate, type Gate, type GateDecision } from '../gate';
import type { AgentBackend, AgentBash } from '../types';

export type CliPhase =
	'idle' | 'generating' | 'awaiting-approval' | 'executing' | 'done' | 'interrupted' | 'error';

export type CliEndReason = 'done' | 'interrupted' | 'error';

export type CliEvent =
	| { type: 'prose'; text: string }
	| { type: 'proposal'; cmd: string }
	| { type: 'verdict'; decision: GateDecision; cmd: string; reason?: string }
	| { type: 'notice'; text: string; tone: 'info' | 'error' }
	| { type: 'end'; reason: CliEndReason; summary?: string; ranCount: number };

export interface CliSessionOptions {
	/** The runtime's active backend; must implement generateCli. */
	backend: AgentBackend;
	/** Execute an approved command against the INVOKING terminal's engine. */
	run: (cmd: string) => Promise<{ output: string; error?: boolean }>;
	/** Render one session event (prose stream, proposal, verdict, end…). */
	emit: (event: CliEvent) => void;
	/** Observable state changed (phase, pending command, or edit mode). */
	onUpdate?: (session: CliSession) => void;
	/** Skip streaming delays (tests). */
	instant?: boolean;
}

export class CliSession {
	#phase: CliPhase = 'idle';
	#editing = false;
	#ended = false;
	#summary: string | null = null;
	/** Commands actually executed — distinguishes real work from a no-op run. */
	#ranCount = 0;
	#gate: Gate = createGate();
	#abort: AbortController | null = null;
	#opts: CliSessionOptions;

	constructor(opts: CliSessionOptions) {
		this.#opts = opts;
	}

	get phase(): CliPhase {
		return this.#phase;
	}

	/** The command awaiting a verdict (renders the approval prompt). */
	get pendingCmd(): string | null {
		return this.#gate.pending;
	}

	/** True while [e] has handed the command to the terminal input. */
	get editing(): boolean {
		return this.#editing;
	}

	/** The session is running (keystrokes belong to it, not the shell). */
	get active(): boolean {
		return (
			this.#phase === 'generating' ||
			this.#phase === 'awaiting-approval' ||
			this.#phase === 'executing'
		);
	}

	#setPhase(phase: CliPhase): void {
		this.#phase = phase;
		this.#opts.onUpdate?.(this);
	}

	/** Run the whole session; resolves when it ends (done/denied/SIGINT). */
	async start(task: string): Promise<void> {
		if (this.#phase !== 'idle') throw new Error('cli session: start() may only be called once');
		const generateCli = this.#opts.backend.generateCli?.bind(this.#opts.backend);
		if (!generateCli) {
			this.#opts.emit({
				type: 'notice',
				text: 'agent: this backend cannot run CLI sessions.',
				tone: 'error'
			});
			this.#end('error');
			return;
		}

		this.#abort = new AbortController();
		const signal = this.#abort.signal;
		this.#setPhase('generating');

		const bash: AgentBash = {
			propose: (cmd: string) => {
				this.#opts.emit({ type: 'proposal', cmd });
				this.#setPhase('awaiting-approval');
				return this.#gate.propose(cmd);
			},
			run: async (cmd: string) => {
				this.#setPhase('executing');
				this.#ranCount++;
				try {
					return await this.#opts.run(cmd);
				} finally {
					if (!this.#ended) this.#setPhase('generating');
				}
			}
		};

		try {
			await generateCli(task, {
				bash,
				signal,
				instant: this.#opts.instant,
				onEvent: (event) => {
					if (signal.aborted) return;
					if (event.type === 'token') {
						this.#opts.emit({ type: 'prose', text: event.text });
					} else if (event.type === 'toolCall' && event.call.name === 'done') {
						this.#summary = event.call.args.summary ?? null;
					} else if (event.type === 'error') {
						this.#opts.emit({ type: 'notice', text: event.message, tone: 'error' });
					}
				}
			});
			if (!this.#ended) {
				if (signal.aborted) this.#end('interrupted');
				else this.#end('done', this.#summary ?? undefined);
			}
		} catch (e) {
			if (!this.#ended) {
				this.#opts.emit({
					type: 'notice',
					text: `agent: ${e instanceof Error ? e.message : String(e)}`,
					tone: 'error'
				});
				this.#end('error');
			}
		}
	}

	/** [y] / Enter — run the proposal as-is. */
	approve(): void {
		this.#resolve('allow');
	}

	/** [n] — reject; the agent reads the denial and adjusts (or wraps up). */
	deny(reason = 'denied by learner'): void {
		this.#resolve('deny', { reason });
	}

	/**
	 * [e] — hand the command to the terminal input for editing. Returns the
	 * command to pre-fill, or null when nothing is pending.
	 */
	beginEdit(): string | null {
		if (this.#phase !== 'awaiting-approval' || this.pendingCmd === null) return null;
		this.#editing = true;
		this.#opts.onUpdate?.(this);
		return this.pendingCmd;
	}

	/** Esc out of edit mode without a verdict — back to the [y/e/n] prompt. */
	cancelEdit(): void {
		if (!this.#editing) return;
		this.#editing = false;
		this.#opts.onUpdate?.(this);
	}

	/** Enter in edit mode — run the (possibly) rewritten command. */
	submitEdit(cmd: string): void {
		if (!this.#editing) return;
		this.#editing = false;
		const trimmed = cmd.trim();
		if (!trimmed || trimmed === this.pendingCmd) {
			this.#resolve('allow');
		} else {
			this.#resolve('edit', { cmd: trimmed });
		}
	}

	/** Ctrl+C / Esc — SIGINT: abort generation, deny any pending proposal. */
	interrupt(): void {
		if (this.#ended || this.#phase === 'idle') return;
		this.#abort?.abort();
		if (this.#gate.pending !== null) {
			this.#editing = false;
			this.#gate.resolve('deny', { reason: 'SIGINT' });
		}
		this.#end('interrupted');
	}

	#resolve(decision: GateDecision, opts?: { cmd?: string; reason?: string }): void {
		if (this.#phase !== 'awaiting-approval' || this.#gate.pending === null) return;
		const cmd = decision === 'edit' && opts?.cmd ? opts.cmd : this.#gate.pending;
		this.#opts.emit({ type: 'verdict', decision, cmd, reason: opts?.reason });
		this.#setPhase('generating');
		this.#gate.resolve(decision, opts);
	}

	#end(reason: CliEndReason, summary?: string): void {
		this.#ended = true;
		this.#editing = false;
		this.#setPhase(reason);
		this.#opts.emit({ type: 'end', reason, summary, ranCount: this.#ranCount });
	}
}
