/**
 * Where is the learner right now? A tiny reactive store fed by the page's
 * existing scroll-spy (+page.svelte sets `sectionId` from its activeSection —
 * no second observer) and by the playground panel (`scenarioId` while it is
 * open). The Agent panel reads `current` to ground its suggested questions.
 */
import { sidebarNav } from '$lib/data/sidebar-nav';
import { getScenario } from '$lib/playground/scenarios';
import { titleForId } from './retrieval';

export interface ReadingSpot {
	/** Session cache key for suggestion rounds ("section:section-5-2"). */
	key: string;
	/** Short title for the chips header ("5.2 chmod"). */
	title: string;
	/** Fuller label for the model prompt ("5.2 chmod — Permissions & Environment"). */
	label: string;
	/** Section id whose course chunks ground the questions; null for scenarios. */
	sectionId: string | null;
}

/** Sidebar label (and parent part label) for any anchor id, or null. */
function navEntry(id: string): { title: string; part: string | null } | null {
	for (const section of sidebarNav) {
		if (section.id === id) return { title: section.label, part: null };
		const child = section.children?.find((c) => c.id === id);
		if (child) return { title: child.label, part: section.label };
	}
	return null;
}

class ReadingContext {
	/** The section the learner is reading (scroll-spy / nav clicks). */
	sectionId = $state('hero');
	/** The open playground scenario, when the panel is showing one. */
	scenarioId = $state<string | null>(null);

	/** The spot suggestions should be about — the scenario wins while open. */
	get current(): ReadingSpot {
		if (this.scenarioId) {
			const scenario = getScenario(this.scenarioId);
			return {
				key: `scenario:${scenario.id}`,
				title: scenario.title,
				label: `the hands-on exercise "${scenario.title}"`,
				sectionId: null
			};
		}
		const id = this.sectionId || 'hero';
		const nav = navEntry(id);
		const title = titleForId(id) ?? nav?.title ?? 'the course';
		return {
			key: `section:${id}`,
			title,
			label: nav?.part && nav.part !== title ? `${title} — ${nav.part}` : title,
			sectionId: id
		};
	}
}

export const readingContext = new ReadingContext();
