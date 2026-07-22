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
	/**
	 * scenarioId -> ISO timestamp of the FIRST engagement: a command the learner
	 * submitted, or a suggestion chip they clicked, inside that scenario.
	 *
	 * This exists because `sections` cannot answer the question for an activity.
	 * `sections` records SCROLLING PAST an anchor, which is a fair definition of
	 * "read" for prose and a meaningless one for a playground — you do not do a
	 * playground by scrolling over it. So an activity has three states, and they
	 * come from three different records: untouched (in neither), attempted (here
	 * but not in `scenarios`), completed (in `scenarios`).
	 *
	 * Deliberately NOT part of the version/migration chain. Section ids are
	 * positional, which is the whole reason MIGRATIONS exists; scenario ids
	 * ('core-loop', 'first-commit', …) are stable names that survive every
	 * curriculum reorder untouched. Payloads written before this field existed
	 * load as `{}` — correct by construction, since nothing recorded then was an
	 * attempt.
	 */
	attempts: Record<string, string>;
	/** sectionId -> ISO timestamp of first visit */
	sections: Record<string, string>;
	/** skill-checklist item id -> checked */
	checklist: Record<string, boolean>;
	/**
	 * Which curriculum layout these section ids belong to. Section ids are
	 * positional, so a reordering makes saved ids mean something else — the
	 * stamp is what lets a migration run exactly once, on exactly the data it
	 * was written for.
	 */
	version?: number;
}

const STORAGE_KEY = 'gitvibes-progress-v1';

/** Bump when section ids move, and add the matching step to MIGRATIONS. */
const CURRENT_VERSION = 1;

const EMPTY: ProgressState = {
	scenarios: {},
	attempts: {},
	sections: {},
	checklist: {},
	version: CURRENT_VERSION
};

/**
 * One entry per reordering, applied in sequence from the stored version up to
 * CURRENT_VERSION. Order matters: these maps share keys, so applying a step
 * twice, or out of sequence, silently rewrites the wrong sections.
 */
const MIGRATIONS: Record<number, Record<string, string>> = {
	// → v1: inserting Part 8 "Ship It" pushed the Conclusion from 8 to 9.
	// Walk the tail down first — 8-x is both a source and a destination here,
	// and the rebuild below reads every key from the same snapshot, so the two
	// renames cannot collide.
	1: {
		'section-8-1': 'section-9-1',
		'section-8-2': 'section-9-2',
		'section-8-3': 'section-9-3',
		'section-8-4': 'section-9-4'
	}
};

/**
 * Walk saved section ids forward to the current layout. Data written before
 * the stamp existed is treated as v0, which is correct: the only ids in the
 * wild without one predate every migration.
 */
export function migrateSections(
	sections: Record<string, string>,
	from: number
): Record<string, string> {
	let current = sections;
	for (let v = from + 1; v <= CURRENT_VERSION; v++) {
		const step = MIGRATIONS[v];
		if (!step) continue;
		const next: Record<string, string> = {};
		for (const [id, ts] of Object.entries(current)) next[step[id] ?? id] = ts;
		current = next;
	}
	return current;
}

function load(): ProgressState {
	if (!browser) return EMPTY;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY;
		const parsed = JSON.parse(raw) as Partial<ProgressState>;
		return {
			scenarios: parsed.scenarios ?? {},
			// Not migrated: scenario ids are stable names, not positional ids.
			attempts: parsed.attempts ?? {},
			sections: migrateSections(parsed.sections ?? {}, parsed.version ?? 0),
			checklist: parsed.checklist ?? {},
			version: CURRENT_VERSION
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
			// Completing implies engaging. Recording it here too keeps the invariant
			// `completed ⊆ attempted` true even for a scenario finished entirely by
			// approved agent commands, so no reader has to special-case that path.
			attempts: state.attempts[id]
				? state.attempts
				: { ...state.attempts, [id]: new Date().toISOString() },
			scenarios: {
				...state.scenarios,
				[id]: { completedAt: new Date().toISOString(), count: (prev?.count ?? 0) + 1 }
			}
		};
	});
}

/**
 * The learner did something inside this scenario: submitted a command, or
 * clicked a suggestion chip. First touch only — later commands are no-ops, so
 * this is cheap to call on every submit.
 *
 * Never call this from the scroll-spy. Arriving at an activity is not doing it,
 * and that conflation is exactly what this record was added to end.
 */
export function markScenarioAttempted(id: string): void {
	const state = get(progress);
	if (state.attempts[id]) return;
	progress.update((s) => ({
		...s,
		attempts: { ...s.attempts, [id]: new Date().toISOString() }
	}));
}

/** The three states an activity mark can be in. Nothing else is a state. */
export type ActivityState = 'untouched' | 'attempted' | 'completed';

/** Resolve one activity's state. Pure; safe inside a `$derived`. */
export function activityStateOf(state: ProgressState, id: string): ActivityState {
	if (state.scenarios[id]) return 'completed';
	if (state.attempts[id]) return 'attempted';
	return 'untouched';
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

/** Wipe every recording — completions, attempts, sections read, checklist. */
export function resetProgress(): void {
	progress.set({
		scenarios: {},
		attempts: {},
		sections: {},
		checklist: {},
		version: CURRENT_VERSION
	});
}

/**
 * MIRRORS `STORAGE_KEY` in $lib/timeline/dwell.ts — the two maps are keyed by
 * identical section ids and are two halves of one record.
 */
const DWELL_STORAGE_KEY = 'gitvibes-dwell-v1';

/**
 * Everything the reader has accumulated, in one call: what `resetProgress`
 * covers PLUS the dwell heat map.
 *
 * They are separate keys but a single idea — "how far have I got" — so a reset
 * that clears one and leaves the other is not a reset. It is worse than no
 * reset at all: the bar goes to zero while the rail stays lit end to end, and
 * the reader is left believing the button is broken.
 *
 * Note this clears the PERSISTED dwell only. A tracker already running holds
 * its own buffer and will flush it back on teardown, so the caller must also
 * drop the live tracker — Header.svelte does that by unmounting the rail
 * across this call.
 */
export function resetAllLearningState(): void {
	resetProgress();
	if (!browser) return;
	try {
		localStorage.removeItem(DWELL_STORAGE_KEY);
	} catch {
		// blocked storage — the in-memory reset above still stands
	}
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
