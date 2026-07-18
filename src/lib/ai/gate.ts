/**
 * The approval gate: the agent proposes a command and awaits a human verdict.
 * Pure TypeScript state machine — no Svelte, no DOM — so the playground
 * agents and the unit tests drive it identically.
 *
 * One proposal is pending at a time; further proposals queue in FIFO order
 * and surface as each earlier one is resolved.
 */

export type GateDecision = 'allow' | 'deny' | 'edit';

export interface GateResolution {
	decision: GateDecision;
	/** The command to run — rewritten when the decision is 'edit'. */
	cmd: string;
	reason?: string;
}

interface Proposal {
	cmd: string;
	resolve: (r: GateResolution) => void;
}

export interface Gate {
	/** The command currently awaiting a verdict, or null. */
	readonly pending: string | null;
	/** How many proposals are waiting behind the pending one. */
	readonly queueLength: number;
	/** Agent side: propose a command, await the human's resolution. */
	propose(cmd: string): Promise<GateResolution>;
	/** UI side: resolve the pending proposal. Throws if none is pending. */
	resolve(decision: GateDecision, opts?: { cmd?: string; reason?: string }): void;
	/** UI side: subscribe to pending-command changes. Returns unsubscribe. */
	subscribe(listener: (pending: string | null) => void): () => void;
}

export function createGate(): Gate {
	let current: Proposal | null = null;
	const queue: Proposal[] = [];
	const listeners = new Set<(pending: string | null) => void>();

	function notify() {
		for (const listener of listeners) listener(current?.cmd ?? null);
	}

	return {
		get pending() {
			return current?.cmd ?? null;
		},
		get queueLength() {
			return queue.length;
		},
		propose(cmd: string): Promise<GateResolution> {
			return new Promise<GateResolution>((resolve) => {
				const proposal: Proposal = { cmd, resolve };
				if (current) {
					queue.push(proposal);
				} else {
					current = proposal;
					notify();
				}
			});
		},
		resolve(decision: GateDecision, opts?: { cmd?: string; reason?: string }) {
			if (!current) throw new Error('gate: no pending proposal to resolve');
			const settled = current;
			const resolution: GateResolution = {
				decision,
				cmd: decision === 'edit' && opts?.cmd ? opts.cmd : settled.cmd,
				reason: opts?.reason
			};
			current = queue.shift() ?? null;
			notify();
			settled.resolve(resolution);
		},
		subscribe(listener: (pending: string | null) => void) {
			listeners.add(listener);
			listener(current?.cmd ?? null);
			return () => listeners.delete(listener);
		}
	};
}
