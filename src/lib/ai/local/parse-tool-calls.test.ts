import { describe, expect, it } from 'vitest';
import { coerceXmlToolCall, parseToolCalls } from './transformers-js';

describe('parseToolCalls — Hermes JSON format', () => {
	it('parses a JSON tool call and keeps surrounding prose as content', () => {
		const { content, toolCalls } = parseToolCalls(
			'Let me check.\n<tool_call>{"name":"search_course","arguments":{"query":"pipes"}}</tool_call>'
		);
		expect(content).toBe('Let me check.');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('search_course');
		expect(toolCalls[0].args).toEqual({ query: 'pipes' });
	});

	it('plain prose passes through untouched', () => {
		const { content, toolCalls } = parseToolCalls('Just an answer.');
		expect(content).toBe('Just an answer.');
		expect(toolCalls).toEqual([]);
	});
});

describe('parseToolCalls — Qwen3.5 XML format (observed in the smoke test)', () => {
	const observed =
		'<tool_call>\n<function=bash>\n<parameter=cmd>\necho "hi" > hello.txt\n</parameter>\n</function>\n</tool_call>';

	it('parses <function=name> / <parameter=key> blocks', () => {
		const { content, toolCalls } = parseToolCalls(observed);
		expect(content).toBe('');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('bash');
		expect(toolCalls[0].args).toEqual({ cmd: 'echo "hi" > hello.txt' });
	});

	it('discards everything after a hallucinated <tool_response>', () => {
		const raw =
			observed +
			'\nuser assistant<tool_call>\n<function=bash>\n<parameter=cmd>\ncat hello.txt\n</parameter>\n</function>\n</tool_call>' +
			'\nuser <tool_response>\n"hi"\n</tool_response>assistant\nYou created the file.';
		const { content, toolCalls } = parseToolCalls(raw);
		// Both real calls before the fake response survive; the imagined
		// result and wrap-up do not.
		expect(toolCalls.map((c) => c.name)).toEqual(['bash', 'bash']);
		expect(toolCalls[1].args).toEqual({ cmd: 'cat hello.txt' });
		expect(content).toBe('');
	});

	it('coerces an unterminated trailing block (generation cut mid-call)', () => {
		const { toolCalls } = parseToolCalls(
			'Running it now.\n<tool_call>\n<function=bash>\n<parameter=cmd>\nls -la'
		);
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('bash');
		expect(toolCalls[0].args.cmd).toBe('ls -la');
	});

	it('coerceXmlToolCall handles multiple parameters', () => {
		const tc = coerceXmlToolCall(
			'<function=search_course>\n<parameter=query>chmod 755</parameter>\n</function>'
		);
		expect(tc?.name).toBe('search_course');
		expect(tc?.args).toEqual({ query: 'chmod 755' });
	});
});

describe('parseToolCalls — LFM2.5 Pythonic format', () => {
	it('parses a single call between the marker tokens', () => {
		const { content, toolCalls } = parseToolCalls(
			'<|tool_call_start|>[bash(cmd="ls -la")]<|tool_call_end|>'
		);
		expect(content).toBe('');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('bash');
		expect(toolCalls[0].args).toEqual({ cmd: 'ls -la' });
	});

	it('handles escapes and nested quotes in double-quoted args', () => {
		const { toolCalls } = parseToolCalls(
			'<|tool_call_start|>[bash(cmd="printf \'a\\nb\\na\\n\' > f.txt")]<|tool_call_end|>'
		);
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].args.cmd).toBe("printf 'a\nb\na\n' > f.txt");
	});

	it('parses multiple calls in one list', () => {
		const { toolCalls } = parseToolCalls(
			'<|tool_call_start|>[bash(cmd="mkdir demo"), done(summary="made a folder")]<|tool_call_end|>'
		);
		expect(toolCalls.map((c) => c.name)).toEqual(['bash', 'done']);
		expect(toolCalls[0].args).toEqual({ cmd: 'mkdir demo' });
		expect(toolCalls[1].args).toEqual({ summary: 'made a folder' });
	});

	it('tolerates a single bare call without list brackets', () => {
		const { toolCalls } = parseToolCalls(
			'<|tool_call_start|>search_course(query="chmod 755")<|tool_call_end|>'
		);
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('search_course');
		expect(toolCalls[0].args).toEqual({ query: 'chmod 755' });
	});

	it('keeps prose before the call as content', () => {
		const { content, toolCalls } = parseToolCalls(
			'Let me demonstrate.\n<|tool_call_start|>[bash(cmd="echo hi")]<|tool_call_end|>'
		);
		expect(content).toBe('Let me demonstrate.');
		expect(toolCalls).toHaveLength(1);
	});

	it('salvages a call truncated mid-generation', () => {
		const { toolCalls } = parseToolCalls('<|tool_call_start|>[bash(cmd="echo unfinished');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('bash');
		expect(String(toolCalls[0].args.cmd)).toContain('echo unfinished');
	});

	it('accepts a bare Pythonic list when decoding stripped the special tokens', () => {
		const { toolCalls } = parseToolCalls('[bash(cmd="cat hello.txt")]');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].args).toEqual({ cmd: 'cat hello.txt' });
	});

	it('maps a lone positional argument onto the known parameter', () => {
		const { toolCalls } = parseToolCalls('<|tool_call_start|>[bash("pwd")]<|tool_call_end|>');
		expect(toolCalls[0].args).toEqual({ cmd: 'pwd' });
	});

	it('coerces Python literals (True/False/None/numbers)', () => {
		const { toolCalls } = parseToolCalls(
			'<|tool_call_start|>[demo_tool(flag=True, count=3, nothing=None)]<|tool_call_end|>'
		);
		expect(toolCalls[0].args).toEqual({ flag: true, count: 3, nothing: null });
	});

	it('plain prose with no call passes through untouched', () => {
		const { content, toolCalls } = parseToolCalls(
			'Pipes connect commands (like `a | b`) — nothing to run here.'
		);
		expect(toolCalls).toEqual([]);
		expect(content).toBe('Pipes connect commands (like `a | b`) — nothing to run here.');
	});

	it('prose containing parentheses is not mistaken for a bare call', () => {
		const { toolCalls } = parseToolCalls('Use chmod (change mode) to fix permissions.');
		expect(toolCalls).toEqual([]);
	});
});

describe('parseToolCalls — LFM bare-branch roster guard', () => {
	it('unknown names in bare (token-less) output are NOT parsed as calls', () => {
		const { toolCalls } = parseToolCalls('see wc(1) and man(1) for details');
		expect(toolCalls).toEqual([]);
	});

	it('known roster names in bare output still parse', () => {
		const { toolCalls } = parseToolCalls('done(summary="all set")');
		expect(toolCalls).toHaveLength(1);
		expect(toolCalls[0].name).toBe('done');
	});
});
