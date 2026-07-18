/**
 * The gated bash loop end to end with a scripted fake model and a REAL
 * GitEngine sandbox: propose → allow → output ToolMessage → done;
 * propose → deny → synthesized rejection; edit rewrites the command.
 */
import { describe, expect, it } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons';
import { BaseChatModel, type BindToolsInput } from '@langchain/core/language_models/chat_models';
import { AIMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { createCourseAgent } from './deepagent';
import { buildAgentTools, TUTOR_SYSTEM_PROMPT, tutorSystemPrompt } from './tools';
import { createGitBridge, type TerminalLine } from '../git-bridge';
import type { AgentBash } from '../types';

AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage());

class FakeChatModel extends BaseChatModel {
	calls: BaseMessage[][] = [];
	#script: AIMessage[];
	constructor(script: AIMessage[]) {
		super({});
		this.#script = script;
	}
	_llmType() {
		return 'fake';
	}
	override bindTools(tools: BindToolsInput[]) {
		void tools;
		return this as never;
	}
	async _generate(messages: BaseMessage[]): Promise<ChatResult> {
		this.calls.push(messages);
		const message = this.#script.shift();
		if (!message) throw new Error('FakeChatModel script exhausted');
		return { generations: [{ text: String(message.content), message }] };
	}
}

function bashCall(cmd: string, id: string): AIMessage {
	return new AIMessage({
		content: '',
		tool_calls: [{ name: 'bash', args: { cmd }, id, type: 'tool_call' }]
	});
}

async function makeHarness(script: AIMessage[]) {
	const lines: TerminalLine[] = [];
	const bridge = await createGitBridge({ onLine: (l) => lines.push(l) });
	const bash: AgentBash = {
		propose: (cmd) => bridge.propose(cmd),
		run: (cmd) => bridge.run(cmd)
	};
	const agent = createCourseAgent({
		model: new FakeChatModel(script) as unknown as BaseChatModel,
		tools: buildAgentTools({ bash }),
		systemPrompt: TUTOR_SYSTEM_PROMPT,
		interruptOn: ['bash']
	});
	return { agent, bridge, lines };
}

describe('deepagent gated bash loop (git sandbox)', () => {
	it('propose → allow → engine output as ToolMessage → done', async () => {
		const { agent, lines } = await makeHarness([
			bashCall('git status', 'call_b1'),
			new AIMessage('That is the whole heads-up display — read it before staging.')
		]);

		const paused = await agent.start('show me git status');
		expect(paused.status).toBe('interrupted');
		if (paused.status !== 'interrupted') throw new Error('unreachable');
		expect(paused.interrupt.tool).toBe('bash');
		expect(paused.interrupt.args.cmd).toBe('git status');

		const done = await agent.resume({ type: 'approve' });
		expect(done.status).toBe('done');
		const tms = done.messages.filter((m): m is ToolMessage => m instanceof ToolMessage);
		expect(tms).toHaveLength(1);
		expect(tms[0].tool_call_id).toBe('call_b1');
		expect(String(tms[0].content)).toContain('On branch main');

		// The command actually ran in the sandbox transcript.
		expect(lines[0]).toMatchObject({ type: 'input', text: 'git status' });
		expect(lines[1].type).toBe('output');
	});

	it('propose → deny → synthesized rejection, nothing executed', async () => {
		const { agent, lines } = await makeHarness([
			bashCall('git reset --hard HEAD~2', 'call_b2'),
			new AIMessage('Understood — I will not run that.')
		]);

		const paused = await agent.start('throw away the last two commits');
		expect(paused.status).toBe('interrupted');
		const done = await agent.resume({ type: 'reject', message: 'never' });
		expect(done.status).toBe('done');

		const tms = done.messages.filter((m): m is ToolMessage => m instanceof ToolMessage);
		expect(tms).toHaveLength(1);
		expect(String(tms[0].content)).toContain('REJECTED');
		expect(String(tms[0].content)).toContain('never');
		expect(lines).toEqual([]);
	});

	it('edit rewrites the command before execution', async () => {
		const { agent, lines } = await makeHarness([
			bashCall('git log', 'call_b3'),
			new AIMessage('Done.')
		]);

		const paused = await agent.start('demo');
		expect(paused.status).toBe('interrupted');
		const done = await agent.resume({ type: 'edit', args: { cmd: 'git log --oneline' } });
		expect(done.status).toBe('done');
		expect(lines[0].text).toBe('git log --oneline');
		const tms = done.messages.filter((m): m is ToolMessage => m instanceof ToolMessage);
		expect(String(tms[0].content)).toContain('fix: trim whitespace in names');
	});

	it('multi-step demo: two approvals, engine state carries over', async () => {
		const { agent } = await makeHarness([
			bashCall('git switch -c demo/two-step', 'call_s1'),
			bashCall('git status', 'call_s2'),
			new AIMessage('And the status proves we are standing on the new branch.')
		]);

		let result = await agent.start('demo branches');
		expect(result.status).toBe('interrupted');
		result = await agent.resume({ type: 'approve' });
		expect(result.status).toBe('interrupted');
		result = await agent.resume({ type: 'approve' });
		expect(result.status).toBe('done');

		const tms = result.messages.filter((m): m is ToolMessage => m instanceof ToolMessage);
		expect(tms).toHaveLength(2);
		expect(String(tms[1].content)).toContain('demo/two-step');
	});

	it('injects a FRESH repo snapshot into the system prompt on every round', async () => {
		// The exact wiring local-backend.ts uses: a callable systemPrompt that
		// snapshots the bridge's listing at each model call.
		const model = new FakeChatModel([
			bashCall("echo 'fresh' > minted-this-turn.txt", 'call_f1'),
			new AIMessage('There it is — a brand-new untracked file.')
		]);
		const bridge = await createGitBridge({});
		const bash: AgentBash = {
			propose: (cmd) => bridge.propose(cmd),
			run: (cmd) => bridge.run(cmd),
			listing: () => bridge.listing()
		};
		const agent = createCourseAgent({
			model: model as unknown as BaseChatModel,
			tools: buildAgentTools({ bash }),
			systemPrompt: () => tutorSystemPrompt(bash.listing?.() ?? null),
			interruptOn: ['bash']
		});

		const paused = await agent.start('make me a file');
		expect(paused.status).toBe('interrupted');
		const done = await agent.resume({ type: 'approve' });
		expect(done.status).toBe('done');

		expect(model.calls).toHaveLength(2);
		const sys1 = String(model.calls[0][0].content);
		const sys2 = String(model.calls[1][0].content);
		// Both rounds carry the seeded repo…
		expect(sys1).toContain('YOUR REPO RIGHT NOW');
		expect(sys1).toContain('notes.txt');
		expect(sys1).toContain('feature/ideas');
		// …but only round 2 sees the file the agent just created.
		expect(sys1).not.toContain('minted-this-turn.txt');
		expect(sys2).toContain('minted-this-turn.txt');
	});
});
