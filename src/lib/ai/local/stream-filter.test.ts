import { describe, expect, it } from 'vitest';
import { StreamFilter } from './local-backend';

function collect() {
	const out: string[] = [];
	const filter = new StreamFilter((t) => out.push(t));
	return { filter, text: () => out.join('') };
}

describe('StreamFilter — live tokens with tool-syntax guard', () => {
	it('passes plain prose through as it arrives', () => {
		const { filter, text } = collect();
		filter.push('Pipes connect ');
		filter.push('two commands.');
		filter.flush();
		expect(text()).toBe('Pipes connect two commands.');
	});

	it('hides everything from the LFM tool-call marker on', () => {
		const { filter, text } = collect();
		filter.push('Let me demonstrate. ');
		filter.push('<|tool_call_start|>[bash(cmd="echo hi")]<|tool_call_end|>');
		filter.flush();
		expect(text()).toBe('Let me demonstrate.');
	});

	it('handles a marker split across token boundaries', () => {
		const { filter, text } = collect();
		filter.push('Watch this: <|tool');
		filter.push('_call_start|>[bash(cmd="ls")]');
		filter.flush();
		expect(text()).toBe('Watch this:');
		expect(text()).not.toContain('<|tool');
	});

	it('releases a held-back tail that never became a marker', () => {
		const { filter, text } = collect();
		filter.push('a < b and 2 <');
		filter.push(' 3 hold');
		filter.flush();
		expect(text()).toBe('a < b and 2 < 3 hold');
	});

	it('hides <think> blocks but resumes prose after them', () => {
		const { filter, text } = collect();
		filter.push('<think>let me plan this out');
		filter.push(' step by step</think>');
		filter.push('The answer is `q`.');
		filter.flush();
		expect(text()).toBe('The answer is `q`.');
	});

	it('hides Qwen-style <tool_call> and <function= markers too', () => {
		const a = collect();
		a.filter.push('Sure. <tool_call>{"name":"bash"}</tool_call>');
		a.filter.flush();
		expect(a.text()).toBe('Sure.');

		const b = collect();
		b.filter.push('Okay <function=bash>...');
		b.filter.flush();
		expect(b.text()).toBe('Okay');
	});

	it('nextCall() lifts suppression and separates rounds with a blank line', () => {
		const { filter, text } = collect();
		filter.push('Round one lead-in. <|tool_call_start|>[bash(cmd="pwd")]');
		filter.flush();
		filter.nextCall();
		filter.push('Round two: here is what happened.');
		filter.flush();
		expect(text()).toBe('Round one lead-in.\n\nRound two: here is what happened.');
	});

	it('nextCall() with nothing emitted yet adds no separator', () => {
		const { filter, text } = collect();
		filter.nextCall();
		filter.push('First visible words.');
		filter.flush();
		expect(text()).toBe('First visible words.');
	});

	it('counts emitted characters (drives the no-visible-output fallback)', () => {
		const { filter } = collect();
		filter.push('<|tool_call_start|>[bash(cmd="ls")]');
		filter.flush();
		expect(filter.emittedChars).toBe(0);
	});
});
