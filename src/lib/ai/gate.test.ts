import { describe, expect, it } from 'vitest';
import { createGate } from './gate';
import { evaluate, type CommandRule } from './rules';

describe('approval gate', () => {
	it('resolves a proposal with allow', async () => {
		const gate = createGate();
		const pending = gate.propose('ls -la');
		expect(gate.pending).toBe('ls -la');

		gate.resolve('allow');
		await expect(pending).resolves.toEqual({ decision: 'allow', cmd: 'ls -la', reason: undefined });
		expect(gate.pending).toBeNull();
	});

	it('resolves a proposal with deny and a reason', async () => {
		const gate = createGate();
		const pending = gate.propose('rm -rf /');

		gate.resolve('deny', { reason: 'absolutely not' });
		const resolution = await pending;
		expect(resolution.decision).toBe('deny');
		expect(resolution.cmd).toBe('rm -rf /');
		expect(resolution.reason).toBe('absolutely not');
	});

	it('edit decision rewrites the command', async () => {
		const gate = createGate();
		const pending = gate.propose('rm -rf build');

		gate.resolve('edit', { cmd: 'rm -rf build/tmp' });
		const resolution = await pending;
		expect(resolution.decision).toBe('edit');
		expect(resolution.cmd).toBe('rm -rf build/tmp');
	});

	it('edit without a replacement keeps the original command', async () => {
		const gate = createGate();
		const pending = gate.propose('cat notes.txt');

		gate.resolve('edit');
		await expect(pending).resolves.toMatchObject({ decision: 'edit', cmd: 'cat notes.txt' });
	});

	it('queues proposals and surfaces them in FIFO order', async () => {
		const gate = createGate();
		const first = gate.propose('pwd');
		const second = gate.propose('ls');
		const third = gate.propose('whoami');

		expect(gate.pending).toBe('pwd');
		expect(gate.queueLength).toBe(2);

		gate.resolve('allow');
		expect(gate.pending).toBe('ls');
		gate.resolve('deny');
		expect(gate.pending).toBe('whoami');
		gate.resolve('allow');
		expect(gate.pending).toBeNull();

		expect((await first).decision).toBe('allow');
		expect((await second).decision).toBe('deny');
		expect((await third).decision).toBe('allow');
	});

	it('throws when resolving with nothing pending', () => {
		const gate = createGate();
		expect(() => gate.resolve('allow')).toThrow();
	});

	it('notifies subscribers as the pending command changes', () => {
		const gate = createGate();
		const seen: (string | null)[] = [];
		const unsubscribe = gate.subscribe((pending) => seen.push(pending));

		void gate.propose('ls');
		void gate.propose('pwd');
		gate.resolve('allow');
		gate.resolve('allow');
		unsubscribe();
		void gate.propose('whoami');

		expect(seen).toEqual([null, 'ls', 'pwd', null]);
	});
});

describe('rules evaluator', () => {
	const rules: CommandRule[] = [
		{ pattern: 'ls*', action: 'allow' },
		{ pattern: 'rm -rf *', action: 'deny' },
		{ pattern: '*', action: 'ask' }
	];

	it('allows ls', () => {
		expect(evaluate('ls', rules).action).toBe('allow');
		expect(evaluate('ls -la src/', rules).action).toBe('allow');
	});

	it('denies rm -rf * with a reason', () => {
		const result = evaluate('rm -rf node_modules', rules);
		expect(result.action).toBe('deny');
		expect(result.ruleIndex).toBe(1);
		expect(result.reason).toContain('rm -rf');
	});

	it('falls through to the catch-all ask rule', () => {
		const result = evaluate('git push --force', rules);
		expect(result.action).toBe('ask');
		expect(result.ruleIndex).toBe(2);
	});

	it('first match wins even when later rules also match', () => {
		const shadowed: CommandRule[] = [
			{ pattern: 'rm *', action: 'ask' },
			{ pattern: 'rm -rf *', action: 'deny' }
		];
		expect(evaluate('rm -rf /', shadowed).action).toBe('ask');
		expect(evaluate('rm -rf /', shadowed).ruleIndex).toBe(0);
	});

	it('defaults to ask when no rule matches', () => {
		const result = evaluate('curl example.com', [{ pattern: 'ls*', action: 'allow' }]);
		expect(result.action).toBe('ask');
		expect(result.matchedRule).toBeNull();
		expect(result.ruleIndex).toBe(-1);
	});

	it('normalizes whitespace before matching', () => {
		expect(evaluate('  rm   -rf   tmp ', rules).action).toBe('deny');
	});

	it('supports ? as a single-character wildcard', () => {
		const qRules: CommandRule[] = [{ pattern: 'cat file?.txt', action: 'allow' }];
		expect(evaluate('cat file1.txt', qRules).action).toBe('allow');
		expect(evaluate('cat file12.txt', qRules).action).toBe('ask');
	});
});
