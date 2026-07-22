<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { ChevronRight, PanelLeft, RotateCcw } from 'lucide-svelte';
	import { autohideScroll } from '$lib/actions/autohide-scroll';
	import { isActivity, sidebarNav, type NavItem, type NavSection } from '$lib/data/sidebar-nav';
	import { progress, resetAllLearningState, activityStateOf } from '$lib/data/progress';
	import {
		TOTAL_PLAYGROUNDS,
		TOTAL_SECTIONS,
		playgroundIds,
		summarizeParts
	} from '$lib/timeline/summary';
	import { watchRailBreakpoint } from '$lib/timeline/breakpoint';
	import { buildHeatLut, lutColour } from '$lib/timeline/heat';
	import { DWELL } from '$lib/timeline/dwell';
	import { allChallenges } from '$lib/playground/challenges';

	let {
		open = false,
		activeSection = '',
		onToggle,
		onNavigate
	}: {
		open: boolean;
		activeSection: string;
		onToggle: () => void;
		onNavigate: (id: string) => void;
	} = $props();

	const sections = sidebarNav;

	/* ══ ONE OBJECT, TWO WIDTHS ═══════════════════════════════════════════════

	   This sidebar used to be two components sharing a file: a `.sidebar-expanded`
	   drawer under `{#if open}` and a `.sidebar-collapsed` icon rail under
	   `{#if !open}`. Toggling destroyed every node in one and constructed a
	   different set in the other, so there was nothing for the browser to animate
	   BETWEEN — the rail's icons vanished, then a panel slid in from off-screen
	   carrying new icons that merely resembled them. No amount of transition
	   tuning reaches that, because the elements are not the same elements.

	   There is now ONE tree, always mounted. Collapsed and expanded are the same
	   nav at two container widths:

	     - the panel's WIDTH animates, 52px ⇄ var(--sidebar-width), and nothing
	       translates;
	     - `.rail-inner` is laid out at the FULL width at all times and the panel
	       clips it, so no row ever reflows horizontally — the collapsed state is
	       literally the expanded state with the label column cropped off;
	     - labels and carets fade and then go `visibility: hidden`, which is what
	       keeps them out of the tab order and the accessibility tree while they
	       are invisible;
	     - a part's children are a `grid-template-rows: 0fr → 1fr` reveal on
	       persistent nodes rather than a mount, so they grow in the same gesture
	       whether it was the part or the whole sidebar that opened.

	   The consequence that matters: the icon column's x is 5.5px (nav) + 12px
	   (row) + 8.5px (half a 17px glyph) = 26px, computed from paddings that do
	   not depend on the panel's width. It is 26.00px collapsed, 26.00px expanded,
	   and 26.00px on every frame in between — by construction, not by tuning.
	   26 is also the app logo's centre in the header: the logo sits centred in a
	   cell that is `--sidebar-collapsed-width` (52px) wide, so 52 / 2 = 26 and
	   the whole left edge of the app is one column. */

	/**
	 * One clock for the entire morph: the panel's width, the labels fading up,
	 * the icons brightening, the carets turning and the children sliding
	 * down. They are not separate animations that happen to be
	 * near each other, they are one gesture, and the moment two of them disagree
	 * it reads as a swap again.
	 *
	 * 200ms is not a taste value — it is `duration-200` on `.main-content`'s
	 * margin in +page.svelte and on the `.sidebar-panel` width here. The page
	 * body and the sidebar edge are the same moving line, so they must be on the
	 * same clock or the reader sees the panel arrive and the text follow.
	 *
	 * Exposed to CSS as `--morph-ms` on the panel, so the stylesheet cannot fall
	 * out of step with the script, and so `prefers-reduced-motion` can collapse
	 * every one of those transitions by redefining a single custom property.
	 */
	const MORPH_MS = 200;

	/**
	 * …but the stylesheet override for `prefers-reduced-motion` CANNOT do that,
	 * because `--morph-ms` is written as an INLINE style on the panel and an
	 * inline declaration outranks any stylesheet rule. Wrapping the override in a
	 * media query does not change specificity, so a `@media` block would be
	 * dead: measured under reduce, `--morph-ms` would compute to 200ms, leaving
	 * a ~200ms window in which labels were still visible and FOCUSABLE inside a
	 * 52px panel — the exact failure the delayed `visibility` steps exist to
	 * prevent. Motion would still look instant only because layout.css clamps
	 * `transition-duration` globally with `!important`; it says nothing about
	 * delays.
	 *
	 * So the preference is resolved here, at the one place that wins.
	 */
	let reduceMotion = $state(false);
	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const read = () => (reduceMotion = mq.matches);
		read();
		mq.addEventListener('change', read);
		return () => mq.removeEventListener('change', read);
	});
	/** 1ms rather than 0, so the delayed `visibility` steps still land AFTER
	 *  their fade instead of racing it. */
	const morphMs = $derived(reduceMotion ? 1 : MORPH_MS);

	/* ── who owns "course progress" at this width ───────────────────────────
	   The mini timeline is MOBILE ONLY. On desktop the header's Thread rail is
	   the live, cursor-driven version of the same model, and two timelines on
	   one screen is one too many.

	   `wide` is the rail's own condition, read from the shared
	   RAIL_MEDIA_QUERY — the header does not evaluate a private copy of the
	   string, it imports the same watcher. So the two are complementary by
	   construction: at every width, `wide` renders the rail and `!wide`
	   renders the mini timeline, and there is no width where both or neither
	   is true. Both start false (the mobile arrangement) and flip on the same
	   matchMedia event, so the boundary holds during hydration too.

	   The reset button hangs off the same condition: on any width where the
	   rail is mounted the reset lives in the header beside it, so the copy
	   down here renders only under `!wide` — exactly one on screen, never two
	   and never zero. */
	let wide = $state(false);
	$effect(() => watchRailBreakpoint((m) => (wide = m)));

	// Look up every child id's parent section id, straight from the nav tree.
	// Playground activities (core-loop, wrong-branch, …) and challenge anchors
	// (ch-N-slug) deliberately don't follow the `section-N-` naming, so
	// string-prefix matching can't tell which part they belong to — this can.
	// Plain object: built once from static data, never reactively mutated.
	const childToParent: Record<string, string> = {};
	for (const s of sections) {
		for (const c of s.children ?? []) childToParent[c.id] = s.id;
	}

	/* ── progress, on the SAME denominators as the header rail ──────────────
	   This used to divide by `sectionIds.length` — part headers included,
	   playgrounds excluded — while the rail counts the manifest's
	   `kind: 'section'` anchors and reports playgrounds separately. Both
	   surfaces now read `summarizeParts`, so the sidebar's percentage is by
	   construction the sum of the rail's per-part chips. See
	   src/lib/timeline/summary.ts for why part headers are not "read". */

	/** Module-constant, never mutated — so a plain Set, not a SvelteSet. */
	const pgSet = new Set<string>(playgroundIds);

	/* READ is scroll-derived and therefore prose-only. The scroll-spy writes
	   `progress.sections` for every anchor it passes, activities included, so an
	   unfiltered set would count a playground as "read" the moment it scrolled
	   by. Filtering here is the same guard `timeline/state` puts on the rail's
	   sets, for the same reason. */
	const readIds = $derived(new Set(Object.keys($progress.sections).filter((id) => !pgSet.has(id))));
	// Intersected with the manifest for the same reason the rail does it: the
	// scenario record also collects ids from the standalone playground panel and
	// from stale localStorage, which would otherwise inflate the count.
	const doneIds = $derived(new Set(Object.keys($progress.scenarios).filter((id) => pgSet.has(id))));
	/** Started but not solved — disjoint from doneIds, as on the rail. */
	const attemptedIds = $derived(
		new Set(
			Object.keys($progress.attempts).filter((id) => pgSet.has(id) && !$progress.scenarios[id])
		)
	);

	const partStats = $derived(summarizeParts(readIds, doneIds));
	/* The same rollup over "engaged" (attempted ∪ completed), so the mini
	   timeline can show a part being worked without editing the shared
	   summarizeParts: it is pure, so calling it twice is just arithmetic. */
	const engagedStats = $derived(summarizeParts(readIds, new Set([...doneIds, ...attemptedIds])));
	const sectionsRead = $derived(partStats.reduce((a, p) => a + p.sectionsRead, 0));
	const readPct = $derived(Math.round((sectionsRead / TOTAL_SECTIONS) * 100));
	/** COMPLETED, never "arrived at" — this is the number the counter quotes. */
	const doneCount = $derived(partStats.reduce((a, p) => a + p.playgroundsDone, 0));
	const attemptedCount = $derived(attemptedIds.size);

	const stateOf = (id: string) => activityStateOf($progress, id);

	/**
	 * Activity rows keep their own colour whether or not they are the active
	 * row — the type IS the signal. Prose rows return undefined and fall back
	 * to the primary/muted pair. Terracotta for challenges, lifting to the
	 * -bright variant once solved — same hue, more light, so completion reads
	 * as a brightness change rather than a hue swap (the one channel that
	 * survives color blindness). Playgrounds keep the pink their cards use.
	 */
	function activityColor(item: NavItem): string | undefined {
		if (item.isChallenge)
			return stateOf(item.id) === 'completed'
				? 'var(--color-challenge-bright)'
				: 'var(--color-challenge)';
		if (item.isPlayground) return 'var(--color-important)';
		return undefined;
	}

	/** The solved tick: lifted green beside a challenge, the usual tip blue elsewhere. */
	function tickColor(item: NavItem): string {
		return item.isChallenge ? 'var(--color-earned-bright)' : 'var(--color-tip)';
	}

	/**
	 * Weight follows ENGAGEMENT, so the TOC agrees with the rail: an activity
	 * you have never touched is the quietest row on the list, one you have
	 * started sits between, and one you have solved is at full strength. Prose
	 * rows are unaffected — they were never dimmed by this.
	 */
	function activityOpacity(item: NavItem, activity: boolean, childActive: boolean): string {
		if (!activity || childActive) return '1';
		const st = stateOf(item.id);
		if (st === 'completed') return '1';
		return st === 'attempted' ? '0.8' : '0.55';
	}

	/**
	 * The part row's ink, and the only thing about a row that differs between
	 * the two states — which is the point. Collapsed, an inactive part sits at
	 * `--color-text-muted`; expanded it lifts one step to
	 * `--color-text-secondary` — not all the way to `--color-text`, which made
	 * ten rows of navigation as bright as the prose they navigate. The active
	 * part is `--color-primary` in both, because "where you are" does not get
	 * quieter just because the panel is narrow.
	 *
	 * It is returned as a colour rather than an opacity so the CSS transition on
	 * `color` interpolates it, and so the row's icon, label and caret all
	 * brighten together off one inherited value.
	 */
	function partInk(active: boolean): string {
		if (active) return 'var(--color-primary)';
		return open ? 'var(--color-text-secondary)' : 'var(--color-text-muted)';
	}

	/* ── which theme, so the heat ramp can be resolved ──────────────────────
	   Same three-way read as the rail's own theme detection: an explicit
	   `.dark`/`.light` on the root wins, and `system` falls through to the media
	   query. Both inputs are watched, because the header's theme toggle writes
	   the class and the OS can change the query underneath a `system` reader.

	   Assigning state inside an `$effect` is the right shape here and not the
	   usual smell: both inputs are DOM events outside Svelte's graph, so there
	   is nothing for a `$derived` to depend on. It is the same arrangement
	   `wide` uses above, one subscription per external source. */
	let dark = $state(true);
	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const read = () => {
			const c = document.documentElement.classList;
			dark = c.contains('dark') ? true : c.contains('light') ? false : mq.matches;
		};
		read();
		mq.addEventListener('change', read);
		const mo = new MutationObserver(read);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => {
			mq.removeEventListener('change', read);
			mo.disconnect();
		};
	});

	/* THE ramp — imported, not re-derived. `buildHeatLut` is the same function
	   the header rail paints its section bars with, at the same `chromaGamma`,
	   so a part at 60% here is literally the colour a section at 60% heat is up
	   there. The INPUT differs and honestly must: the rail measures dwell
	   seconds and the sidebar has no tracker (the rail owns it and is not
	   mounted at this width), so the scalar here is the fraction of the part's
	   sections read. Same ramp, coarser signal — which is the whole trade this
	   surface makes. */
	const heatLut = $derived(buildHeatLut(dark ? 'dark' : 'light', DWELL.chromaGamma));

	/** Which part each challenge belongs to — one per part, hero excepted. */
	const challengeOfPart = $derived(
		new Map(allChallenges.map((c) => [c.partId as string, stateOf(c.id)]))
	);

	/* ── the mini timeline ──────────────────────────────────────────────────
	   GRANULARITY IS PARTS (10), and that is a measurement rather than a
	   preference: at the manifest's 42 sections the expanded bar would hand
	   each segment ~3px — under the 5.5px at which the rail itself gives up
	   on the hatch (`is-tiny`). At 10 segments each gets ~19px, which is room
	   for a mark, a ring and a real stretch of texture.

	   Sub-part resolution drives COLOUR, never geometry: a part 3-of-4 read is
	   one flat tone off the rail's heat LUT, not a box three quarters full with
	   an edge inside it. That is the move `DWELL.bucketsPerBar: 1` made on the
	   rail when its per-bar gradients read as too busy.

	   The activity lanes are MARKS, not strips: one square per part that has
	   playgrounds, one rhomboid per part that has a challenge, in their own
	   lanes either side of the thread, on the rail's own tokens.

	   Widths are proportional to each part's anchor count, so the bar keeps the
	   rail's sense of course shape; `min-width` stops the lean parts (Part 7 has
	   three sections) from disappearing. */
	const partBars = $derived(
		partStats.map((p, i) => {
			const readFrac = p.sections ? p.sectionsRead / p.sections : 0;
			const engaged = engagedStats[i].playgroundsDone;
			return {
				...p,
				weight: p.sections + p.playgrounds,
				readFrac,
				/* Never been here. The one thing the hatch is allowed to mean, on
				   this surface as on the rail. */
				cold: p.sectionsRead === 0,
				tone: lutColour(heatLut, readFrac),
				/** none | some | all — absent when the part holds no playgrounds. */
				pg: !p.playgrounds
					? null
					: p.playgroundsDone === p.playgrounds
						? 'all'
						: engaged > 0
							? 'some'
							: 'none',
				/** The rail's three challenge states, straight from the same record. */
				ch: challengeOfPart.get(p.id) ?? null
			};
		})
	);

	/** Which part the reader is inside — the rail's "where you are now". */
	const activePartId = $derived(sections.find((s) => isActive(s.id))?.id ?? null);

	/** Challenges are DRAWN on the mini timeline, so they are spoken too. */
	const challengesDone = $derived(
		allChallenges.filter((c) => stateOf(c.id) === 'completed').length
	);

	const progressLabel = $derived(
		`Course progress: ${sectionsRead} of ${TOTAL_SECTIONS} sections read, ` +
			`${doneCount} of ${TOTAL_PLAYGROUNDS} exercises completed` +
			(attemptedCount ? `, ${attemptedCount} started` : '') +
			`, ${challengesDone} of ${allChallenges.length} challenges solved.`
	);

	const CH_WORD = { untouched: 'not attempted', attempted: 'started', completed: 'solved' };

	function partTitle(p: (typeof partBars)[number]): string {
		const bits = [`${p.sectionsRead}/${p.sections} read`];
		if (p.playgrounds) bits.push(`${p.playgroundsDone}/${p.playgrounds} solved`);
		if (p.ch) bits.push(`challenge ${CH_WORD[p.ch]}`);
		return `${p.label} — ${bits.join(' · ')}`;
	}

	const expandedSections = new SvelteSet<string>();
	/**
	 * What the learner explicitly asked for, which always outranks auto-expand.
	 *
	 * Without this, collapsing the part you're currently reading didn't stick:
	 * scroll-spy keeps `activeSection` inside that part, so the auto-expand
	 * effect re-opened it on the very next tick. An entry is dropped once the
	 * reader moves on to a different part, so the automatic behaviour returns.
	 */
	const userIntent = new SvelteMap<string, 'open' | 'closed'>();

	/**
	 * A part's children are REVEALED, never mounted, so this is the only
	 * condition the CSS reads: the panel must be wide enough to show them AND
	 * the part must be open. Collapsed, every part's children sit at
	 * `grid-template-rows: 0fr` with `visibility: hidden` — zero height in the
	 * icon column, and out of both the tab order and the accessibility tree.
	 *
	 * Keeping the `expandedSections` bookkeeping independent of `open` is what
	 * makes the reverse gesture continuous too: collapse the sidebar with three
	 * parts open and they fold up with it, and they are still open when it
	 * comes back.
	 */
	const shows = (id: string) => open && expandedSections.has(id);

	/* Resetting wipes every recording (bar, ✔ ticks, checklist, dwell heat) —
	   ask twice.

	   This is the PHONE copy of the reset. On any width where the header's
	   Thread rail is mounted the control lives up there, immediately left of
	   the rail it acts on; down here the rail is not mounted and the sidebar is
	   the only place progress is shown, so it is the only place the button can
	   be. Both are gated on the same `wide`, so exactly one exists at any
	   width — never both, never neither. Both call the same
	   `resetAllLearningState`, so "reset" means the identical thing at every
	   width; the header's copy additionally has to drop the live dwell tracker,
	   which cannot exist here because the rail that owns it is not mounted. */
	let resetArmed = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	function handleResetProgress() {
		if (!resetArmed) {
			resetArmed = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (resetArmed = false), 2500);
			return;
		}
		clearTimeout(resetTimer);
		resetArmed = false;
		resetAllLearningState();
		// "Back to the initial state" includes where the reader is standing —
		// same move the header's copy makes.
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
	}

	$effect(() => () => clearTimeout(resetTimer));

	function toggleSection(id: string) {
		if (expandedSections.has(id)) {
			expandedSections.delete(id);
			userIntent.set(id, 'closed');
		} else {
			expandedSections.add(id);
			userIntent.set(id, 'open');
		}
	}

	function scrollTo(id: string, closeSidebarOnMobile = true) {
		const el = document.getElementById(id);
		if (el) {
			onNavigate(id);
			if (closeSidebarOnMobile && open && window.innerWidth < 1024) onToggle();
		}
	}

	function isActive(sectionId: string): boolean {
		if (activeSection === sectionId) return true;
		// A child (section or playground/challenge activity) lights up its parent.
		if (childToParent[activeSection] === sectionId) return true;
		if (sectionId === 'hero')
			return activeSection === 'hero' || activeSection.startsWith('section-intro-');
		const partNum = sectionId.replace('part-', '');
		return activeSection.startsWith(`section-${partNum}-`);
	}

	/* ── one click handler, because there is one row ─────────────────────────

	   Clicking a part icon while collapsed opens the panel and expands that part
	   in one motion: the icon you pressed does not move a pixel horizontally,
	   the labels fade up around it, and that part's children unfold directly
	   beneath it. That is the COMMIT gesture.

	   The flyout below is the PREVIEW gesture, and the two are deliberately
	   different verbs — see the flyout block. */
	function handlePartClick(section: NavSection) {
		if (!open) {
			onToggle();
			if (section.children) {
				expandedSections.add(section.id);
				userIntent.set(section.id, 'open');
			}
			// `false`: we have just asked for this panel, so the mobile
			// auto-close would undo the gesture on the same frame.
			scrollTo(section.id, false);
			return;
		}
		// The label both navigates and toggles: clicking an open part closes it,
		// clicking a closed one opens it. The caret does the same without moving
		// the page.
		if (section.children) toggleSection(section.id);
		scrollTo(section.id);
	}

	/* ══ THE COLLAPSED-ONLY PREVIEW FLYOUT ════════════════════════════════════

	   Collapsed, the rail is ten unlabelled glyphs. The icon answers "take me
	   there"; the flyout answers "what is in here?" without committing to the
	   drawer.

	   In the merged tree an INTERACTIVE flyout would be precisely the thing the
	   rewrite exists to forbid: the inline labels and child rows are always in
	   the DOM now, held out of the tab order by `visibility: hidden`, so a
	   focusable flyout would be a second reachable rendering of rows that are,
	   three metres away in the same tree, deliberately hidden from AT. Two
	   labelled copies of one list, one hidden from AT and one not, is worse
	   than no preview at all.

	   So this one is a READING SURFACE for the pointer and nothing else:

	     - it holds no tab stop — the rows are real buttons so a mouse can act
	       on them, but every one carries `tabindex="-1"`;
	     - it is `aria-hidden`, because the accessible tree already has this
	       information: `.nav-part` carries `aria-label={section.label}`, and a
	       screen-reader user opens the part rather than hovering a picture of
	       it. Exposing it twice would make the same ten parts announce twenty
	       times;
	     - it lives OUTSIDE the `<aside>`. The panel is `overflow: hidden` (that
	       clip is what crops the full-width rail to 52px), so anything inside
	       it would be cut off at the icon column. Being a fixed-position
	       sibling also means it cannot reflow the nav, cannot shift the icon
	       column off 26px, and cannot put a scrollbar anywhere near it.

	   VERBS: hover/focus previews, click commits. */
	let flyoutId = $state<string | null>(null);
	/** Viewport y of the row the flyout is anchored to. */
	let flyoutY = $state(0);
	/** Measured, so a part near the bottom can be pulled back into view. */
	let flyoutH = $state(0);
	let flyoutTimer: ReturnType<typeof setTimeout> | undefined;

	const flyoutSection = $derived(sections.find((s) => s.id === flyoutId) ?? null);

	/**
	 * Touch reports a synthetic `mouseenter` on tap, which would flash a preview
	 * over the panel the same tap is already opening. Hover-capable pointers
	 * only; the focus path below is unconditional.
	 */
	const canHover = () => window.matchMedia('(hover: hover)').matches;

	function openFlyout(section: NavSection, row: Element | null) {
		// COLLAPSED ONLY, asserted at the source rather than only in the markup:
		// while `open` the inline labels are the preview, and two label systems
		// on screen at once is the exact failure this guard exists to prevent.
		if (open || !section.children || !row) return;
		clearTimeout(flyoutTimer);
		flyoutY = row.getBoundingClientRect().top;
		flyoutId = section.id;
	}

	/**
	 * `grace` covers the 6px gutter between the rail and the panel: without it
	 * the pointer crossing that gap fires `mouseleave` on the row before
	 * `mouseenter` on the flyout, and the thing you were reaching for vanishes.
	 * WCAG 2.2 SC 1.4.13 calls that "hoverable" and it is why the flyout takes
	 * pointer events at all.
	 */
	function closeFlyout(grace = 0) {
		clearTimeout(flyoutTimer);
		if (!grace) {
			flyoutId = null;
			return;
		}
		flyoutTimer = setTimeout(() => (flyoutId = null), grace);
	}

	/* Opening the panel retires the preview: the labels it was standing in for
	   are about to fade up two pixels away. */
	$effect(() => {
		if (open) closeFlyout();
	});
	$effect(() => () => clearTimeout(flyoutTimer));

	/**
	 * Anchored to the row, then pulled back inside the viewport if the last
	 * parts' children would hang off the bottom. 8px of air at either end.
	 */
	function flyoutTop(y: number, h: number): number {
		return Math.max(8, Math.min(y, window.innerHeight - h - 8));
	}

	/**
	 * THE 26px INVARIANT HAS A HOLE, and this plugs it.
	 *
	 * `overflow: hidden` hides a scrollbar; it does not make a box unscrollable.
	 * `.rail-inner` is laid out at the full `--sidebar-width` inside a 52px
	 * panel, so while collapsed the panel has ~220px of real scrollable
	 * overflow — invisible, but there. Anything that asks the browser to bring
	 * a row into view along the inline axis will happily take it:
	 * `scrollIntoView({ inline: 'center' })` on a part row drives the panel's
	 * `scrollLeft` deep positive and puts the icon column at negative x.
	 * Playwright's own `hover()` does exactly this, which is how it turns up.
	 *
	 * Nothing in this component asks for that today, but the invariant should
	 * not depend on nobody ever calling `scrollIntoView` on a nav row — that is
	 * the kind of guarantee that holds until the day it doesn't. The vertical
	 * scroll of `.rail-nav` is untouched; only the inline axis is pinned, and it
	 * has no legitimate reason to move in either state.
	 */
	function pinLeft(e: Event & { currentTarget: HTMLElement }) {
		if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0;
	}

	/** The part the reader was last inside, so we can forget stale intent. */
	let lastReadPart: string | null = null;

	$effect(() => {
		const parent = childToParent[activeSection] ?? null;
		if (!parent || !isActive(parent)) return;

		// Moving to a different part retires the previous part's override:
		// closing one section shouldn't keep it shut forever.
		if (parent !== lastReadPart) {
			if (lastReadPart) userIntent.delete(lastReadPart);
			lastReadPart = parent;
		}

		untrack(() => {
			// Collapse whatever opened on its own, keeping deliberate opens.
			for (const id of [...expandedSections]) {
				if (id !== parent && userIntent.get(id) !== 'open') expandedSections.delete(id);
			}
			// Follow the reader — unless they closed this one by hand.
			if (userIntent.get(parent) !== 'closed') expandedSections.add(parent);
		});
	});
</script>

{#snippet navIcon(item: NavItem, active: boolean, size: number)}
	{@const Icon = item.icon}
	<Icon {size} strokeWidth={active ? 2.5 : 2} />
{/snippet}

<!--
  An activity's THREE states.

  untouched — no mark at all, and the row sits at the lowest opacity. Absence is
  the quietest possible statement, and it is the honest one: nothing has
  happened here.
  attempted — a small OUTLINE of the shape this activity wears on the header
  rail: a square for a playground, a rhomboid for a challenge. Borrowing the
  rail's shapes rather than inventing a third marker means the TOC and the rail
  are two views of one vocabulary.
  completed — the filled tick, unchanged: lifted green beside a challenge, the
  usual tip blue elsewhere.

  The outline inherits `currentColor` from the row, so a challenge's is
  terracotta and a playground's pink, with no second colour decision.
-->
{#snippet activityMark(item: NavItem)}
	{@const st = stateOf(item.id)}
	{#if st === 'completed'}
		<span class="act-tick" style="color: {tickColor(item)};" aria-hidden="true">✔</span>
		<span class="sr-only">— completed</span>
	{:else if st === 'attempted'}
		<span class="act-open" class:act-rhomb={item.isChallenge} aria-hidden="true"></span>
		<span class="sr-only">— started, not solved</span>
	{/if}
{/snippet}

<!--
  The counts, and the reset confirmation that borrows their line.
-->
{#snippet progressCounts()}
	{#if resetArmed}
		Click again to reset all progress
	{:else}
		<!-- The count is COMPLETIONS — scenarios whose goal check passed — and
		     never activities the reader merely scrolled onto. Anything started
		     but unsolved is reported separately rather than folded in, because
		     those are the two things this line used to confuse. -->
		<!-- One expression rather than an {#if}: the separator's leading space is
		     significant, and a block tag lets the formatter wrap the line and eat
		     it, which is how this would render as "0/23 exercises· 1 started". -->
		{readPct}% read · {doneCount}/{TOTAL_PLAYGROUNDS} exercises{attemptedCount
			? ` · ${attemptedCount} started`
			: ''}
	{/if}
{/snippet}

<!--
  The mini timeline, in the header rail's own system rather than a second one.
  MOBILE ONLY — see `wide` above. It borrows the rail's SYSTEM, not its
  geometry: one flat colour per unit, the hatch meaning only "never been here",
  squares for playgrounds and rhomboids for challenges in lanes either side of
  the thread, and the primary indigo as a ring that means only "where you are
  now".
-->
{#snippet miniTimeline()}
	<div class="mini" role="img" aria-label={progressLabel}>
		<!-- Playgrounds: above the thread, as on the rail. -->
		<div class="mini-lane mini-pg" aria-hidden="true">
			{#each partBars as p (p.id)}
				<div class="mini-cell" style="flex-grow: {p.weight};">
					{#if p.pg}
						<span class="stem"></span><span class="mark sq is-{p.pg}"></span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- The thread. -->
		<div class="mini-lane mini-sec">
			{#each partBars as p (p.id)}
				<div
					class="mini-seg"
					class:is-cold={p.cold}
					class:is-here={p.id === activePartId}
					style="flex-grow: {p.weight}; --tone: {p.tone};"
					title={partTitle(p)}
				></div>
			{/each}
		</div>

		<!-- Challenges: below the thread, as on the rail. -->
		<div class="mini-lane mini-ch" aria-hidden="true">
			{#each partBars as p (p.id)}
				<div class="mini-cell" style="flex-grow: {p.weight};">
					{#if p.ch}
						<span class="stem"></span><span class="mark rh is-{p.ch}"></span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

<!-- DISMISSIBLE without moving the pointer, the other half of SC 1.4.13. There
     is no scrim: a preview that owns no clicks does not need one, and a
     full-screen close button would itself be a stray tab stop. -->
<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && flyoutId) closeFlyout();
	}}
/>

<!--
  The mobile scrim. PERSISTENT, like everything else here: it used to mount and
  unmount with `open`, which meant a hard grey flash arriving a frame before the
  panel started moving. It now fades on the same clock and goes
  `visibility: hidden` at the end, which is what takes it out of the tab order —
  an invisible full-screen button is otherwise a focus trap on the way to the
  content.
-->
<button
	class="sidebar-scrim fixed inset-0 z-40 bg-black/30 lg:hidden"
	class:is-on={open}
	onclick={onToggle}
	tabindex={open ? 0 : -1}
	aria-label="Close sidebar"
></button>

<!-- ───── THE SIDEBAR — one tree, two widths ───── -->
<aside
	class="sidebar-panel fixed top-0 bottom-0 left-0 z-40 border-r"
	class:is-open={open}
	style="--morph-ms: {morphMs}ms; border-color: var(--color-border-light);"
	data-fabric
	onscroll={pinLeft}
>
	<!-- Laid out at the full expanded width in BOTH states; the panel above
	     clips it. This is what guarantees no row ever reflows horizontally when
	     the sidebar opens — there is no horizontal layout change to animate,
	     only a crop that moves. `overflow: hidden` on the panel clips hit
	     testing as well as paint, so the parts of a row hanging past 52px are
	     not clickable while collapsed even before `visibility` hides them. -->
	<div class="rail-inner" style="padding-top: var(--header-height);">
		<!-- The head row is built to the SAME geometry as a nav row, because it is
		     one: 17.5px of padding puts the 17px glyph's centre on 26px, the
		     column every nav icon below it and the app logo above it sit on.

		     The toggle is ONE control with ONE glyph in both states, where there
		     used to be a `PanelLeft` at the top of the rail and a different
		     `PanelLeftClose` on the right of the drawer's header. Two icons in
		     two places is the swap this rewrite is removing, in miniature: the
		     button that performs the morph cannot itself jump across the panel
		     while performing it. State is carried by `aria-expanded` and by the
		     panel's own width, which is the most legible indicator available. -->
		<div class="rail-head">
			<button
				class="head-toggle"
				onclick={onToggle}
				aria-expanded={open}
				aria-controls="sidebar-contents"
				aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
				title={open ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<PanelLeft size={17} />
			</button>
			<span
				class="nav-label head-title"
				style="color: var(--color-text-muted); letter-spacing: 0.14em; font-family: var(--font-heading);"
			>
				Contents
			</span>
		</div>

		<!-- `sectionsRead`, not `readPct`: one section out of 42 rounds to 2%, but
		     a future denominator could round the first read section to 0 and hide
		     the block just as the learner earns it.

		     Below the rail's breakpoint only. Above it the header rail already
		     tells this story in far more detail — per section, with heat and
		     activity marks — and a bar plus a percentage underneath it was the
		     same answer given twice, in the narrower place, competing with the
		     nav it sits on top of. Below the breakpoint the rail does not exist,
		     so the sidebar carries the whole account: the mini timeline, the
		     counts, and the only reset on screen.

		     It REVEALS rather than mounts, on the same 0fr→1fr as a part's
		     children — otherwise opening the sidebar would insert 40px above the
		     nav and shove the whole icon column down in one frame. Growing it on
		     the morph clock makes that displacement part of the gesture. -->
		{#if !wide && (sectionsRead > 0 || doneCount > 0)}
			<div class="reveal" class:is-shown={open}>
				<div class="reveal-inner">
					<div class="pr-[9.5px] pb-2 pl-4" title={progressLabel}>
						<!-- pr-[9.5px] + mr-1 puts the reset button on the same vertical
						     axis (23.5px from the right edge) as the section carets — the
						     right padding absorbs the pixels the panel gave up when the
						     nav went symmetric. -->
						<div class="flex items-center">
							<div class="min-w-0 flex-1">
								{@render miniTimeline()}
							</div>
							<button
								onclick={handleResetProgress}
								class="mr-1 ml-2 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-all hover:opacity-100"
								style="color: {resetArmed
									? 'var(--color-warning)'
									: 'var(--color-text-muted)'}; opacity: {resetArmed ? '1' : '0.6'};"
								aria-label={resetArmed ? 'Click again to reset all progress' : 'Reset progress'}
								title={resetArmed ? 'Click again to reset all progress' : 'Reset progress'}
							>
								<RotateCcw size={11} />
							</button>
						</div>
						<p class="mt-1 text-[10.5px]" style="color: var(--color-text-muted);">
							{@render progressCounts()}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- pl-[5.5px], not px-3: 5.5 (nav) + 12 (the row's own px-3) + 8.5 (half
		     of a 17px icon) = 26px, the app logo's centre. Both numbers are
		     paddings on elements whose width never changes, so this arithmetic
		     holds identically in both states and on every frame between them —
		     which is the whole point of the merge. -->
		<!-- Scrolling the nav moves the row the flyout is pinned to, and the flyout
		     is fixed — so it would be left pointing at whatever slid into its
		     place. Retire it rather than track it. -->
		<nav
			id="sidebar-contents"
			class="rail-nav flex-1 py-2 pr-[5.5px] pl-[5.5px]"
			use:autohideScroll
			onscroll={(e) => {
				pinLeft(e);
				if (flyoutId) closeFlyout();
			}}
		>
			{#each sections as section (section.id)}
				{@const active = isActive(section.id)}
				{@const shown = shows(section.id)}
				<!-- Blocks and rows sit flush against each other; the rows' own
				     py-2.5 is what keeps the list breathing, not margins between
				     them. -->
				<div class="nav-block">
					<!-- The row, not the button, is the hover target: the row is what the
					     flyout is anchored to, and `overflow: hidden` on the panel clips
					     hit testing as well as paint, so "the row" while collapsed is
					     exactly the 52px the reader can see. `mouseenter`/`mouseleave`
					     rather than over/out — they do not bubble from the glyph, so
					     crossing the icon does not re-fire them.

					     `role="none"` is the accurate answer to "what role does a div with
					     a mouse handler have": none. It is a layout wrapper that happens
					     to be the right hit region, the pointer behaviour it carries is a
					     pure enhancement with a keyboard equivalent on the button inside,
					     and the role does not cascade — the two real controls it contains
					     keep theirs. -->
					<div
						role="none"
						class="nav-item relative flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
						style="color: {partInk(active)};"
						onmouseenter={(e) => {
							if (canHover()) openFlyout(section, e.currentTarget);
						}}
						onmouseleave={() => closeFlyout(90)}
					>
						<button
							onclick={() => handlePartClick(section)}
							class="nav-part flex flex-1 cursor-pointer items-center gap-2.5 text-left"
							aria-label={section.label}
							onfocus={(e) => openFlyout(section, e.currentTarget.closest('.nav-item'))}
							onblur={() => closeFlyout()}
							title={open || section.children ? undefined : section.label}
						>
							<!-- shrink-0 is load-bearing, not tidiness: this glyph shares a
							     flex row with a label around 200px wide, and a flex item's
							     declared size is only a basis. Without it the icon would be
							     squeezed — and an icon that changes WIDTH changes where its
							     centre is, which is the one thing that must never happen
							     here. -->
							<span class="nav-glyph shrink-0">
								{@render navIcon(section, active, 17)}
							</span>
							<span
								class="nav-label flex-1"
								style="font-family: var(--font-heading); font-weight: {active
									? '700'
									: '500'}; font-size: 14.5px; letter-spacing: -0.01em;"
							>
								{section.label}
							</span>
						</button>
						{#if section.children}
							<!-- -mr-1 lines the caret up with the reset button (both
							     centered 23.5px from the sidebar's right edge).

							     This is the disclosure control, so it carries
							     `aria-expanded`/`aria-controls` rather than a label that
							     flips between "Expand" and "Collapse". While the panel is
							     collapsed it is `visibility: hidden` along with the
							     children it controls — the disclosure genuinely is not
							     available at that width, and saying so is more honest
							     than exposing a control whose target is hidden.

							     "<part> sections" rather than the bare label: this
							     button sits immediately after one that is already named
							     for the part, and two adjacent controls with the identical
							     accessible name is exactly the thing that makes a nav
							     unusable by voice control and confusing on a screen
							     reader. With aria-expanded it announces as
							     "Introduction sections, collapsed, button". -->
							<button
								onclick={() => toggleSection(section.id)}
								class="nav-caret -mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded"
								aria-expanded={shown}
								aria-controls="kids-{section.id}"
								aria-label="{section.label} sections"
							>
								<span class="caret-glyph" class:is-turned={shown}>
									<ChevronRight size={13} />
								</span>
							</button>
						{/if}
					</div>

					{#if section.children}
						<!-- REVEALED, never mounted. `grid-template-rows: 0fr → 1fr` on a
						     persistent subtree is what makes "the icon moves smoothly
						     downward as that section opens" ordinary layout the browser
						     animates for free — and it means the same nodes serve the
						     part being toggled and the whole sidebar opening, so the two
						     cannot animate differently.

						     Both numbers below are derived from the section row above, not
						     eyeballed, so the two stay locked together:

						     The rule hangs from the section ICON, whose centre is 26px
						     from the panel's left edge. This div's content edge is at the
						     nav's 5.5px, so ml-5 (20px) puts the 1px border at 25.5–26.5 —
						     centred on it.

						     The child icons line up with the section LABEL, which starts
						     after the icon and its gap-2.5: 5.5 + 12 + 17 + 10 = 44.5px.
						     From the border at 26.5px, the child button's own px-2.5
						     contributes 10px, so this padding must be the remaining 8px
						     (pl-2). -->
						<div class="nav-kids" class:is-shown={shown} id="kids-{section.id}">
							<div class="nav-kids-inner">
								<div
									class="ml-5 space-y-0.5 border-l pl-2"
									style="border-color: var(--thread-lit);"
								>
									{#each section.children as child (child.id)}
										{@const childActive = activeSection === child.id}
										{@const activity = isActivity(child)}
										<button
											onclick={() => scrollTo(child.id)}
											class="nav-child-item relative flex w-full cursor-pointer items-center gap-2 px-2.5 py-1 text-left text-[13px] transition-all"
											style="color: {activityColor(child) ??
												(childActive
													? 'var(--color-primary)'
													: 'var(--nav-child-ink)')}; font-weight: {childActive
												? '600'
												: '400'}; opacity: {activityOpacity(
												child,
												activity,
												childActive
											)}; font-size: {activity ? '12px' : '13px'};"
										>
											{@render navIcon(child, childActive, activity ? 11 : 13)}
											<span
												>{child.label}{#if activity}{@render activityMark(child)}{/if}</span
											>
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</nav>
	</div>
</aside>

<!-- ───── the preview flyout — collapsed only ─────
     `!open` is the second of the two gates (the first is in `openFlyout`), and
     it is the one that survives the panel being opened by anything OTHER than
     this component — a keyboard shortcut, a route change, the mobile scrim.

     `--morph-ms` is written INLINE here for the same reason it is on the panel:
     it is the script-resolved value, so `prefers-reduced-motion` reaches this
     surface through `morphMs` rather than through a stylesheet rule that an
     inline declaration would outrank. The `fly` duration reads the same
     variable, so under reduce the preview appears at once instead of sliding.
-->
{#if !open && flyoutSection}
	{@const s = flyoutSection}
	<!-- A MOUSE affordance, and scoped honestly as one.

	     The rows are real buttons so a pointer can act on the preview rather than
	     just read it — a preview you cannot click is a picture of a menu. But
	     they carry `tabindex="-1"` and the container stays `aria-hidden`, because
	     the flyout is a fixed sibling AFTER the entire <aside> in DOM order and
	     `onblur` retires it: a tab walk provably never enters it. Exposing it to
	     AT while the keyboard cannot reach it is worse than not exposing it —
	     announced, unreachable. Keyboard and screen-reader users get the same
	     list, in the tab order, by opening the drawer, which is one keystroke on
	     the part button that is already focused. -->
	<div
		class="nav-flyout fixed z-50 rounded-xl border shadow-xl"
		style="--morph-ms: {morphMs}ms; left: calc(var(--sidebar-collapsed-width) + 6px); top: {flyoutTop(
			flyoutY,
			flyoutH
		)}px;"
		bind:clientHeight={flyoutH}
		aria-hidden="true"
		onmouseenter={() => clearTimeout(flyoutTimer)}
		onmouseleave={() => closeFlyout()}
		transition:fly={{ x: -4, duration: morphMs }}
	>
		<div class="flyout-head flex items-center gap-2 px-3 pt-2.5 pb-1">
			{@render navIcon(s, isActive(s.id), 15)}
			<span>{s.label}</span>
		</div>

		{#if s.children}
			<div class="px-1.5 pt-0.5 pb-1.5">
				{#each s.children as child (child.id)}
					{@const childActive = activeSection === child.id}
					{@const activity = isActivity(child)}
					<button
						type="button"
						tabindex="-1"
						onclick={() => {
							closeFlyout();
							scrollTo(child.id, false);
						}}
						class="flyout-child flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1 text-left"
						style="--row-ink: {activityColor(child) ??
							(childActive
								? 'var(--color-primary)'
								: 'var(--color-text-secondary)')}; --row-dim: {activityOpacity(
							child,
							activity,
							childActive
						)}; font-weight: {childActive ? '600' : '400'}; font-size: {activity
							? '11px'
							: '12px'};"
					>
						{@render navIcon(child, childActive, activity ? 10 : 12)}
						<span
							>{child.label}{#if activity}{@render activityMark(child)}{/if}</span
						>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ═══ THE MORPH ═══════════════════════════════════════════════════════════

	   Everything that moves reads `--morph-ms`, set on the panel from MORPH_MS in
	   script. One property, one clock — and one place for reduced motion to
	   switch the whole gesture off (see the very bottom of this stylesheet).

	   The pattern repeated below for anything that must disappear:

	     transition: opacity var(--morph-ms) ease-out,
	                 visibility 0s linear var(--morph-ms);

	   `visibility` is not interpolable, so delaying it by exactly the fade's
	   duration keeps the element visible for the whole fade OUT and then removes
	   it. Removing it matters: `visibility: hidden` is the one hiding mechanism
	   that takes an element out of the tab order AND the accessibility tree,
	   which is what stops a collapsed sidebar from being a column of invisible
	   focus stops reading out ten part names. Opening reverses the delay to 0s
	   so the element is focusable from frame one. */

	.sidebar-panel {
		width: var(--sidebar-collapsed-width);
		/* Clips `.rail-inner`'s overhang — paint AND hit testing. */
		overflow: hidden;
		transition: width var(--morph-ms) ease-out;

		/* One surface, where there were two: the rail was 40%/blur24 and the
		   drawer 55%/blur28, so the fabric visibly changed density at the moment
		   of the swap. It is one object now, so it gets one recipe. */
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
		backdrop-filter: blur(28px) saturate(1.5);
		-webkit-backdrop-filter: blur(28px) saturate(1.5);

		/* Subsection ink, a step up from --color-text-muted toward
		   --color-text-secondary: the muted token alone is too faint to carry
		   13px rows at body-text contrast, but full secondary would flatten the
		   part/child hierarchy. 30% of the way keeps the same quiet second
		   level while staying legible. */
		--nav-child-ink: color-mix(in srgb, var(--color-text-muted) 70%, var(--color-text-secondary));
	}

	.sidebar-panel.is-open {
		width: var(--sidebar-width);
	}

	/* Fixed at the EXPANDED width in both states. Nothing in here knows what the
	   panel is currently doing, which is precisely why nothing in here moves
	   sideways when the panel does. */
	.rail-inner {
		display: flex;
		width: var(--sidebar-width);
		height: 100%;
		flex-direction: column;
	}

	.rail-nav {
		overflow-y: auto;
		/* The nav is the full --sidebar-width inside a 52px panel while
		   collapsed; without this the overhang would offer a horizontal
		   scrollbar for content the reader is not supposed to reach that way. */
		overflow-x: hidden;
	}

	/* ───── the head row ────────────────────────────────────────────────────
	   17.5px + half a 17px glyph = 26px. Same column as every nav icon below
	   and the app logo above. */
	.rail-head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 12px 12px 17.5px;
	}

	.head-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.head-toggle {
		position: relative;
		display: flex;
		width: 17px;
		height: 17px;
		flex: 0 0 auto;
		cursor: pointer;
		color: var(--color-text-muted);
		transition:
			color var(--morph-ms) ease-out,
			opacity 150ms ease-out;
	}
	/* The button is exactly the glyph so its centre is exactly 26px; the tap
	   target is a pseudo-element hung off it. Sizing the button itself would
	   have meant offsetting it back by half the padding to keep the glyph on
	   26 — two numbers that must agree instead of one that cannot disagree. */
	.head-toggle::after {
		content: '';
		position: absolute;
		inset: -11px -12px;
	}
	.head-toggle:hover {
		opacity: 0.7;
	}
	.sidebar-panel.is-open .head-toggle {
		color: var(--color-text-secondary);
	}

	/* ───── labels: present always, visible only when there is room ───────── */
	.nav-label {
		white-space: nowrap;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity var(--morph-ms) ease-out,
			visibility 0s linear var(--morph-ms);
	}
	.sidebar-panel.is-open .nav-label {
		opacity: 1;
		visibility: visible;
		transition:
			opacity var(--morph-ms) ease-out,
			visibility 0s;
	}

	/* The caret hides with the children it discloses, for the same reasons. */
	.nav-caret {
		opacity: 0;
		visibility: hidden;
		transition:
			opacity var(--morph-ms) ease-out,
			visibility 0s linear var(--morph-ms),
			background-color 150ms ease-out;
	}
	.sidebar-panel.is-open .nav-caret {
		opacity: 1;
		visibility: visible;
		transition:
			opacity var(--morph-ms) ease-out,
			visibility 0s,
			background-color 150ms ease-out;
	}

	/* Turned by a class rather than an inline style so it reads `--morph-ms`
	   and cannot drift from the slide it accompanies. cubic-bezier(0.33, 1,
	   0.68, 1) is cubicOut, the easing the children's reveal uses.

	   QUIET until asked for: ten chevrons in a resting column were ten pieces
	   of chrome saying the same thing. On pointer devices the glyph appears
	   when the row is hovered or the control is focused; an open part keeps
	   its (turned) caret visible so the way back never has to be discovered.
	   Touch has no hover, and there the sidebar is the primary nav — so every
	   caret stays visible under (hover: none). */
	.caret-glyph {
		display: flex;
		opacity: 0;
		transition:
			transform var(--morph-ms) cubic-bezier(0.33, 1, 0.68, 1),
			opacity 150ms ease-out;
	}
	.nav-item:hover .caret-glyph,
	.nav-caret:focus-visible .caret-glyph,
	.caret-glyph.is-turned {
		opacity: 0.5;
	}
	@media (hover: none) {
		.caret-glyph {
			opacity: 0.5;
		}
	}
	.caret-glyph.is-turned {
		transform: rotate(90deg);
	}

	/* ───── reveals: children, and the progress block ───────────────────────
	   `0fr → 1fr` on a grid row is the one way to animate to a CONTENT height
	   without measuring it in script. The inner element carries the clip; the
	   outer carries the transition.

	   `min-height: 0` on the inner is required — a grid item's automatic
	   minimum size is its content, which would refuse to shrink to 0fr and the
	   whole reveal would silently do nothing. */
	.nav-kids,
	.reveal {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--morph-ms) cubic-bezier(0.33, 1, 0.68, 1);
	}
	.nav-kids.is-shown,
	.reveal.is-shown {
		grid-template-rows: 1fr;
	}
	.nav-kids-inner,
	.reveal-inner {
		min-height: 0;
		overflow: hidden;
		visibility: hidden;
		transition: visibility 0s linear var(--morph-ms);
	}
	.nav-kids.is-shown .nav-kids-inner,
	.reveal.is-shown .reveal-inner {
		visibility: visible;
		transition-delay: 0s;
	}

	/* ───── the scrim ──────────────────────────────────────────────────────── */
	/* The fill stays on Tailwind's `bg-black/30`, as on the Agent, Playground and
	   Cheat Sheet scrims — there is no scrim token to reach for and inventing a
	   raw colour here would make this the one panel whose backdrop is defined
	   somewhere else. This rule only adds the fade. */
	.sidebar-scrim {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity var(--morph-ms, 200ms) ease-out,
			visibility 0s linear var(--morph-ms, 200ms);
	}
	.sidebar-scrim.is-on {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transition:
			opacity var(--morph-ms, 200ms) ease-out,
			visibility 0s;
	}

	/* ───── rows ────────────────────────────────────────────────────────────
	   The row's ink is the ONLY thing that differs between the two states, and
	   it is a colour rather than an opacity so that one transition on `color`
	   brightens the icon, the label and the caret together off one inherited
	   value. */
	.nav-item {
		border-radius: 8px;
		transition:
			color var(--morph-ms) ease-out,
			background-color 150ms ease-out;
	}
	.nav-item:hover {
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
	}
	/* No hover wash while collapsed: the panel clips the full-width row at
	   52px, which turned the pill into a shape cut off mid-air. The flyout is
	   the rail's hover response. */
	.sidebar-panel:not(.is-open) .nav-item:hover {
		background: transparent;
	}
	.nav-glyph {
		display: flex;
	}

	/* ───── child rows ────────────────────────────────────────────────────
	   min-height is the floor that stops the tight padding from shrinking a
	   row below a usable tap target on mobile, where this sidebar IS the
	   primary nav: 26px clears the 24px of WCAG 2.2 SC 2.5.8 (AA) even for
	   the 11–12px activity rows, whose text alone is shorter than a
	   subsection's. */
	.nav-child-item {
		min-height: 26px;
	}
	.nav-child-item:hover {
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
		border-radius: 6px;
	}

	/* ───── the preview flyout ───────────────────────────────────────────────
	   OPAQUE, unlike the panel. The panel is a 55%/blur28 fabric because it is
	   an EDGE of the app and the page reads through it; this is a card floating
	   over live text, and a translucent card over prose is unreadable at 11px.
	   `--color-surface` is the token every other floating card in the app uses.

	   210px is measured rather than chosen: the longest subsection label in
	   the nav sets it, and the panel it previews is `--sidebar-width` less the
	   44.5px the child rows are indented by, plus the card's own padding.

	   It never scrolls. `flyoutTop` slides a bottom-of-the-rail part back up
	   the viewport instead, because a scrollable preview is a thing you have to
	   operate — and the moment the preview needs operating, the drawer is the
	   better answer and it is one click away. */
	.nav-flyout {
		width: 210px;
		/* OPAQUE, and no backdrop-filter. The panel behind it is a translucent,
		   blurred fabric; a preview that inherits any of that reads as smeared
		   rather than raised. This is a sheet of paper held ABOVE that fabric,
		   so it takes the flat surface colour and lets its shadow do the
		   lifting. */
		background: var(--color-surface);
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		border-color: var(--color-border);
	}

	.flyout-head {
		color: var(--color-text);
		/* No rule under the title. On the dark ground `--color-border-light` is
		   barely distinguishable from the surface, so it read as a smudge rather
		   than a divider — and the title is already set apart by weight, family
		   and size. */
		font-family: var(--font-heading);
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	/* The same 26px floor the inline child rows carry — not for touch (this
	   surface is hover/focus only) but so the two renderings of one list have
	   the same rhythm and the preview is not a denser TOC than the real one. */
	/* `color` and `opacity` come through custom properties rather than being
	   written straight into the inline style. An inline declaration outranks any
	   rule, so with them set directly the :hover below could not touch the text
	   at all — only the background — and the row gave no sign it was a target. */
	.flyout-child {
		min-height: 26px;
		border-radius: 6px;
		color: var(--row-ink);
		opacity: var(--row-dim);
		transition:
			background-color 120ms ease,
			color 120ms ease,
			opacity 120ms ease;
	}

	/* Hover raises CONTRAST rather than lightness, which is why one rule serves
	   both themes: mixing the row's own ink toward `--color-text` moves it
	   brighter on the dark ground and darker on the light one. The 6% wash is
	   the house hover from `.nav-item`, nudged up because this surface is
	   opaque and 4% disappears on it. Dimmed activity rows come to full
	   strength too, so a never-touched playground stops looking disabled the
	   moment you reach it. */
	.flyout-child:hover {
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
		color: color-mix(in srgb, var(--row-ink) 62%, var(--color-text));
		opacity: 1;
	}

	/* ───── activity state marks ─────────────────────────────────────────── */
	.act-tick {
		margin-left: 0.3em;
	}

	/* ATTEMPTED: the rail's own shape, drawn as an OUTLINE. An outline reads as
	   "open, not closed" where a filled mark would read as a second kind of
	   completion. 0.58em keeps it a shade under the tick at both row sizes
	   (13px and 11px) without a second rule per size, and currentColor makes it
	   the row's own hue — terracotta for a challenge, pink for a playground. */
	.act-open {
		display: inline-block;
		width: 0.58em;
		height: 0.58em;
		margin-left: 0.4em;
		vertical-align: -0.01em;
		border: 1.5px solid currentColor;
		border-radius: 1px;
		opacity: 0.85;
	}

	/* Challenges are rhomboids on the rail, so they are rhomboids here. Rotating
	   the same box costs nothing and keeps the two surfaces honest; the slight
	   shrink stops the turned corners from sitting taller than the tick. */
	.act-rhomb {
		transform: rotate(45deg) scale(0.86);
	}

	/* ───── mini timeline ─────────────────────────────────────────────────
	   The header rail's semantic colours, on the rail's own tokens: the violet
	   thread, playground pink, challenge terracotta, and the -bright lifts for
	   completion. All four resolve per theme at the token level, so no swap is
	   needed here. */
	.mini {
		--gv-here: var(--color-primary);
		--gv-thread: var(--color-vibe);
		--gv-play: var(--color-important);
		--gv-clay: var(--color-challenge);
		--gv-earned-bright: var(--color-earned-bright);
		--gv-clay-bright: var(--color-challenge-bright);

		/* THE HATCH. Light keeps ink 72 over bed 9; dark lifts the bed to 30 and
		   pulls the ink down to 52 so the two sit close together and the hatch is
		   a SURFACE rather than the subject. These are the rail's own numbers,
		   copied rather than re-judged — at light's 72/9 on the dark ground the
		   stripes are eight times brighter than the bed they texture, and an
		   untouched bar reads as scratches rather than a timeline waiting to be
		   filled. */
		--hatch-ink: color-mix(in srgb, var(--gv-thread) 72%, transparent);
		--hatch-bed: color-mix(in srgb, var(--gv-thread) 9%, transparent);

		/* Unattempted marks, at the rail's exact weights. Playgrounds whisper
		   (a hairline over a barely-there fill); challenges do not, because
		   there is one per chapter and it is the reward at the end of it. */
		--pg-line: color-mix(in srgb, var(--gv-play) 38%, transparent);
		--pg-fill: color-mix(in srgb, var(--gv-play) 7%, transparent);
		--ch-line: var(--gv-clay);
		--ch-fill: color-mix(in srgb, var(--gv-clay) 26%, transparent);

		display: flex;
		flex-direction: column;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not(.light)) .mini {
			--hatch-bed: color-mix(in srgb, var(--gv-thread) 30%, transparent);
			--hatch-ink: color-mix(in srgb, var(--gv-thread) 52%, transparent);
		}
	}
	:global(:root.dark) .mini {
		--hatch-bed: color-mix(in srgb, var(--gv-thread) 30%, transparent);
		--hatch-ink: color-mix(in srgb, var(--gv-thread) 52%, transparent);
	}
	:global(:root.light) .mini {
		--hatch-bed: color-mix(in srgb, var(--gv-thread) 9%, transparent);
		--hatch-ink: color-mix(in srgb, var(--gv-thread) 72%, transparent);
	}

	.mini-lane {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: row;
		gap: 1.5px;
	}
	/* The activity lanes are a row of cells on the SAME flex weights as the
	   thread, so a part's mark is centred over that part's segment however the
	   widths fall out. Nothing in them is a strip. */
	.mini-cell {
		position: relative;
		flex-basis: 0;
		flex-shrink: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 7px;
	}
	.mini-sec {
		/* 6px: just above the 5.5px at which the rail gives up on the hatch
		   (`is-tiny`), which is what lets this bar keep it honestly. */
		height: 6px;
	}
	.mini-pg,
	.mini-ch {
		height: 7px;
	}

	/* ---- the marks ------------------------------------------------------
	   The rail's rest sizes, held as a ratio: the diamond's edge is ~0.8 of
	   the square's so that a shape rotated 45° does not end up 41% wider than
	   its neighbour. These marks never magnify — the rail's smallest state is
	   this surface's only state. */
	.mini .mark {
		--pg-edge-size: 4.2px;
		--ch-edge-size: 3.4px;
		display: block;
		box-sizing: border-box;
		/* `flex: 0 0 auto` is load-bearing, not tidiness. These sit in a flex row,
		   and a flex item's declared width is only a BASIS — the default
		   `flex-shrink: 1` lets the row squash it whenever the track is tight.
		   The square stops being square, and a rotated rectangle reads as
		   neither a square nor a rhomboid. */
		flex: 0 0 auto;
	}
	.mini .sq {
		width: var(--pg-edge-size);
		height: var(--pg-edge-size);
		/* NOT the rail's 1.5px: on a 4.2px box that rounds 3px off each corner
		   and the square becomes a circle — a third marker shape neither lane
		   owns. 0.2 of the edge is the rail's own radius-to-size ratio held,
		   rather than its absolute number copied. */
		border-radius: 0.85px;
		border: 1px solid var(--pg-line);
		background: var(--pg-fill);
	}
	.mini .rh {
		width: var(--ch-edge-size);
		height: var(--ch-edge-size);
		border-radius: 0.7px;
		transform: rotate(45deg);
		border: 1px solid var(--ch-line);
		background: var(--ch-fill);
	}
	/* Three states, stepping monotonically in weight exactly as on the rail:
	   outline → solid on-colour → the family's BRIGHT lift. The last step is
	   carried by fill brightness plus a ring: a halo the unsolved states do
	   not have is a change in EXTENT, the same kind of channel a shape change
	   is — and unlike hue it survives deuteranopia. */
	.mini .sq.is-some {
		background: var(--gv-play);
		border-color: var(--gv-play);
	}
	.mini .sq.is-all {
		background: var(--gv-earned-bright);
		border-color: var(--gv-earned-bright);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--gv-earned-bright) 30%, transparent);
	}
	.mini .rh.is-attempted {
		background: var(--gv-clay);
		border-color: var(--gv-clay);
	}
	.mini .rh.is-completed {
		background: var(--gv-clay-bright);
		border-color: var(--gv-clay-bright);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--gv-clay-bright) 30%, transparent);
	}

	/* The hairline that ties a mark back to the thread, at the rail's own
	   opacities. It is what makes the three lanes read as one object rather
	   than three rows that happen to share an axis. Stems run vertically, from
	   the thread out to the mark. */
	.mini .stem {
		position: absolute;
		background: color-mix(in srgb, var(--gv-play) 38%, transparent);
		left: 50%;
		width: 1px;
		margin-left: -0.5px;
	}
	.mini-ch .stem {
		background: color-mix(in srgb, var(--gv-clay) 42%, transparent);
	}
	.mini-pg .stem {
		top: 50%;
		bottom: -1px;
	}
	.mini-ch .stem {
		top: -1px;
		bottom: 50%;
	}

	/* ---- the thread: ONE FLAT COLOUR PER PART --------------------------
	   `--tone` is resolved in script off the rail's own heat LUT, so a part's
	   read fraction lands on the same ramp a section's dwell heat does up there.
	   No gradient and no fill edge: the rail collapsed to one bucket per bar
	   precisely because dozens of little ramps read as too busy, and ten of
	   them at a third of the size would read worse. */
	.mini-seg {
		position: relative;
		flex-shrink: 1;
		flex-basis: 0;
		min-width: 7px;
		border-radius: 1.5px;
		background-color: var(--tone);
		transition: background-color 400ms ease-out;
	}
	/* The hatch means exactly one thing, here as on the rail: you have never
	   been here. 45° and the rail's own stop pattern — a 0.3px solid core
	   ramping to nothing by 0.75px over a 3.9px period, ANTIALIASED rather than
	   a sub-pixel hard edge.

	   background-size is PINNED. With `auto` the gradient box is the element
	   box, so CSS centres the pattern on each segment individually — and these
	   segments are flex-grown to ten different widths, so every box would hash
	   at a different phase and the row read as ten unrelated scratch patches.
	   31.68px is the rail's tile: 7 periods along each axis, so the tiles abut
	   in phase and the texture is continuous across the whole bar. */
	.mini-seg.is-cold {
		background-color: var(--hatch-bed);
		background-image: repeating-linear-gradient(
			45deg,
			var(--hatch-ink) 0 0.3px,
			transparent 0.75px 3.9px
		);
		background-size: 31.68px 31.68px;
	}
	/* The ring means only "where you are now". A ring, never a fill —
	   recolouring the segment would conflate "here" with "read", which is the
	   one thing the rail is careful never to do. */
	.mini-seg.is-here {
		box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--gv-here) 55%, transparent);
		z-index: 1;
	}

	/* ═══ REDUCED MOTION ══════════════════════════════════════════════════════
	   The morph becomes an INSTANT state change, not a slow one — the failure
	   mode of a naive override is a 200ms gesture that becomes a 2s one.

	   `--morph-ms` is NOT redefined here — it is inline on the panel and would
	   outrank this. The script resolves it instead; see morphMs. What remains
	   for this block is the transitions written in absolute ms: hover feedback
	   and the heat tone. */
	@media (prefers-reduced-motion: reduce) {
		.nav-item,
		.nav-child-item,
		.head-toggle,
		.nav-caret,
		.mini-seg {
			transition-duration: 1ms;
		}
	}
</style>
