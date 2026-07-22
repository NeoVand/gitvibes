import { describe, it, expect } from 'vitest';
import { activityStateOf, migrateSections, type ProgressState } from './progress';

function stateOf(partial: Partial<ProgressState>): ProgressState {
	return { scenarios: {}, attempts: {}, sections: {}, checklist: {}, ...partial };
}

describe('activityStateOf', () => {
	it('scrolling is not doing — an untouched activity stays untouched', () => {
		// A section id recorded as read says nothing about the activity inside it.
		const state = stateOf({ sections: { 'section-2-1': '2026-07-22T00:00:00.000Z' } });
		expect(activityStateOf(state, 'core-loop')).toBe('untouched');
	});

	it('a submitted command marks the activity attempted', () => {
		const state = stateOf({ attempts: { 'core-loop': '2026-07-22T00:00:00.000Z' } });
		expect(activityStateOf(state, 'core-loop')).toBe('attempted');
	});

	it('a passing check marks it completed', () => {
		const state = stateOf({
			attempts: { 'core-loop': '2026-07-22T00:00:00.000Z' },
			scenarios: { 'core-loop': { completedAt: '2026-07-22T00:01:00.000Z', count: 1 } }
		});
		expect(activityStateOf(state, 'core-loop')).toBe('completed');
	});

	it('completed outranks attempted, so completed ⊆ attempted never shows a gap', () => {
		// Even if the attempt record is missing (old payload), completion wins.
		const state = stateOf({
			scenarios: { 'core-loop': { completedAt: '2026-07-22T00:01:00.000Z', count: 1 } }
		});
		expect(activityStateOf(state, 'core-loop')).toBe('completed');
	});
});

describe('migrateSections', () => {
	it('walks pre-Ship-It Conclusion ids from Part 8 to Part 9', () => {
		const saved = {
			'section-8-1': 'a',
			'section-8-2': 'b',
			'section-8-3': 'c',
			'section-8-4': 'd'
		};
		expect(migrateSections(saved, 0)).toEqual({
			'section-9-1': 'a',
			'section-9-2': 'b',
			'section-9-3': 'c',
			'section-9-4': 'd'
		});
	});

	it('leaves sections that did not move alone', () => {
		const saved = { 'section-2-1': 'a', 'section-7-1': 'b' };
		expect(migrateSections(saved, 0)).toEqual(saved);
	});

	it('is a no-op for data already stamped at the current version', () => {
		const saved = { 'section-8-1': 'a' };
		expect(migrateSections(saved, 1)).toEqual(saved);
	});

	it('never runs a step twice — 8-1 does not walk on to 10-1', () => {
		const once = migrateSections({ 'section-8-1': 'a' }, 0);
		expect(migrateSections(once, 1)).toEqual({ 'section-9-1': 'a' });
	});

	it('leaves scenario-shaped keys untouched (they are names, not positions)', () => {
		// Guards the deliberate choice that `attempts` skips the migration chain.
		const saved = { 'core-loop': 'a', capstone: 'b' };
		expect(migrateSections(saved, 0)).toEqual(saved);
	});
});
