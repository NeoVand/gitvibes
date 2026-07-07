import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Local-only learning progress: which sections have been read, which
 * playground scenarios have been completed (and when — the timestamps drive
 * the spaced-repetition nudges), and the self-assessed skill checklist.
 * Everything lives in localStorage; there is no backend.
 */
export interface ScenarioProgress {
	/** ISO timestamp of the most recent completion */
	completedAt: string;
	/** How many times it's been completed (resets don't decrement) */
	count: number;
}

export interface ProgressState {
	scenarios: Record<string, ScenarioProgress>;
	/** sectionId -> ISO timestamp of first visit */
	sections: Record<string, string>;
	/** skill-checklist item id -> checked */
	checklist: Record<string, boolean>;
}

const STORAGE_KEY = 'gitvibes-progress-v1';

const EMPTY: ProgressState = { scenarios: {}, sections: {}, checklist: {} };

function load(): ProgressState {
	if (!browser) return EMPTY;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY;
		const parsed = JSON.parse(raw) as Partial<ProgressState>;
		return {
			scenarios: parsed.scenarios ?? {},
			sections: parsed.sections ?? {},
			checklist: parsed.checklist ?? {}
		};
	} catch {
		return EMPTY;
	}
}

export const progress = writable<ProgressState>(load());

if (browser) {
	progress.subscribe((state) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// storage full or blocked — progress just won't persist
		}
	});
}

export function markScenarioComplete(id: string): void {
	progress.update((state) => {
		const prev = state.scenarios[id];
		return {
			...state,
			scenarios: {
				...state.scenarios,
				[id]: { completedAt: new Date().toISOString(), count: (prev?.count ?? 0) + 1 }
			}
		};
	});
}

export function markSectionVisited(id: string): void {
	const state = get(progress);
	if (state.sections[id]) return;
	progress.update((s) => ({
		...s,
		sections: { ...s.sections, [id]: new Date().toISOString() }
	}));
}

export function toggleChecklistItem(id: string): void {
	progress.update((s) => ({
		...s,
		checklist: { ...s.checklist, [id]: !s.checklist[id] }
	}));
}

export interface StaleCompletion {
	id: string;
	daysAgo: number;
}

/**
 * Completed scenarios not practiced in `minDays` — oldest first. This is the
 * spaced-repetition signal: skills fade, recovery skills fastest.
 */
export function staleCompletions(state: ProgressState, minDays = 7): StaleCompletion[] {
	const now = Date.now();
	return Object.entries(state.scenarios)
		.map(([id, p]) => ({
			id,
			daysAgo: Math.floor((now - new Date(p.completedAt).getTime()) / 86_400_000)
		}))
		.filter((s) => s.daysAgo >= minDays)
		.sort((a, b) => b.daysAgo - a.daysAgo);
}
