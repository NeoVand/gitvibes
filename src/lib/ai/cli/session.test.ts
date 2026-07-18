/**
 * CliSession driven end-to-end with the deterministic MockBackend and a real
 * GitEngine — the same wiring GitPlayground uses, minus the DOM. Each test
 * scripts the human's keystroke verdicts by reacting to session events.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { CliSession, type CliEvent, type CliPhase } from './session';
import { MockBackend } from '../mock-backend';
import { GitEngine } from '../../playground/git-engine';
import { runGitCommand } from '../../playground/commands';
import type { AgentBackend } from '../types';

const COMMIT_TASK = 'commit a note about your visit';
const COMMIT_CMDS = [
	"echo 'agent was here' > agent-notes.md",
	'git add agent-notes.md',
	'git commit -m "docs: add agent notes"'
];

interface Harness {
	session: CliSession;
	events: CliEvent[];
	phases: CliPhase[];
	engine: GitEngine;
	ran: string[];
}

function makeHarness(onEvent?: (e: CliEvent, s: CliSession) => void): Harness {
	const engine = new GitEngine('unit-test-cli');
	const events: CliEvent[] = [];
	const phases: CliPhase[] = [];
	const ran: string[] = [];
	const session: CliSession = new CliSession({
		backend: new MockBackend(),
		instant: true,
		run: async (cmd) => {
			ran.push(cmd);
			const result = await runGitCommand(engine, cmd);
			return { output: result.output, error: result.error };
		},
		emit: (e) => {
			events.push(e);
			onEvent?.(e, session);
		},
		onUpdate: (s) => {
			if (phases[phases.length - 1] !== s.phase) phases.push(s.phase);
		}
	});
	return { session, events, phases, engine, ran };
}

function endEvent(events: CliEvent[]) {
	return events.find((e) => e.type === 'end') as Extract<CliEvent, { type: 'end' }> | undefined;
}

describe('CliSession', () => {
	let harness: Harness;

	beforeEach(async () => {
		harness = makeHarness();
		await harness.engine.reset();
	});

	it('propose → allow → execute mutates the repo, then ends via done', async () => {
		const h = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.approve());
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);

		expect(h.ran).toEqual(COMMIT_CMDS);
		// The invoking terminal's engine really changed.
		const log = await runGitCommand(h.engine, 'git log --oneline');
		expect(log.output).toContain('docs: add agent notes');
		const end = endEvent(h.events);
		expect(end?.reason).toBe('done');
		expect(end?.summary).toContain('agent-notes.md');
		expect(h.session.phase).toBe('done');
		// The canonical phase walk: generating → awaiting → executing → … → done.
		expect(h.phases).toEqual([
			'generating',
			'awaiting-approval',
			'generating',
			'executing',
			'generating',
			'awaiting-approval',
			'generating',
			'executing',
			'generating',
			'awaiting-approval',
			'generating',
			'executing',
			'generating',
			'done'
		]);
	});

	it('deny lets the agent continue: nothing runs, the session still ends', async () => {
		const h = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.deny());
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);

		expect(h.ran).toEqual([]);
		// Three proposals were made and denied; the agent kept going each time.
		expect(h.events.filter((e) => e.type === 'proposal')).toHaveLength(3);
		const end = endEvent(h.events);
		expect(end?.reason).toBe('done');
		expect(end?.summary).toContain('Nothing was run');
	});

	it('mixed verdicts: deny the first, allow the rest', async () => {
		let first = true;
		const h = makeHarness((e, s) => {
			if (e.type !== 'proposal') return;
			const mine = first;
			first = false;
			queueMicrotask(() => (mine ? s.deny() : s.approve()));
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);

		expect(h.ran).toEqual(['git add agent-notes.md', 'git commit -m "docs: add agent notes"']);
		expect(endEvent(h.events)?.reason).toBe('done');
	});

	it('edit rewrites the command before it runs', async () => {
		const h = makeHarness((e, s) => {
			if (e.type !== 'proposal') return;
			queueMicrotask(() => {
				if (e.cmd === COMMIT_CMDS[0]) {
					const prefill = s.beginEdit();
					expect(prefill).toBe(COMMIT_CMDS[0]);
					expect(s.editing).toBe(true);
					s.submitEdit("echo 'agent was here' > visit-log.md");
				} else {
					s.deny();
				}
			});
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);

		expect(h.ran).toEqual(["echo 'agent was here' > visit-log.md"]);
		expect(await h.engine.readFile('visit-log.md')).toContain('agent was here');
		const verdicts = h.events.filter((e) => e.type === 'verdict');
		expect(verdicts[0]).toMatchObject({
			decision: 'edit',
			cmd: "echo 'agent was here' > visit-log.md"
		});
	});

	it('submitting an unchanged edit counts as a plain allow', async () => {
		const h = makeHarness((e, s) => {
			if (e.type !== 'proposal') return;
			queueMicrotask(() => {
				const prefill = s.beginEdit();
				s.submitEdit(prefill ?? '');
			});
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);
		const verdicts = h.events.filter((e) => e.type === 'verdict');
		expect(verdicts.every((v) => v.type === 'verdict' && v.decision === 'allow')).toBe(true);
		expect(h.ran).toHaveLength(3);
	});

	it('cancelEdit returns to the approval prompt without a verdict', async () => {
		const h = makeHarness((e, s) => {
			if (e.type !== 'proposal') return;
			queueMicrotask(() => {
				s.beginEdit();
				s.cancelEdit();
				expect(s.editing).toBe(false);
				expect(s.phase).toBe('awaiting-approval');
				s.approve();
			});
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);
		expect(h.ran).toHaveLength(3);
	});

	it('interrupt at the approval prompt is SIGINT: nothing runs, session ends', async () => {
		const h = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.interrupt());
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);

		expect(h.ran).toEqual([]);
		expect(h.session.phase).toBe('interrupted');
		const end = endEvent(h.events);
		expect(end?.reason).toBe('interrupted');
		// Exactly one end event, even though the backend also unwinds.
		expect(h.events.filter((e) => e.type === 'end')).toHaveLength(1);
	});

	it('a task with no scripted plan still ends cleanly (demo mode)', async () => {
		const h = makeHarness();
		await h.engine.reset();
		await h.session.start('fold my laundry');
		const end = endEvent(h.events);
		expect(end?.reason).toBe('done');
		expect(end?.summary).toContain('No scripted plan');
		expect(h.ran).toEqual([]);
	});

	it('the end event reports how many commands actually ran', async () => {
		// A no-op session (no scripted plan → nothing executes) reports 0, so
		// the terminal can say "finished without running anything" honestly.
		const noop = makeHarness();
		await noop.engine.reset();
		await noop.session.start('fold my laundry');
		expect(endEvent(noop.events)?.ranCount).toBe(0);

		// A session that executes three commands reports 3.
		const worked = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.approve());
		});
		await worked.engine.reset();
		await worked.session.start(COMMIT_TASK);
		expect(endEvent(worked.events)?.ranCount).toBe(3);
	});

	it('streams the agent prose as events', async () => {
		const h = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.approve());
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);
		const prose = h.events
			.filter((e) => e.type === 'prose')
			.map((e) => (e.type === 'prose' ? e.text : ''))
			.join('');
		expect(prose).toContain('3 steps');
	});

	it('start() is one-shot', async () => {
		const h = makeHarness((e, s) => {
			if (e.type === 'proposal') queueMicrotask(() => s.approve());
		});
		await h.engine.reset();
		await h.session.start(COMMIT_TASK);
		await expect(h.session.start(COMMIT_TASK)).rejects.toThrow(/only be called once/);
	});

	it('a backend without generateCli ends with an error', async () => {
		const backend: AgentBackend = {
			name: 'bare',
			generate: async () => {}
		};
		const events: CliEvent[] = [];
		const session = new CliSession({
			backend,
			run: async () => ({ output: '' }),
			emit: (e) => events.push(e)
		});
		await session.start('anything');
		expect(session.phase).toBe('error');
		expect(endEvent(events)?.reason).toBe('error');
	});
});
