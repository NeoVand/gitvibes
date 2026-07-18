import { describe, expect, it } from 'vitest';
import { parseAgentInvocation } from './parse';

describe('parseAgentInvocation', () => {
	it('ignores lines that are not agent invocations', () => {
		expect(parseAgentInvocation('ls -la')).toBeNull();
		expect(parseAgentInvocation('agentx "task"')).toBeNull();
		expect(parseAgentInvocation('echo agent')).toBeNull();
		expect(parseAgentInvocation('')).toBeNull();
	});

	it('bare agent (and help spellings) ask for usage', () => {
		expect(parseAgentInvocation('agent')).toEqual({ kind: 'help' });
		expect(parseAgentInvocation('  agent  ')).toEqual({ kind: 'help' });
		expect(parseAgentInvocation('agent --help')).toEqual({ kind: 'help' });
		expect(parseAgentInvocation('agent -h')).toEqual({ kind: 'help' });
		expect(parseAgentInvocation('agent help')).toEqual({ kind: 'help' });
		expect(parseAgentInvocation('agent ""')).toEqual({ kind: 'help' });
	});

	it('extracts a double-quoted task', () => {
		expect(parseAgentInvocation('agent "create a notes folder with three dated files"')).toEqual({
			kind: 'task',
			task: 'create a notes folder with three dated files'
		});
	});

	it('extracts single-quoted and unquoted tasks', () => {
		expect(parseAgentInvocation("agent 'make a backup'")).toEqual({
			kind: 'task',
			task: 'make a backup'
		});
		expect(parseAgentInvocation('agent tidy   the   logs')).toEqual({
			kind: 'task',
			task: 'tidy the logs'
		});
	});

	it('keeps shell operators when they are quoted', () => {
		expect(parseAgentInvocation('agent "count lines with wc & friends"')).toEqual({
			kind: 'task',
			task: 'count lines with wc & friends'
		});
	});

	it('rejects unquoted shell operators with a teaching message', () => {
		const res = parseAgentInvocation('agent "task" | grep x');
		expect(res?.kind).toBe('error');
		expect(res && 'message' in res ? res.message : '').toContain('pipes');
	});

	it('rejects an unterminated quote', () => {
		const res = parseAgentInvocation('agent "half a task');
		expect(res?.kind).toBe('error');
		expect(res && 'message' in res ? res.message : '').toContain('quote');
	});
});
