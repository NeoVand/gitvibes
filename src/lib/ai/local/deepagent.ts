/**
 * Adapted from LangX's deep-agents harness (src/lib/deepagents/index.ts, same
 * author), trimmed for TerminalVibes: no todos / virtual filesystem /
 * subagents / skills / compaction — a single agent↔tools LangGraph loop with
 * one custom tool roster. The hard-won invariants are kept verbatim:
 *
 *  - every tool_call_id gets EXACTLY ONE ToolMessage — including gated calls
 *    the human rejects (synthesized rejection messages), unknown tools, and
 *    tools that throw (errors come back as ToolMessages, never exceptions);
 *  - interrupt() calls happen synchronously before any await (the browser
 *    async-context shim only carries graph context to the first await);
 *  - ToolMessage order matches tool_call order.
 */
import {
	StateGraph,
	START,
	END,
	MemorySaver,
	MessagesAnnotation,
	Command,
	interrupt
} from '@langchain/langgraph/web';
import { installBrowserAsyncContext } from './async-context';
import {
	AIMessage,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	type BaseMessage
} from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { StructuredToolInterface, StructuredTool, ToolInterface } from '@langchain/core/tools';

export type AnyTool = StructuredToolInterface | StructuredTool | ToolInterface;

export interface AgentHooks {
	/** Fired as each tool call begins executing (after any human gate). */
	onToolCall?: (name: string, args: Record<string, unknown>) => void;
	/** Fired with each tool's result content. */
	onToolResult?: (name: string, content: string) => void;
}

export interface CourseAgentOptions {
	model: BaseChatModel;
	tools?: AnyTool[];
	/**
	 * The system prompt, or a function producing it — called fresh on EVERY
	 * model round, so live context (e.g. the sandbox file listing) stays
	 * truthful after tools mutate state mid-turn.
	 */
	systemPrompt?: string | (() => string);
	/** Tool names that pause for a human decision before running. */
	interruptOn?: string[];
	hooks?: AgentHooks;
	maxIterations?: number;
}

/** One human decision at an interrupt — approve / edit / reject / respond. */
export type AgentDecision =
	| { type: 'approve' }
	| { type: 'edit'; args: Record<string, unknown> }
	| { type: 'reject'; message?: string }
	| { type: 'respond'; message: string };

export interface AgentInterrupt {
	tool: string;
	args: Record<string, unknown>;
	id?: string;
}

export type AgentRunResult =
	| { status: 'done'; messages: BaseMessage[] }
	| { status: 'interrupted'; interrupt: AgentInterrupt; messages: BaseMessage[] };

export interface CourseAgent {
	/** Run until completion or the first pending interrupt. */
	start(input: string, thread?: string): Promise<AgentRunResult>;
	/** Resume a paused run with a decision. */
	resume(decision: AgentDecision, thread?: string): Promise<AgentRunResult>;
}

function normalizeResume(value: unknown): AgentDecision {
	const v = value as AgentDecision | { decisions?: AgentDecision[] };
	if (
		v &&
		typeof v === 'object' &&
		'decisions' in v &&
		Array.isArray(v.decisions) &&
		v.decisions[0]
	)
		return v.decisions[0];
	if (v && typeof v === 'object' && 'type' in v) return v as AgentDecision;
	return { type: 'approve' };
}

export function createCourseAgent(opts: CourseAgentOptions): CourseAgent {
	// interrupt() needs an async-context store; the browser gets the sync shim.
	installBrowserAsyncContext();
	const tools = opts.tools ?? [];
	const toolByName = new Map(tools.map((t) => [(t as { name: string }).name, t]));
	const interruptOn = new Set(opts.interruptOn ?? []);
	const checkpointer = new MemorySaver();

	const graph = new StateGraph(MessagesAnnotation)
		.addNode('agent', async (state) => {
			let messages = state.messages as BaseMessage[];
			const promptText =
				typeof opts.systemPrompt === 'function' ? opts.systemPrompt() : opts.systemPrompt;
			if (promptText) {
				const sys = new SystemMessage(promptText);
				messages =
					messages[0] instanceof SystemMessage ? [sys, ...messages.slice(1)] : [sys, ...messages];
			}
			const modelWithTools = tools.length
				? (opts.model as unknown as { bindTools: (t: AnyTool[]) => BaseChatModel }).bindTools(tools)
				: opts.model;
			const ai = (await modelWithTools.invoke(messages)) as AIMessage;
			return { messages: [ai] };
		})
		.addNode('tools', async (state) => {
			const last = state.messages[state.messages.length - 1] as AIMessage;
			const calls = last.tool_calls ?? [];

			// PASS 1 — all interrupt() calls, SYNCHRONOUSLY, before any await.
			// A rejected/responded call is answered with a synthesized ToolMessage
			// so its tool_call_id is never left dangling.
			const synthesized = new Map<number, ToolMessage>();
			for (let i = 0; i < calls.length; i++) {
				const tc = calls[i];
				if (!interruptOn.has(tc.name)) continue;
				const decision = normalizeResume(
					interrupt({ tool: tc.name, args: tc.args, id: tc.id } satisfies AgentInterrupt)
				);
				if (decision.type === 'reject') {
					synthesized.set(
						i,
						new ToolMessage({
							content:
								`The human reviewer REJECTED ${tc.name}${decision.message ? ` with this feedback: "${decision.message}"` : '.'} ` +
								`Treat this as a change request: address the feedback, then call ${tc.name} again when ready. Do not stop here.`,
							tool_call_id: tc.id ?? '',
							name: tc.name
						})
					);
				} else if (decision.type === 'respond') {
					synthesized.set(
						i,
						new ToolMessage({
							content:
								`${tc.name} was NOT run. The human reviewer replied instead: "${decision.message}" ` +
								`Act on their reply, then call ${tc.name} again when appropriate.`,
							tool_call_id: tc.id ?? '',
							name: tc.name
						})
					);
				} else if (decision.type === 'edit' && decision.args) {
					tc.args = decision.args;
				}
			}

			// PASS 2 — execute everything the human didn't answer, in order.
			const out: ToolMessage[] = [];
			for (let i = 0; i < calls.length; i++) {
				const answered = synthesized.get(i);
				if (answered) {
					out.push(answered);
					continue;
				}
				const tc = calls[i];
				const t = toolByName.get(tc.name);
				if (!t) {
					out.push(
						new ToolMessage({
							content: `Unknown tool: ${tc.name}`,
							tool_call_id: tc.id ?? '',
							name: tc.name
						})
					);
					continue;
				}
				opts.hooks?.onToolCall?.(tc.name, tc.args as Record<string, unknown>);
				try {
					const result = await (t as { invoke: (a: unknown) => Promise<unknown> }).invoke(tc.args);
					const content = typeof result === 'string' ? result : JSON.stringify(result);
					opts.hooks?.onToolResult?.(tc.name, content);
					out.push(new ToolMessage({ content, tool_call_id: tc.id ?? '', name: tc.name }));
				} catch (e) {
					const content = `Tool ${tc.name} failed: ${e instanceof Error ? e.message : String(e)}`;
					opts.hooks?.onToolResult?.(tc.name, content);
					out.push(new ToolMessage({ content, tool_call_id: tc.id ?? '', name: tc.name }));
				}
			}
			return { messages: out };
		})
		.addEdge(START, 'agent')
		.addConditionalEdges('agent', (s) => {
			const last = s.messages[s.messages.length - 1] as AIMessage;
			return last.tool_calls?.length ? 'tools' : END;
		})
		.addEdge('tools', 'agent')
		.compile({ checkpointer });

	function readInterrupt(result: Record<string, unknown>): AgentInterrupt | null {
		const ints = result['__interrupt__'] as Array<{ value?: AgentInterrupt }> | undefined;
		const v = ints?.[0]?.value;
		return v ? { tool: v.tool, args: v.args ?? {}, id: v.id } : null;
	}

	async function run(input: unknown, thread: string): Promise<AgentRunResult> {
		const config = {
			configurable: { thread_id: thread },
			recursionLimit: opts.maxIterations ?? 24
		};
		const result = (await graph.invoke(input as never, config)) as {
			messages: BaseMessage[];
		} & Record<string, unknown>;
		const pending = readInterrupt(result);
		if (pending) return { status: 'interrupted', interrupt: pending, messages: result.messages };
		return { status: 'done', messages: result.messages };
	}

	return {
		start(input: string, thread = 'default') {
			return run({ messages: [new HumanMessage(input)] }, thread);
		},
		resume(decision: AgentDecision, thread = 'default') {
			return run(new Command({ resume: decision }), thread);
		}
	};
}
