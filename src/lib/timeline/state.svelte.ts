import { progress } from '$lib/data/progress';
import manifest from '$lib/data/timeline-manifest.json';
import type { TimelineItem } from './mapping';
import type { ActivityState } from '$lib/data/progress';

/** The committed document model: every anchor, in real page order. */
export const timelineManifest = manifest as TimelineItem[];

const playgroundIds = new Set(
	timelineManifest.filter((it) => it.kind === 'playground').map((it) => it.id)
);

/**
 * The rail's progress sets, derived from the one existing `progress` store.
 * No new store and no new writer.
 *
 * There are THREE sets rather than two, because an activity mark and a prose
 * mark do not answer the same question:
 *
 *  - READ (`readIds`) comes from `progress.sections`, written by
 *    markSectionVisited from the scroll-spy in +page.svelte. Scrolling past a
 *    paragraph genuinely is reading it, so this is the right signal for prose.
 *    It is FILTERED to exclude playground anchors. The spy iterates `anchorIds`,
 *    not just section ids, so it records activity anchors too; once the spy was
 *    fixed to sort anchors into true document order it started reaching those
 *    anchors for the first time, and every playground you scrolled over lit up
 *    as though you had done it. Filtering here means no consumer can make that
 *    mistake again — an activity id is simply never in `readIds`.
 *
 *  - ATTEMPTED (`attemptedIds`) comes from `progress.attempts`, written only by
 *    markScenarioAttempted, from the playground's command submit and its
 *    suggestion chips. This is the "started, not finished" state.
 *
 *  - DONE (`doneIds`) comes from `progress.scenarios`, written only by
 *    markScenarioComplete when the scenario's goal check passes.
 *
 * All three are intersected with the manifest, because `progress` also collects
 * ids from the standalone playground panel and from stale localStorage, which
 * would inflate the HUD's "n/m solved".
 *
 * The three sets are DISJOINT by construction: `attemptedIds` subtracts the
 * completed ones, so a consumer can branch on them in any order and cannot
 * paint a mark in two states at once.
 *
 * Re-deriving on every progress write is fine: these events are rare and only
 * class toggles change, never geometry.
 */
export function createProgressSets() {
	// Plain Sets, deliberately: these are never mutated in place, they are
	// REPLACED wholesale on every progress write, so the $state reference is
	// the reactive signal and a SvelteSet would only add per-key overhead to a
	// value that is rebuilt from scratch anyway.
	/* eslint-disable svelte/prefer-svelte-reactivity -- replaced, never mutated */
	let readIds = $state(new Set<string>());
	let attemptedIds = $state(new Set<string>());
	let doneIds = $state(new Set<string>());

	const stop = progress.subscribe((state) => {
		readIds = new Set(Object.keys(state.sections).filter((id) => !playgroundIds.has(id)));
		doneIds = new Set(Object.keys(state.scenarios).filter((id) => playgroundIds.has(id)));
		attemptedIds = new Set(
			Object.keys(state.attempts).filter((id) => playgroundIds.has(id) && !state.scenarios[id])
		);
	});
	/* eslint-enable svelte/prefer-svelte-reactivity */

	return {
		get readIds() {
			return readIds;
		},
		get attemptedIds() {
			return attemptedIds;
		},
		get doneIds() {
			return doneIds;
		},
		/**
		 * One activity anchor's state, for the common case of styling a single
		 * mark. Equivalent to testing the sets directly; this just spares every
		 * call site from re-deriving the precedence.
		 */
		activityState(id: string): ActivityState {
			if (doneIds.has(id)) return 'completed';
			if (attemptedIds.has(id)) return 'attempted';
			return 'untouched';
		},
		destroy: stop
	};
}
