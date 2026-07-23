/**
 * Parsing + user-facing copy for the `agent` playground command. Pure
 * string work — no Svelte, no runtime — so the unit tests drive it directly.
 *
 * The interpreter (shell-commands.ts) stays synchronous and pure, so the
 * interactive `agent` command is intercepted one layer up, in
 * TerminalPlayground, BEFORE dispatching to runShellCommand. This module is
 * that layer's grammar: it decides whether a typed line is an agent
 * invocation and, if so, which kind.
 */

export type AgentInvocation =
	{ kind: 'help' } | { kind: 'task'; task: string } | { kind: 'error'; message: string };

/**
 * Is this line an `agent` invocation, and which kind? Returns null for
 * anything that isn't an agent command (the caller falls through to the
 * normal interpreter). Quotes are honored; shell operators outside quotes
 * are rejected with a teaching message — an interactive session cannot be
 * piped or chained.
 */
export function parseAgentInvocation(line: string): AgentInvocation | null {
	const trimmed = line.trim();
	if (trimmed !== 'agent' && !/^agent\s/.test(trimmed)) return null;
	const rest = trimmed.slice('agent'.length).trim();
	if (!rest || rest === '--help' || rest === '-h' || rest === 'help') return { kind: 'help' };

	let task = '';
	let quote: '"' | "'" | null = null;
	for (const ch of rest) {
		if (quote) {
			if (ch === quote) quote = null;
			else task += ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			continue;
		}
		if ('|&;<>'.includes(ch)) {
			return {
				kind: 'error',
				message:
					'agent: runs an interactive session, so pipes, chaining, and redirection do not apply.\nusage: agent "<task>"'
			};
		}
		task += ch;
	}
	if (quote) {
		return {
			kind: 'error',
			message: `agent: missing closing ${quote} quote.\nusage: agent "<task>"`
		};
	}
	task = task.replace(/\s+/g, ' ').trim();
	if (!task) return { kind: 'help' };
	return { kind: 'task', task };
}

/** The suggestion chip in the panel playground's TRY THESE row. */
export const AGENT_TRY_TASK = 'agent "commit a note about your visit"';

/** Bare `agent` (or `agent --help`): what it is, how to drive it. */
export const AGENT_USAGE = [
	'agent — an AI agent that lives in this terminal',
	'',
	'  It runs a real language model entirely in your browser and works toward',
	'  your goal by proposing git commands — one at a time, each one waiting',
	'  for your approval. Reading a command before you allow it is the whole',
	'  lesson of this course, made real.',
	'',
	'usage:',
	'  agent "<task>"',
	'',
	'examples:',
	'  agent "commit a note about your visit"',
	'  agent "create a branch for an experiment"',
	'',
	'during a session:',
	'  [y] or Enter   allow the proposed command',
	'  [e]            edit the command before it runs',
	'  [n]            deny it and let the agent adjust',
	'  Ctrl+C / Esc   interrupt the agent (sends SIGINT)'
].join('\n');

/** `agent "<task>"` before any model has been downloaded. */
export const AGENT_NO_MODEL = [
	'agent: no local model is downloaded yet.',
	'',
	'This sandbox has a real AI agent that runs entirely in your browser —',
	'nothing leaves your machine. To wake it up, open the Agent panel (the',
	'Bot button in the header) and download a model once. Then come back',
	'and run:',
	'',
	'  agent "commit a note about your visit"'
].join('\n');

/** One generation at a time: the runtime is already busy. */
export const AGENT_BUSY =
	'agent: the agent is already working (in the chat panel or another terminal) — try again when it finishes.';

/** A downloaded model is still loading/warming from cache. */
export const AGENT_WAKING =
	'agent: the local model is still waking up — give it a few seconds and try again.';

/** Running on the scripted mock (model downloaded but not active). */
export const AGENT_MOCK_NOTE =
	'model not active — running the scripted demo agent. Activate a model in the Agent panel (Bot button) for the real thing.';
