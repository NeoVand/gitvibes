/**
 * Drives the trimmed deep-agents loop with a scripted fake chat model — no
 * weights, no worker, no network. Verifies the LangX invariants survived the
 * lift: tool loop runs, every tool_call_id is answered exactly once (incl.
 * human rejections and unknown/throwing tools), and citations flow through.
 */
import { describe, expect, it } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons';

// Under Node (vitest), langgraph's interrupt() needs a real AsyncLocalStorage;
// in the browser the langgraph/web entry installs its own shim.
AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage());
import { BaseChatModel, type BindToolsInput } from '@langchain/core/language_models/chat_models';
import { AIMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createCourseAgent, type AnyTool } from './deepagent';
import { buildAgentTools, TUTOR_SYSTEM_PROMPT } from './tools';

/** Scripted model: returns the queued AIMessages in order, records inputs. */
class FakeChatModel extends BaseChatModel {
	calls: BaseMessage[][] = [];
	boundTools: BindToolsInput[] = [];
	#script: AIMessage[];

	constructor(script: AIMessage[]) {
		super({});
		this.#script = script;
	}

	_llmType() {
		return 'fake';
	}

	// The harness only needs a `bindTools` method that returns an invokable
	// model; echoing `this` keeps the script counter shared across rounds.
	override bindTools(tools: BindToolsInput[]) {
		this.boundTools = tools;
		return this as never;
	}

	async _generate(messages: BaseMessage[]): Promise<ChatResult> {
		this.calls.push(messages);
		const message = this.#script.shift();
		if (!message) throw new Error('FakeChatModel script exhausted');
		return { generations: [{ text: String(message.content), message }] };
	}
}

function toolMessages(messages: BaseMessage[]): ToolMessage[] {
	return messages.filter((m): m is ToolMessage => m instanceof ToolMessage);
}

describe('course agent tool loop (fake model)', () => {
	it('search_course call → tool result → cited final answer', async () => {
		const model = new FakeChatModel([
			new AIMessage({
				content: '',
				tool_calls: [
					{
						name: 'search_course',
						args: { query: 'git status staging' },
						id: 'call_1',
						type: 'tool_call'
					}
				]
			}),
			new AIMessage('`git status` is your heads-up display before staging [[section-2-1]].')
		]);
		const searches: string[] = [];
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: buildAgentTools(),
			systemPrompt: TUTOR_SYSTEM_PROMPT,
			hooks: { onToolCall: (name, args) => searches.push(`${name}:${String(args.query)}`) }
		});

		const result = await agent.start('what does git status show');
		expect(result.status).toBe('done');

		// The tool actually ran, against the real retrieval index.
		expect(searches).toEqual(['search_course:git status staging']);
		const tms = toolMessages(result.messages);
		expect(tms).toHaveLength(1);
		expect(tms[0].tool_call_id).toBe('call_1');
		expect(String(tms[0].content)).toContain('[[section-2-1]]');

		// Round 2's prompt contained the persona AND the retrieved chunks.
		expect(model.calls).toHaveLength(2);
		const round2 = model.calls[1];
		expect(String(round2[0].content)).toContain('GitVibes tutor');
		expect(round2.some((m) => String(m.content).includes('[[section-2-1]]'))).toBe(true);

		// Citation preserved in the final answer.
		const final = result.messages[result.messages.length - 1];
		expect(String(final.content)).toContain('[[section-2-1]]');

		// Tools were advertised to the model.
		expect(model.boundTools.length).toBe(1);
	});

	it('answers every tool_call_id exactly once, in call order', async () => {
		const model = new FakeChatModel([
			new AIMessage({
				content: '',
				tool_calls: [
					{ name: 'search_course', args: { query: 'pipes' }, id: 'call_a', type: 'tool_call' },
					{ name: 'no_such_tool', args: {}, id: 'call_b', type: 'tool_call' },
					{ name: 'boomer', args: {}, id: 'call_c', type: 'tool_call' }
				]
			}),
			new AIMessage('done')
		]);
		const boomer = tool(
			async () => {
				throw new Error('boom');
			},
			{ name: 'boomer', description: 'always throws', schema: z.object({}) }
		);
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: [...buildAgentTools(), boomer as unknown as AnyTool]
		});

		const result = await agent.start('anything');
		expect(result.status).toBe('done');
		const tms = toolMessages(result.messages);
		expect(tms.map((m) => m.tool_call_id)).toEqual(['call_a', 'call_b', 'call_c']);
		expect(String(tms[1].content)).toContain('Unknown tool: no_such_tool');
		// Tool errors come back as ToolMessages, never as thrown exceptions.
		expect(String(tms[2].content)).toContain('Tool boomer failed: boom');
	});

	it('gated tool: reject pauses, synthesizes exactly one rejection ToolMessage', async () => {
		const bash = tool(async ({ cmd }: { cmd: string }) => `ran: ${cmd}`, {
			name: 'bash',
			description: 'run a shell command',
			schema: z.object({ cmd: z.string() })
		});
		const model = new FakeChatModel([
			new AIMessage({
				content: '',
				tool_calls: [{ name: 'bash', args: { cmd: 'rm -rf /' }, id: 'call_x', type: 'tool_call' }]
			}),
			new AIMessage('Understood — I will not run that.')
		]);
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: [bash as unknown as AnyTool],
			interruptOn: ['bash']
		});

		const paused = await agent.start('wipe the disk');
		expect(paused.status).toBe('interrupted');
		if (paused.status !== 'interrupted') throw new Error('unreachable');
		expect(paused.interrupt.tool).toBe('bash');
		expect(paused.interrupt.args).toEqual({ cmd: 'rm -rf /' });

		const resumed = await agent.resume({ type: 'reject', message: 'absolutely not' });
		expect(resumed.status).toBe('done');
		const tms = toolMessages(resumed.messages).filter((m) => m.tool_call_id === 'call_x');
		expect(tms).toHaveLength(1);
		expect(String(tms[0].content)).toContain('REJECTED');
		expect(String(tms[0].content)).toContain('absolutely not');
	});

	it('gated tool: edit rewrites the args before execution', async () => {
		let ran: string | null = null;
		const bash = tool(
			async ({ cmd }: { cmd: string }) => {
				ran = cmd;
				return `ran: ${cmd}`;
			},
			{ name: 'bash', description: 'run a shell command', schema: z.object({ cmd: z.string() }) }
		);
		const model = new FakeChatModel([
			new AIMessage({
				content: '',
				tool_calls: [
					{ name: 'bash', args: { cmd: 'rm -rf build' }, id: 'call_y', type: 'tool_call' }
				]
			}),
			new AIMessage('Cleaned the temp dir instead.')
		]);
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: [bash as unknown as AnyTool],
			interruptOn: ['bash']
		});

		const paused = await agent.start('clean up');
		expect(paused.status).toBe('interrupted');
		const resumed = await agent.resume({ type: 'edit', args: { cmd: 'rm -rf build/tmp' } });
		expect(resumed.status).toBe('done');
		expect(ran).toBe('rm -rf build/tmp');
	});

	it('plain answers skip the tools node entirely', async () => {
		const model = new FakeChatModel([new AIMessage('Hello! Ask me about the terminal.')]);
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: buildAgentTools()
		});
		const result = await agent.start('hi');
		expect(result.status).toBe('done');
		expect(toolMessages(result.messages)).toHaveLength(0);
		expect(model.calls).toHaveLength(1);
	});
});
