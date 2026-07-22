<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { base } from '$app/paths';
	import {
		CY,
		LANE_PART,
		TUNE,
		buildModel,
		clamp,
		challengeMark,
		clamp01,
		layoutMarks,
		longLabel,
		makeLayout,
		makeMapping,
		partLabel,
		pick,
		shortLabel,
		solveP,
		type MarkLayout,
		type Mapping,
		type PlacedItem,
		type TimelineModel,
		type Tune
	} from '$lib/timeline/mapping';
	import { DWELL, createDwellTracker, type DwellTracker } from '$lib/timeline/dwell';
	import { buildHeatLut, heatGradient, lutColour } from '$lib/timeline/heat';
	import { searchHits } from '$lib/timeline/search-hits.svelte';
	import { progress } from '$lib/data/progress';

	let {
		items,
		position = 0,
		readIds,
		doneIds,
		onNavigate
	}: {
		/** the manifest, with a measured document fraction on every entry */
		items: PlacedItem[];
		/** the reader's continuous scroll position, 0..1 */
		position?: number;
		readIds: Set<string>;
		doneIds: Set<string>;
		onNavigate?: (id: string) => void;
	} = $props();

	/* ---- the parts of the rail that are cheap enough to stay declarative ----
	   The 100-odd marks are built once and mutated imperatively (see mount()):
	   they move on every pointermove, and a keyed {#each} over them would put
	   Svelte's reconciler in the middle of a synchronous pointer path. The card
	   is different — it changes only when the CURSOR changes item, which is a
	   handful of times per sweep, so it stays ordinary markup and gets
	   {base}-correct image URLs and real escaping for free. */

	interface CardData {
		kind: 'part' | 'section' | 'playground' | 'challenge';
		kicker: string;
		title: string;
		/** thumbnail URL, or null for the drawn fallback banner */
		thumb: string | null;
		/** glyph for the fallback banner */
		glyph: string;
		chips: { text: string; tone: 'on' | 'gold' | 'plain' }[];
		hint: string | null;
	}

	let host: HTMLDivElement;
	let cardEl: HTMLDivElement | undefined = $state();
	let arrowEl: HTMLDivElement | undefined = $state();

	let open = $state(false);
	let card = $state<CardData | null>(null);
	let announce = $state('');
	let railId = $props.id();

	/* ---- imperative state (never reactive: it changes every frame) -------- */

	let model: TimelineModel | null = null;
	let marks: MarkLayout | null = null;
	let map: Mapping | null = null;

	let barNodes: HTMLElement[] = [];
	let headNodes: HTMLElement[] = [];
	let pgNodes: HTMLElement[] = [];
	let stemNodes: HTMLElement[] = [];
	let hitNodes: HTMLElement[] = [];

	/* ---- dwell heat --------------------------------------------------------
	   How long the reader actually spent at each place in the document, painted
	   as a cold->warm gradient inside each bar. The tracker owns the numbers and
	   the storage (see dwell.ts); the rail only ever paints what it publishes.

	   THE SEAM, and it is an absolute rule again: paint() never touches
	   `background-image`, the heat subscription never touches geometry. That
	   keeps a synchronous pointer path which already writes ~200 inline styles
	   from also rebuilding dozens of gradient strings a frame.

	   A previous pass relaxed it, on the theory that percentage stops fall out
	   of register with the document under the lens — the Gaussian is centred on
	   the cursor, so a magnified bar is stretched harder at the end facing the
	   centre than at the far end, while the gradient stretches uniformly. The
	   theory is right and the magnitude is not. Measured against the real
	   mapping across 201 lens positions x every bar x 16 buckets, the worst
	   intra-bar residual is 0.99px at A = 3.2 and 0.16px at rest — about one
	   device pixel, at the single worst bucket of the single worst bar. It is
	   not perceptible, and correcting it costs a per-frame string rebuild.

	   What IS perceptible is the correction in motion: lens-corrected stops
	   move every time the pointer does, so the gradient churns inside a bar
	   that is otherwise just growing. That shipped once and came back as "the
	   heat distribution dances around inside each of the boxes". See the header
	   of heat.ts, which owns this decision.

	   So the stops are percentages, the browser rescales them with the element
	   for free, and the heat is welded to its bar: verified in the browser by
	   magnifying a warm bar 1.21x and diffing the gradient string, which is
	   byte-identical before and after. Do not reintroduce lens correction here
	   without re-measuring that residual first. */
	let tracker: DwellTracker | null = null;
	let heatLut: string[] = [];
	/** Is the rail wide enough per bar for a gradient at all? See paintHeat. */
	let heatUsesGradient = false;

	/* ---- the challenge lane ------------------------------------------------
	   Challenges hang below the thread, mirroring the playground lane above it.
	   They come straight from the manifest — one row per `kind: 'challenge'`
	   anchor — so a course that has not grown challenges yet simply renders an
	   empty lane, and the day the anchors land in sections.ts the rhomboids
	   appear with no edit here. The membership is fixed for the session (a
	   remeasure moves offsets, never the id set), so deriving it once from the
	   mount-time items matches the build-once DOM below. */
	let chNodes: HTMLElement[] = [];
	let chStems: HTMLElement[] = [];
	/** document position per challenge, parallel to `chList` */
	let chUs: number[] = [];
	/** screen x per challenge, written by paint(), read by the hit test */
	let chX: number[] = [];
	/** half-width of the drawn rhomboid, for the label dodge */
	let chHalf: number[] = [];
	/** the anchor each challenge navigates to */
	let chJump: string[] = [];
	// Reading the prop once is deliberate: the id SET is fixed for the session
	// (remeasures move offsets, never membership), and the DOM below is
	// likewise built once from the mount-time model.
	// svelte-ignore state_referenced_locally
	const chList = items.filter((it) => it.kind === 'challenge');
	/** completion, read straight from the progress store — see onMount */
	let chDone: boolean[] = chList.map(() => false);
	/**
	 * Engagement short of completion. With only "solved" and "everything else"
	 * a challenge draws identically however much work the reader has put in;
	 * playgrounds carry three states, so challenges carry the same three, from
	 * the same record. Read from `progress.attempts` directly rather than
	 * threading an `attemptedIds` prop through the header for one consumer.
	 */
	let chTried: boolean[] = chList.map(() => false);

	/* Lane geometry. The challenge lane is a MIRROR of the playground lane
	   about the thread's centre line, and both are driven by the same
	   `laneMark(k)` — see mapping.ts. Giving the lower lane its own constants
	   instead produces two quiet defects at once: the gap below the thread
	   ends up larger and differently-behaved than the gap above it, and a
	   rhomboid pinned to a fixed centre swells in place under the lens while
	   its neighbour above lifts.

	   Both are prevented by one rule: the diamond's top VERTEX sits at
	   `2 * CY - base`, exactly as far below the thread as the square's top edge
	   sits above it, and the stem is the same `stemH` either way. Keeping a
	   magnified rhomboid on the 48px rail is then a consequence rather than a
	   clamp: at full magnification the mirror puts the top vertex at 34 and
	   the half-diagonal at 5.5, so the lowest vertex lands on 45 — three
	   pixels clear of the rail's edge.

	   SIZE. `laneMark` hands back the square's EDGE, and a square rotated 45°
	   measures edge * √2 across — so feeding the same number to both lanes
	   would make the diamond 41% wider than its neighbour AND break the mirror
	   (at k = 1 it would reach y 49.6, off a 48px rail). CH_RATIO is therefore
	   the diamond's edge as a fraction of the square's; CH_MIN floors it where
	   the ratio alone would leave an edge that cannot survive its own outline.
	   All of it lives in `challengeMark` next to `laneMark` rather than here,
	   so the mirror is one function of `k` that a test can hold against the
	   lane it reflects. See mapping.test.ts. */
	/** how close (px) the pointer must be to a rhomboid to grab it */
	const CH_GRAB = 20;

	/**
	 * Give every challenge a document position and a navigation target.
	 *
	 * A challenge is an ordinary manifest anchor — `ChallengeActivity` renders
	 * its own id on its root element and `build-timeline.mjs` harvests it — so
	 * the honest source for both numbers is the model, exactly as it is for
	 * parts, sections and playgrounds. The rhomboid sits on the challenge's
	 * REAL measured offset, and a click lands on the card itself.
	 *
	 * The park-at-the-end fallback covers the one desynchronisation the type
	 * system cannot: an id in `chList` that a remeasure failed to find. Parked
	 * at 1 rather than 0, because a stack of phantom marks on the LEFT edge is
	 * the failure mode the search hits already had to be taught to avoid.
	 *
	 * Re-run from `rebuild`, because a re-measure moves every offset and a
	 * challenge pinned to a stale one would drift off its chapter.
	 */
	function resolveChallenges(): void {
		if (!model) return;
		chUs = [];
		chJump = [];
		for (const c of chList) {
			const anchor = model.flow.find((f) => f.item.id === c.id);
			chUs.push(anchor ? clamp01(anchor.item.f) : 1);
			chJump.push(c.id);
		}
		chX = chUs.map(() => 0);
		chHalf = chUs.map(() => 0);
	}

	/** document positions of the current search hits — at most HIT_MAX of them */
	let hitUs: number[] = [];
	let glowNode: HTMLElement | null = null;
	let posNode: HTMLElement | null = null;

	let W = 0;
	let pShown = 0; // the ONE number the whole layout is a function of
	// Magnification is animated too, so the rail rests subtle and blooms on
	// approach. It rides the same tween clock as `pShown`, so the swell and
	// the glide land together instead of racing.
	let aShown = TUNE.aRest;
	// `makeMapping` and the layout/pick helpers all take a Tune. Handing them a
	// fresh object per frame (rather than mutating TUNE) keeps TUNE the honest
	// record of the approved defaults, and keeps the pure module reentrant.
	const live = (): Tune => ({ ...TUNE, A: aShown });
	const targetA = () => (hovering || mode === 'key' ? TUNE.A : TUNE.aRest);
	// `solveP` inverts the mapping to find the cursor position that puts a given
	// document position under the cursor — and that inverse depends on A. The
	// resting anchor must therefore be solved against the RESTING magnification,
	// or the idle lens sits slightly off the reader's actual position.
	const restTune: Tune = { ...TUNE, A: TUNE.aRest };
	let pRest = 0; // resting anchor: the reader's real position
	let pKey = 0; // keyboard anchor
	let mode: 'rest' | 'pointer' | 'key' = 'rest';
	let pointerFrac = 0;
	// The pointer's last x in RAIL PIXELS, kept alongside the fraction. The rail
	// is now responsive, so a resize can arrive while the hand is holding still:
	// the fraction is then stale (the same hand is a different fraction of a
	// narrower rail) and the lens would slide out from under the cursor. The
	// pixel is the thing that did not change, so the resize re-derives the
	// fraction from it. See the ResizeObserver in onMount.
	let pointerX = 0;
	let pointerY = CY;
	let raf = 0;
	let hovering = false;
	let cursorId: string | null = null;
	let pendingRelayout = false;
	let reduce = false;

	/* ---- the rail's own rect, cached --------------------------------------
	   `getBoundingClientRect()` on the host was being read on EVERY
	   pointermove. The rail writes ~200 inline styles per move, so that read
	   lands with the whole subtree dirty and forces a synchronous layout: it
	   measured at ~1.27ms of the ~1.55ms handler — 82% of the cost of moving
	   the mouse one pixel.

	   The rect is only invalidated by things that MOVE OR RESIZE the rail, and
	   the pointer is not one of them. So read it lazily and mark it stale from
	   the three events that can change it: the host's own ResizeObserver, a
	   window resize, and a scroll (the header is sticky, but a sticky element
	   still changes viewport-relative top when it un-sticks at the top of the
	   page). Everything reads `W`, `rectL` and `rectT` through `freshRect()`.

	   Correctness note: `left`/`top` are the only fields used, and both are
	   viewport-relative, so no scroll offset is baked into the cache. */
	let rectL = 0;
	let rectT = 0;
	let rectStale = true;

	function freshRect(force = false) {
		if (!rectStale && !force) return;
		const r = host.getBoundingClientRect();
		rectL = r.left;
		rectT = r.top;
		W = r.width || 600;
		rectStale = false;
	}

	/* ---- the glide --------------------------------------------------------
	   NOT a fixed-duration ease-in-out, and the reason is the failure a fixed
	   tween guarantees: for its whole duration the pointer is IGNORED (a
	   `!tweening` guard gates the 1:1 write), and ease-in-out deliberately
	   spends its first frames nearly still — so entering the rail and sweeping
	   immediately leaves the lens visibly trailing the hand.

	   Deleting the glide is not the fix — it exists because the lens has to
	   travel from wherever it was resting to the cursor, and snapping that
	   distance is the jump the whole design fought to remove. Two changes
	   instead:

	     1. The duration is PROPORTIONAL TO THE DISTANCE it has to cover.
	        Entering next to the resting lens is instant (below `SNAP_MS` it
	        does not animate at all); entering from the far end still glides.
	     2. It is a critically damped SPRING rather than a fixed-duration ease,
	        so it is always converging on the LIVE pointer instead of counting
	        down a clock. A spring has no notion of "not finished yet", so
	        there is no window in which the pointer is ignored — and because it
	        is critically damped it cannot overshoot, which is what would turn
	        a fast entry into a wobble.

	   The integrator is the closed-form solution of the critically damped
	   oscillator over one step, NOT Euler. Euler on a stiff spring (short
	   distance -> large omega) goes unstable exactly in the case that matters
	   most here — a near-instant entry — whereas the analytic step is stable
	   for any omega and any dt. */
	let springing = false;
	/** displacement velocities, per ms */
	let vP = 0;
	let vA = 0;
	/** angular frequency, rad/ms */
	let omega = 0;
	let lastT = 0;

	/** (1+wt)e^-wt falls under 1% at wt ~ 6.6, so that is the "duration". */
	const OMEGA_FOR = (ms: number) => 6.6 / ms;
	/** below this the glide is imperceptible and we simply land */
	const SNAP_MS = 24;
	/** converged: closer than a fifth of a pixel on a 1400px rail */
	const SNAP_P = 0.00014;
	const SNAP_A = 0.002;

	function targetP(): number {
		if (mode === 'pointer') return clamp01(pointerFrac);
		if (mode === 'key') return pKey;
		return pRest;
	}

	/**
	 * Duration for a glide that has to cover `dist` (a fraction of the rail).
	 *
	 * Linear in distance up to `full`, then capped: a sweep across the whole
	 * rail should not take proportionally longer than a sweep across a third of
	 * it, it should just take the maximum. Below SNAP_MS this returns something
	 * the caller turns into an immediate landing.
	 */
	function glideMs(dist: number, maxMs: number): number {
		const full = 0.35;
		return maxMs * Math.min(1, Math.abs(dist) / full);
	}

	function startTween(ms: number) {
		const T = targetP();
		if (reduce || ms <= SNAP_MS) {
			springing = false;
			vP = 0;
			vA = 0;
			pShown = T;
			aShown = targetA();
			draw();
			return;
		}
		omega = OMEGA_FOR(ms);
		lastT = performance.now();
		springing = true;
		if (!raf) raf = requestAnimationFrame(frame);
	}

	/** Start the glide the POINTER wants: as long as the distance justifies. */
	function startPointerGlide() {
		startTween(glideMs(targetP() - pShown, TUNE.enterMs));
	}

	/**
	 * Advance the spring to `now`.
	 *
	 * Called from rAF and ALSO from pointermove: pointer events can arrive at
	 * 120Hz+ while rAF is capped at the display's refresh, and integrating on
	 * the event means the lens reflects the newest sample rather than the one
	 * the last frame happened to catch. `lastT` makes that idempotent — the
	 * step is a function of elapsed time, so it does not matter who calls it.
	 *
	 * Returns true once it has landed.
	 */
	function advance(now: number): boolean {
		const dt = Math.min(now - lastT, 48); // a backgrounded tab must not explode
		lastT = now;
		if (dt <= 0) return false;

		const T = targetP();
		const TA = targetA();
		const e = Math.exp(-omega * dt);

		// critically damped, exact over the step, with T held constant for it
		let d = pShown - T;
		let c = vP + omega * d;
		pShown = T + (d + c * dt) * e;
		vP = (vP - omega * c * dt) * e;

		d = aShown - TA;
		c = vA + omega * d;
		aShown = TA + (d + c * dt) * e;
		vA = (vA - omega * c * dt) * e;

		if (Math.abs(pShown - T) < SNAP_P && Math.abs(aShown - TA) < SNAP_A) {
			pShown = T;
			aShown = TA;
			vP = 0;
			vA = 0;
			return true;
		}
		return false;
	}

	// The distortion is a pure function of `p`, so gliding `p` glides the whole
	// rail coherently. The target is re-read every step, so an entry glide
	// chases a moving cursor and lands on it rather than on where it was when
	// the pointer arrived.
	function frame(now: number) {
		if (!springing) {
			raf = 0;
			return;
		}
		const landed = advance(now);
		draw();
		if (landed) {
			springing = false;
			// Re-pick on landing. During the glide the hit test ran against the
			// spring's mapping, so the item under the pointer was whatever the
			// half-formed lens said it was. If the hand then stops moving, no
			// further pointermove arrives to correct it and the card names the
			// wrong section — pointing at one bar while naming another.
			if (mode === 'pointer' && hovering && model) {
				map = makeMapping(pShown, live());
				freshRect();
				applyCursor(pickAt(pointerFrac * W, pointerY), false);
			}
			draw();
			raf = 0;
			return;
		}
		raf = requestAnimationFrame(frame);
	}

	/* ---- painting -------------------------------------------------------- */

	function draw() {
		map = makeMapping(pShown, live());
		paint();
	}

	function paint() {
		if (!model || !marks || !map || !glowNode || !posNode) return;
		layoutMarks(model, map, W, position, marks, live());

		glowNode.style.width = marks.glowW + 'px';
		glowNode.style.transform = `translateX(${marks.glowX}px)`;
		posNode.style.transform = `translateX(${marks.headX}px)`;

		for (let i = 0; i < marks.bars.length; i++) {
			const m = marks.bars[i];
			const n = barNodes[i];
			n.style.left = m.x + 'px';
			n.style.width = m.w + 'px';
			n.style.height = m.h + 'px';
			n.style.top = m.top + 'px';
			// NOTHING here writes `background-position`, and that is load-bearing.
			//
			// This used to pin the hatch's pattern origin to the RAIL — writing
			// `background-position: -x, -top` per bar — so a stripe leaving one bar
			// re-entered the next in phase. It bought a continuous hatch across the
			// thread and paid for it with motion: the fisheye rewrites `x` and `w`
			// on every pointer move, so a rail-anchored pattern makes each bar a
			// moving window onto it and the stripes CRAWL inside their own box.
			// Measured, a cold bar's stripe phase swept 95% of a full 4.53px period
			// as the cursor crossed the rail.
			//
			// Worse, the write was guarded on `barCold` but never cleared when a bar
			// went cold -> warm, so a warm bar kept a frozen `-127px` offset applied
			// to its heat gradient. `background-size` computes to `auto` (the bar's
			// own width) with `repeat`, so the gradient was displaced AND tiled, and
			// the visible offset `mod(-127, w)` changed every frame with `w`. That is
			// the "heat distribution dances around inside the boxes" report: the
			// gradient string was stable all along, a stale offset on it was not.
			//
			// With no `background-position` at all the pattern anchors to the element
			// and its phase relative to the bar is identically zero at every width.
			// The cost is a phase break at bar boundaries, across a gap, while
			// static — and a static misalignment beats motion every time.
			n.classList.toggle('is-tiny', m.tiny);
			n.classList.toggle('is-active', m.active);
			const head = headNodes[i];
			if (m.active) {
				head.style.display = '';
				head.style.width = m.headW + 'px';
			} else {
				head.style.display = 'none';
			}
		}

		// The challenge lane. Nothing dodges it any more — the label strip that
		// used to share this band is gone, so the rhomboids own the bottom third
		// of the rail outright and can be drawn at a size that reads.
		for (let i = 0; i < chUs.length; i++) {
			const x = map.toScreen(chUs[i]) * W;
			// The mirror of the playground lane, from the same magnification and
			// the same `laneMark` underneath — see `challengeMark`. Nothing here
			// is a second set of tuning.
			const k = map.mag(x / W);
			const c = challengeMark(k, live());
			const n = chNodes[i];
			chX[i] = x;
			chHalf[i] = c.half;
			n.style.left = x - c.edge / 2 + 'px';
			n.style.width = c.edge + 'px';
			n.style.height = c.edge + 'px';
			n.style.top = c.top + 'px';
			// Identical stem length to the playground at this magnification, and
			// pushed up by the overhang between the element box and the vertex
			// so it stops ON the vertex rather than inside the diamond's corner.
			chStems[i].style.height = c.stemH + 'px';
			chStems[i].style.marginBottom = c.top - c.vertex + 'px';
		}

		for (let i = 0; i < marks.pgs.length; i++) {
			const g = marks.pgs[i];
			const n = pgNodes[i];
			n.style.left = g.x + 'px';
			n.style.width = g.size + 'px';
			n.style.height = g.size + 'px';
			n.style.top = g.top + 'px';
			stemNodes[i].style.height = g.stemH + 'px';
		}

		// Search hits ride the same mapping as everything else, so a point stays
		// glued to its anchor through the lens, a tween and a resize. Only the
		// visible ones are touched here; `display` is owned by the effect below.
		for (let i = 0; i < hitUs.length; i++) {
			hitNodes[i].style.transform = `translateX(${map.toScreen(hitUs[i]) * W}px)`;
		}

		// NOTHING here touches `background-image`. The heat gradients are
		// percentages of their own bar, so the browser rescales them with the
		// widths written above and they stay welded to their content for free.
		// See THE SEAM.

		if (cursorId) placeCard(cursorId);
	}

	/* ---- heat painting ----------------------------------------------------
	   Called only from the tracker's ~1Hz publish, and only for the bars whose
	   quantised heat actually moved. */

	function isDarkTheme(): boolean {
		const c = document.documentElement.classList;
		if (c.contains('dark')) return true;
		if (c.contains('light')) return false;
		return matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function rebuildLut() {
		// `chromaGamma` ships at 1: the heat->colour axis is deliberately linear
		// now, and the concavity that makes the first seconds of a read visible
		// lives on the time->heat axis instead, as `DWELL.heatGamma`. See the
		// header of dwell.ts for why it moved.
		heatLut = buildHeatLut(isDarkTheme() ? 'dark' : 'light', DWELL.chromaGamma);
	}

	function paintHeat(ids: string[]) {
		if (!model || !tracker || !heatLut.length) return;
		// The choice between a gradient and a flat mean is made against the
		// UNMAGNIFIED bar width. Keying it to the live width would flip bars
		// between the two every frame as the lens passed over them.
		//
		// It ALSO requires more than one bin. With bucketsPerBar = 1 there is no
		// gradient to draw, and `heatGradient` correctly returns a bare colour —
		// but a bare colour assigned to `background-image` is invalid CSS, so the
		// bar silently painted nothing and every visited section went invisible.
		// A flat fill belongs in `background-color`, which is the branch below.
		heatUsesGradient =
			DWELL.bucketsPerBar > 1 && W / Math.max(1, model.bars.length) >= DWELL.gradientMinPx;
		for (const id of ids) {
			const i = model.bars.findIndex((b) => b.item.id === id);
			if (i < 0 || !barNodes[i]) continue;
			const h = tracker.heatOf(id);
			if (!h) continue;
			let mean = 0;
			for (let k = 0; k < h.length; k++) mean += h[k];
			mean /= h.length;

			// The hatch's job narrows to one thing once there is heat: marking
			// genuinely-never-visited. Above the threshold the colour says it
			// better, and dropping the hatch from most of the rail is most of the
			// "rugged" complaint answered.
			const cold = mean < DWELL.coldBelow;
			const n = barNodes[i];
			n.classList.toggle('is-cold', cold);
			if (cold) {
				n.style.backgroundImage = '';
				n.style.backgroundColor = '';
			} else if (heatUsesGradient) {
				// The BASELINE string: even stops. If this bar happens to be under
				// the lens right now, the next paint() re-stops it — which is one
				// frame away, and this path only runs at ~1Hz.
				n.style.backgroundImage = heatGradient(h, heatLut);
				n.style.backgroundColor = 'transparent';
			} else {
				n.style.backgroundImage = 'none';
				n.style.backgroundColor = lutColour(heatLut, mean);
			}
		}
	}

	/**
	 * Re-resolve the published result set against the CURRENT model.
	 *
	 * Called from the effect below (the ids changed) and from `rebuild` (the
	 * ids did not change but every document position under them just did, so a
	 * result set that survives a re-measure would otherwise point at where its
	 * sections used to be).
	 */
	function resolveHits(): void {
		if (!model || !hitNodes.length) return;
		hitUs = [];
		for (const id of searchHits.ids) {
			if (hitUs.length >= HIT_MAX) break;
			const u = hitDocOf(id);
			if (u !== null) hitUs.push(u);
		}
		for (let i = 0; i < hitNodes.length; i++) {
			hitNodes[i].style.display = i < hitUs.length ? '' : 'none';
		}
	}

	/**
	 * Resolve a search result's anchor id to a document position.
	 *
	 * `SearchEntry.sectionId` is a DOM anchor id and so is every rail mark, but
	 * the index points at all three kinds: sections (`section-4-4`), playgrounds
	 * (`capstone`) and one part (`hero`). Bars come first because that is what
	 * most hits are, and a bar's centre is where its point belongs. Anything the
	 * model does not know about returns null and is dropped rather than drawn at
	 * zero, which would stack phantom points on the left edge of the rail.
	 */
	function hitDocOf(id: string): number | null {
		if (!model) return null;
		const b = model.bars.find((x) => x.item.id === id);
		if (b) return (b.s + b.e) / 2;
		const f = model.pgs.find((x) => x.item.id === id);
		if (f) return f.item.f;
		const p = model.parts.find((x) => x.item.id === id);
		if (p) return clamp01((p.start + p.end) / 2);
		return null;
	}

	/**
	 * What is the pointer asking about?
	 *
	 * `pick` in mapping.ts knows the three manifest lanes; the challenge lane is
	 * derived here, so it is resolved here too. Challenges are the only thing
	 * DRAWN in the band below LANE_PART, so they are tested first within it and
	 * fall through to the chapter underneath — the same precedence playgrounds
	 * get over the thread in their own lane, and for the same reason: the small
	 * mark needs the generous grab radius or it is unhittable at 5px. The
	 * fall-through is what keeps part identity reachable now that the part ticks
	 * are gone: anywhere in that band that is not within CH_GRAB of a rhomboid
	 * still answers `part:<n>` and still opens the chapter card.
	 */
	function pickAt(x: number, y: number): string {
		if (!model || !map) return '';
		if (y >= LANE_PART) {
			let bd = Infinity;
			let bi = -1;
			for (let i = 0; i < chX.length; i++) {
				const d = Math.abs(chX[i] - x);
				if (d < bd) {
					bd = d;
					bi = i;
				}
			}
			if (bi >= 0 && bd <= CH_GRAB) return 'ch:' + bi;
		}
		return pick(model, map, W, x, y, live());
	}

	/** Index into `chList`, or -1. */
	const chIndex = (id: string | null): number =>
		id && id.startsWith('ch:') ? Number(id.slice(3)) : -1;

	/**
	 * Document centre of whatever the cursor is on.
	 *
	 * `model.docCentreOf` only knows manifest ids, and returns 0 for anything
	 * else — so handing it a `ch:` id parked the lens at the very start of the
	 * course. Challenges answer from `chUs`, which is where they actually are.
	 */
	function cursorDocCentre(): number {
		const ci = chIndex(cursorId);
		if (ci >= 0) return chUs[ci] ?? 0;
		return model ? model.docCentreOf(cursorId!) : 0;
	}

	function layout() {
		if (!model || !host) return;
		rectStale = true;
		freshRect();
		pRest = solveP(clamp01(position), restTune);
		// Keep the keyboard anchor meaningful before any key has been pressed,
		// and re-solve it on resize so it stays on its item.
		pKey = cursorId ? solveP(cursorDocCentre(), TUNE) : pRest;
		// Preserve the prototype's guard exactly: a relayout must never yank the
		// lens away from the pointer or interrupt a tween.
		if (mode !== 'pointer' && !springing) pShown = targetP();
		draw();
	}

	/* ---- card ------------------------------------------------------------ */

	function cardFor(id: string): CardData | null {
		if (!model) return null;
		const ci = chIndex(id);
		if (ci >= 0) {
			const c = chList[ci];
			return {
				kind: 'challenge',
				kicker: 'challenge',
				title: c.title,
				// Same rule as playgrounds: no banner. A challenge has no art of
				// its own and inheriting its part's would show the same picture
				// the neighbouring bars already show.
				thumb: null,
				glyph: '',
				chips: chDone[ci] ? [{ text: 'Solved', tone: 'gold' as const }] : [],
				hint: 'Enter to open this challenge'
			};
		}
		if (id.startsWith('part:')) {
			const p = model.parts[Number(id.slice(5))];
			const secs = p.kids.filter((f) => f.item.kind === 'section');
			const play = p.kids.filter((f) => f.item.kind === 'playground');
			const readCount = secs.filter((f) => readIds.has(f.item.id)).length;
			return {
				kind: 'part',
				kicker: 'chapter',
				title: `${partLabel(p.item)}${p.item.id === 'hero' ? '' : ' · ' + p.item.title}`,
				thumb: thumbFor(p.item.id),
				glyph: partLabel(p.item),
				chips: [
					{
						text: `${readCount}/${secs.length} read`,
						tone: secs.length && readCount === secs.length ? 'on' : 'plain'
					},
					...(play.length
						? [
								{
									text: `${play.filter((f) => doneIds.has(f.item.id)).length}/${play.length} solved`,
									tone: 'gold' as const
								}
							]
						: [])
				],
				hint: null
			};
		}
		const pg = model.pgs.find((f) => f.item.id === id);
		if (pg) {
			const done = doneIds.has(id);
			return {
				kind: 'playground',
				kicker: 'playground',
				title: pg.item.title,
				// The manifest DOES resolve a banner for every playground (it borrows
				// its containing section's), but this card deliberately does not draw
				// one. A playground sits inside its section's span, so its inherited
				// banner is byte-identical to the bar immediately beneath it: sweeping
				// section -> playground would show the same picture twice in a row,
				// which reads as a stuck render. The compact accent card is the
				// contrast that makes a playground legible as a different KIND of stop.
				thumb: null,
				glyph: '',
				// Only the earned state gets a chip. "Not attempted" is the default
				// for most of the course, so printing it on almost every card said
				// nothing and made the card look like a scorecard.
				chips: done ? [{ text: 'Completed', tone: 'gold' as const }] : [],
				hint: 'Enter to open this playground'
			};
		}
		const bar = model.bars.find((b) => b.item.id === id);
		if (!bar) return null;
		const here = position >= bar.s && position < bar.e;
		const partIdx = model.partOf.get(id) ?? 0;
		return {
			kind: 'section',
			kicker: partLabel(model.parts[partIdx].item),
			title: longLabel(bar.item),
			thumb: thumbFor(id),
			glyph: shortLabel(bar.item),
			// Same rule as playgrounds: a chip is a positive fact or it is absent.
			// An unread section's card is the banner, the chapter and the title —
			// which is exactly what "not yet read" looked like anyway.
			chips: here
				? [{ text: 'You are here', tone: 'on' as const }]
				: readIds.has(id)
					? [{ text: 'Read', tone: 'on' as const }]
					: [],
			hint: null
		};
	}

	// anchor id -> id of the anchor whose thumbnail file it draws. Most anchors
	// borrow (a part shows its first section's art), so this is many-to-one and
	// several rail positions legitimately resolve to the same URL.
	// Not reactive and never mutated after mount — a plain Map is correct here.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- static lookup table
	const thumbOf = new Map<string, string>();
	function thumbFor(id: string): string | null {
		const owner = thumbOf.get(id);
		return owner ? `${base}/images/thumbs/${owner}.webp` : null;
	}

	/**
	 * Warm the thumbnails on either side of the cursor.
	 *
	 * Sweeping is the whole interaction here, so the next few items are almost
	 * certainly about to be asked for: decoding them now turns the first-hover
	 * flash into a cache hit. Bounded to a short window either side, so a full
	 * sweep warms the rail incrementally rather than pulling all ~900KB at once.
	 *
	 * Two things this used to get wrong:
	 *
	 *   1. It keyed off `model.indexOfId`, which is built from `flow` — and flow
	 *      EXCLUDES parts. Every part cursor id is `part:<n>`, so the lookup
	 *      missed and the function returned having warmed nothing. Warming died
	 *      exactly when the cursor crossed a chapter boundary, which is where a
	 *      sweep spends a good fraction of its time. Parts now resolve to their
	 *      first child before the lookup.
	 *   2. `new Image().src = url` starts the FETCH but the bitmap is still
	 *      undecoded when the card swaps to it, so a cold hover could still miss
	 *      a frame. `.decode()` finishes the job off the main thread; the
	 *      pre-decoded frame is what makes the swap land in one paint.
	 */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- static lookup table
	const warmed = new Set<string>();
	function warmNeighbours(id: string | null) {
		if (!id || !model) return;
		const nav = model.navList;
		// A part is not in `flow`; warm around its first child instead.
		const anchorId = id.startsWith('part:')
			? (model.parts[Number(id.slice(5))]?.kids[0]?.item.id ?? null)
			: id;
		if (!anchorId) return;
		const i = model.indexOfId.get(anchorId);
		if (i === undefined) return;

		// Forward window of 6, not 4. A fast sweep can retire several anchors
		// between two warms, and once the cursor outruns the window the card is
		// asking for a file the warmer has not reached yet — measured as a
		// blank frame at a couple of section boundaries. Six buys enough slack to stay
		// ahead of a flick, and the anchors are ~15 KB apiece so the extra reach
		// costs about 30 KB of headroom.
		const want: string[] = [];
		for (let k = Math.max(0, i - 2); k <= Math.min(nav.length - 1, i + 6); k++) {
			want.push(nav[k].id);
		}
		// Neighbouring PARTS as well, not just neighbouring sections. In the part
		// lane a single pointer step crosses a whole chapter, so the next card can
		// be a dozen nav entries away — outside the -2/+4 window, which is why a
		// part-to-part sweep still flashed one empty banner. The parts on either
		// side are at most four more 15 KB files and they are precisely the ones a
		// sweep along that lane asks for next.
		const pi = model.partOf.get(anchorId);
		if (pi !== undefined) {
			for (let k = Math.max(0, pi - 1); k <= Math.min(model.parts.length - 1, pi + 2); k++) {
				want.push(model.parts[k].item.id);
			}
		}

		for (const id2 of want) warmOne(thumbFor(id2));
	}

	/** Fetch AND decode one thumbnail, at most once per URL. */
	function warmOne(url: string | null): boolean {
		// Dedupe on the URL, not the anchor id: ~half the anchors borrow, so
		// id-keyed dedupe re-requests the same file under a different name.
		if (!url || warmed.has(url)) return false;
		warmed.add(url);
		const img = new Image();
		img.src = url;
		// Decoding is the part that would otherwise stall the swap. Failures
		// are uninteresting — the <img> will retry and fall back to the plate.
		void img.decode?.().catch(() => {});
		return true;
	}

	/** Screen x of whatever the cursor id refers to. */
	function anchorOf(id: string): number {
		if (!model || !map) return 0;
		const ci = chIndex(id);
		if (ci >= 0) return chX[ci] ?? 0;
		if (id.startsWith('part:')) {
			const p = model.parts[Number(id.slice(5))];
			return map.toScreen(clamp01((p.start + p.end) / 2)) * W;
		}
		const b = model.bars.find((x) => x.item.id === id);
		if (b) return ((map.toScreen(b.s) + map.toScreen(b.e)) / 2) * W;
		const f = model.pgs.find((x) => x.item.id === id);
		if (f) return map.toScreen(f.item.f) * W;
		return pShown * W;
	}

	function placeCard(id: string) {
		if (!cardEl || !arrowEl || !card) return;
		// The bannerless cards are the narrow ones.
		const cw = card.kind === 'playground' || card.kind === 'challenge' ? 212 : 236;
		const ax = anchorOf(id);
		const left = clamp(ax - cw / 2, 0, Math.max(0, W - cw));
		cardEl.style.left = left + 'px';
		arrowEl.style.left = clamp(ax - left, 14, cw - 14) + 'px';
	}

	/* ---- cursor ---------------------------------------------------------- */

	function nodeFor(id: string | null): HTMLElement | null {
		if (!model || !id || id.startsWith('part:')) return null;
		const ci = chIndex(id);
		if (ci >= 0) return chNodes[ci] ?? null;
		const bi = model.bars.findIndex((b) => b.item.id === id);
		if (bi >= 0) return barNodes[bi];
		const pi = model.pgs.findIndex((f) => f.item.id === id);
		return pi >= 0 ? pgNodes[pi] : null;
	}

	function applyCursor(id: string | null, speak: boolean) {
		if (!model) return;
		const oldNode = nodeFor(cursorId);
		if (oldNode) {
			oldNode.classList.remove('is-cursor');
			oldNode.setAttribute('aria-selected', 'false');
		}
		cursorId = id;
		warmNeighbours(id);
		const node = nodeFor(id);
		if (node) {
			node.classList.add('is-cursor');
			node.setAttribute('aria-selected', 'true');
			host.setAttribute('aria-activedescendant', node.id);
		} else {
			host.removeAttribute('aria-activedescendant');
		}

		card = id ? cardFor(id) : null;
		if (id) placeCard(id);

		const sci = chIndex(id);
		if (speak && sci >= 0) {
			announce =
				`Challenge: ${chList[sci].title} — ${partLabel(model.parts[model.partOf.get(chJump[sci]) ?? 0]?.item)} — ` +
				(chDone[sci] ? 'solved' : 'not attempted');
		} else if (speak && id && !id.startsWith('part:')) {
			const it = [...model.bars.map((b) => b.item), ...model.pgs.map((f) => f.item)].find(
				(x) => x.id === id
			);
			if (it) {
				announce =
					`${longLabel(it)} — ${partLabel(model.parts[model.partOf.get(it.id) ?? 0].item)} — ` +
					(it.kind === 'playground'
						? doneIds.has(it.id)
							? 'completed'
							: 'not attempted'
						: readIds.has(it.id)
							? 'read'
							: 'not read');
			}
		}
	}

	function jump(id: string) {
		/* Navigate, and NOTHING ELSE. The card and the lens belong to the hover,
		   not to the click.

		   An earlier version dismissed the card and forced the lens back to rest
		   here. It was meant to fix a "stuck card" report, but it fixed the wrong
		   thing and created a worse feel: the banner vanished the instant you
		   clicked, and the forced rest-tween raced the reading head as the page
		   scrolled — the head appeared to sweep forward and flood the bars behind
		   it green, as if you had read a chapter you had only jumped to.

		   The lifecycle is simpler than that. A click is a click: it scrolls the
		   page (below). The card stays because the pointer is still on the mark —
		   and the moment the hand leaves the rail, `onPointerLeave` dismisses it
		   and glides the lens home, which is the one place that cleanup belongs.
		   The reading head just follows `position` as the page scrolls, one
		   motion instead of two. */
		const ci = chIndex(id);
		// The rail's cursor id for a challenge is the synthetic `ch:<n>`, which
		// is not an anchor. `chJump` holds the real destination — the card's own
		// id now that it has one, the chapter header if it does not. See
		// `resolveChallenges`.
		onNavigate?.(ci >= 0 ? chJump[ci] : id);
	}

	/* ---- pointer ----------------------------------------------------------
	   While the pointer is over the rail `p` IS the pointer: no smoothing, no
	   stepping, no hysteresis, no rAF in the path. pointermove writes p and
	   draws synchronously, so the rail is 1:1 with the hand.

	   The one exception is the entry glide, and even then the pointer is never
	   ignored: the spring is advanced HERE, on the event, against the newest
	   sample, so the lens converges on the live cursor instead of on a target
	   captured when the hand arrived. */

	function onPointerMove(e: PointerEvent) {
		if (e.pointerType === 'touch' || !model) return;
		freshRect();
		const x = e.clientX - rectL;
		const y = e.clientY - rectT;
		pointerX = x;
		pointerFrac = clamp01(x / W);
		pointerY = y;
		if (!hovering) {
			hovering = true;
			open = true;
			mode = 'pointer';
			// AFTER pointerFrac is set, so the glide is sized against where the
			// hand actually is. The old code started a fixed 180ms tween before
			// it knew the distance.
			startPointerGlide();
		}
		// Build the mapping BEFORE picking, so the hit test and the label under
		// the cursor describe this frame rather than the previous one — and
		// exactly once per move, since paint() reuses it.
		if (springing) advance(performance.now());
		else pShown = pointerFrac;
		map = makeMapping(pShown, live());
		applyCursor(pickAt(x, y), false);
		// Paint even mid-glide: the spring owns pShown and `map`, but the cursor
		// just changed and the label under it must not wait for the next frame.
		paint();
	}

	function onPointerEnter(e: PointerEvent) {
		if (e.pointerType === 'touch' || !model) return;
		hovering = true;
		open = true;
		// FORCE the read here, stale flag or not. The three invalidators below
		// (host resize, window scroll, window resize) cover everything that
		// moves the rail in this app, but they cannot cover everything that
		// moves it in principle — a banner inserted above the sticky header
		// would shift it without changing its size or scrolling the window, and
		// every hit test would then be off by that shift until something else
		// happened to invalidate. A pointerenter is once per hover, so paying
		// for one guaranteed-correct read here closes that gap for free: the
		// only window left is the rail moving DURING a single hover, which
		// cannot happen without the pointer leaving it.
		freshRect(true);
		pointerX = e.clientX - rectL;
		pointerFrac = clamp01(pointerX / W);
		pointerY = e.clientY - rectT;
		mode = 'pointer';
		startPointerGlide();
		applyCursor(pickAt(pointerX, pointerY), false);
	}

	function onPointerLeave() {
		hovering = false;
		// `:focus-visible`, NOT `document.activeElement === host`. A CLICK on the
		// rail focuses it too — so with the old test, moving the pointer off after
		// a click took this keyboard branch, which early-returns before `open =
		// false` (the card lingered) and threw the lens into key mode at the wrong
		// place (the "focus jumps to the beginning" report). focus-visible is the
		// browser's own keyboard-vs-pointer signal: false after a mouse click,
		// true only when the rail is genuinely being driven by the keyboard, which
		// is exactly when the lens should stay put.
		if (host.matches(':focus-visible')) {
			// Keyboard still owns the rail: hand the lens back to the keyboard
			// cursor, or home if no item has been selected yet.
			mode = 'key';
			pKey = cursorId && model ? solveP(cursorDocCentre(), TUNE) : pRest;
			startTween(TUNE.leaveMs);
			return;
		}
		open = false;
		applyCursor(null, false);
		mode = 'rest';
		startTween(TUNE.leaveMs);
		// A remeasure that arrived mid-hover was deferred so the marks would not
		// slide out from under the pointer. Apply it now.
		if (pendingRelayout) {
			pendingRelayout = false;
			rebuild();
		}
	}

	function onClick(e: MouseEvent) {
		if (!model) return;
		freshRect();
		const id = pickAt(e.clientX - rectL, e.clientY - rectT);
		if (!id) return;
		jump(id.startsWith('part:') ? model.parts[Number(id.slice(5))].item.id : id);
	}

	/* ---- keyboard --------------------------------------------------------- */

	function gotoIndex(i: number) {
		if (!model) return;
		const it = model.navList[clamp(i, 0, model.navList.length - 1)];
		mode = 'key';
		pKey = solveP(model.docCentreOf(it.id), TUNE);
		startTween(TUNE.keyMs);
		applyCursor(it.id, true);
	}

	function onFocus() {
		if (!model) return;
		open = true;
		if (!cursorId) {
			let i = 0;
			for (let k = 0; k < model.flow.length; k++) if (position >= model.flow[k].s) i = k;
			gotoIndex(i);
		} else {
			applyCursor(cursorId, true);
		}
	}

	function onBlur() {
		if (hovering) return;
		open = false;
		applyCursor(null, false);
		mode = 'rest';
		startTween(TUNE.leaveMs);
	}

	function onKeydown(e: KeyboardEvent) {
		if (!model) return;
		// The rail's cursor id for a challenge is the synthetic `ch:<n>`, which
		// `indexOfId` has never heard of — and a miss there reads as index 0, so
		// the first arrow key after hovering a challenge would fling the cursor
		// back to the start of the course. Resolve through `chJump`, the
		// challenge's own anchor, which IS in `navList`; the arrow keys then
		// carry on from where the rhomboid actually sits.
		const ci = chIndex(cursorId);
		let cur = 0;
		if (ci >= 0) {
			cur = model.indexOfId.get(chJump[ci]) ?? 0;
		} else if (cursorId && model.indexOfId.has(cursorId)) {
			cur = model.indexOfId.get(cursorId)!;
		}
		const partIndexOfNav = (i: number) =>
			model!.partOf.get(model!.navList[clamp(i, 0, model!.navList.length - 1)].id) ?? 0;
		let handled = true;
		switch (e.key) {
			case 'ArrowRight':
				gotoIndex(cur + 1);
				break;
			case 'ArrowLeft':
				gotoIndex(cur - 1);
				break;
			case 'ArrowDown':
			case 'PageDown': {
				const pi = clamp(partIndexOfNav(cur) + 1, 0, model.parts.length - 1);
				gotoIndex(model.indexOfId.get(model.parts[pi].kids[0].item.id)!);
				break;
			}
			case 'ArrowUp':
			case 'PageUp': {
				const pi = clamp(partIndexOfNav(cur) - 1, 0, model.parts.length - 1);
				gotoIndex(model.indexOfId.get(model.parts[pi].kids[0].item.id)!);
				break;
			}
			case 'Home':
				gotoIndex(0);
				break;
			case 'End':
				gotoIndex(model.navList.length - 1);
				break;
			case 'Enter':
			case ' ':
				if (cursorId) jump(cursorId);
				break;
			case 'Escape':
				applyCursor(null, false);
				host.blur();
				break;
			default:
				handled = false;
		}
		if (handled) e.preventDefault();
	}

	/* ---- DOM construction (once) ------------------------------------------
	   Everything is built ONCE and only repositioned afterwards. No element is
	   ever created, destroyed or cross-faded during a sweep — that churn is
	   half of what makes a rail like this feel unsettled, and Svelte's keyed
	   reconciliation over 100+ nodes at pointer-move rate would reintroduce it
	   wholesale. */

	/** `searchEntries` returns at most 8, and hits are deduped by anchor. */
	const HIT_MAX = 8;

	/** Four-point sparkle path, centred on 0,0 with radius r. Only the hover
	 *  card's "Solved"/"Completed" chip draws one now — the rail's own marks
	 *  keep their silhouette when they are finished. See `.tt-pg.is-done`. */
	function sparkPath(r: number): string {
		const w = r * 0.34;
		return (
			`M0 ${-r} C ${w} ${-w}, ${w} ${-w}, ${r} 0` +
			` C ${w} ${w}, ${w} ${w}, 0 ${r}` +
			` C ${-w} ${w}, ${-w} ${w}, ${-r} 0` +
			` C ${-w} ${-w}, ${-w} ${-w}, 0 ${-r} Z`
		);
	}

	function el(tag: string, cls: string, parent: Element): HTMLElement {
		const n = document.createElement(tag);
		n.className = cls;
		parent.appendChild(n);
		return n;
	}

	function buildNodes(m: TimelineModel) {
		barNodes = [];
		headNodes = [];
		pgNodes = [];
		stemNodes = [];
		chNodes = [];
		chStems = [];

		glowNode = el('div', 'tt-glow', host);

		for (const b of m.bars) {
			const n = document.createElement('button');
			n.type = 'button';
			n.className = 'tt-seg';
			n.id = `${railId}-${b.item.id}`;
			n.setAttribute('role', 'option');
			n.setAttribute('aria-selected', 'false');
			n.setAttribute(
				'aria-label',
				longLabel(b.item) + (readIds.has(b.item.id) ? ', read' : ', not read')
			);
			n.tabIndex = -1;
			if (readIds.has(b.item.id)) n.classList.add('is-read');
			// Cold until the tracker's first publish says otherwise, so the rail
			// paints something honest in the frame before any heat exists.
			n.classList.add('is-cold');
			const head = el('div', 'tt-head', n);
			head.style.display = 'none';
			/* `host` is a dedicated mount node with no Svelte-managed children;
			   see the note above buildNodes for why the marks cannot be an
			   {#each}. */
			// eslint-disable-next-line svelte/no-dom-manipulating -- dedicated mount node
			host.appendChild(n);
			barNodes.push(n);
			headNodes.push(head);
		}

		for (const f of m.pgs) {
			const n = document.createElement('button');
			n.type = 'button';
			n.className = 'tt-pg';
			n.id = `${railId}-${f.item.id}`;
			n.setAttribute('role', 'option');
			n.setAttribute('aria-selected', 'false');
			n.setAttribute(
				'aria-label',
				`Playground: ${f.item.title}` +
					(doneIds.has(f.item.id)
						? ', completed'
						: readIds.has(f.item.id)
							? ', visited'
							: ', not attempted')
			);
			n.tabIndex = -1;
			if (doneIds.has(f.item.id)) n.classList.add('is-done', 'is-read');
			else if (readIds.has(f.item.id)) n.classList.add('is-read');
			el('div', 'gem', n);
			const stem = el('div', 'stem', n);

			// eslint-disable-next-line svelte/no-dom-manipulating -- dedicated mount node
			host.appendChild(n);
			pgNodes.push(n);
			stemNodes.push(stem);
		}

		/* The challenge lane. Same construction as the playgrounds, one lane
		   down and one shape over: playgrounds are SQUARES above the thread,
		   challenges are RHOMBOIDS below it. That split is load-bearing, not
		   decoration — see the note on `.tt-ch` in the stylesheet. */
		for (let i = 0; i < chList.length; i++) {
			const c = chList[i];
			const n = document.createElement('button');
			n.type = 'button';
			n.className = 'tt-ch';
			n.id = `${railId}-${c.id}`;
			n.setAttribute('role', 'option');
			n.setAttribute('aria-selected', 'false');
			n.setAttribute(
				'aria-label',
				`Challenge: ${c.title}` +
					(chDone[i] ? ', solved' : chTried[i] ? ', attempted' : ', not attempted')
			);
			n.tabIndex = -1;
			if (chDone[i]) n.classList.add('is-done');
			else if (chTried[i]) n.classList.add('is-tried');
			el('div', 'gem', n);
			const stem = el('div', 'stem', n);

			// eslint-disable-next-line svelte/no-dom-manipulating -- dedicated mount node
			host.appendChild(n);
			chNodes.push(n);
			chStems.push(stem);
		}

		// Search-hit points. Built once, like everything else here, and only ever
		// shown/hidden and moved. `searchEntries` is capped at 8 results and hits
		// are deduped by anchor, so a fixed pool of 8 can never be exhausted —
		// and 8 idle divs cost nothing next to the 100+ marks already here.
		// Created BEFORE posNode so the reading head still paints over them: the
		// green playhead is the more important of the two when they coincide.
		hitNodes = [];
		for (let i = 0; i < HIT_MAX; i++) {
			const n = el('div', 'tt-hit', host);
			n.style.display = 'none';
			n.setAttribute('aria-hidden', 'true');
			hitNodes.push(n);
		}

		posNode = el('div', 'tt-pos', host);
	}

	/** Rebuild the document model in place, keeping the DOM and the lens. */
	function rebuild(next: PlacedItem[] = items) {
		if (!model) return;
		model = buildModel(next);
		// Every bar's span just moved, so the hits' document positions are stale
		// even though the query has not changed. Re-resolve before painting.
		resolveHits();
		// Same for the challenges: their position is derived from their part's
		// span, and every part boundary just moved.
		resolveChallenges();
		// Same again for the dwell buckets: they are fractions of a bar's span,
		// so a re-measure repoints them at new pixels without invalidating one
		// byte of what the reader actually did. That is the whole reason the
		// buckets are section-relative rather than keyed to raw offsets.
		tracker?.setModel(model);
		layout();
	}

	onMount(() => {
		reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		for (const it of items) if (it.thumb) thumbOf.set(it.id, it.thumb);

		model = buildModel(items);
		marks = makeLayout(model);
		map = makeMapping(0, live());
		resolveChallenges();
		buildNodes(model);
		// A query can already be live when the rail mounts — the breakpoint gate
		// remounts it on a window resize, and the search box does not reset.
		resolveHits();
		layout();

		/* Challenge completion.
		   `doneIds` cannot answer this: it is derived in state.svelte.ts by
		   intersecting progress.scenarios with the manifest's PLAYGROUND ids,
		   so a solved challenge is filtered out on the way in. Rather than add
		   a prop that the header would have to thread through, read the one
		   store that already holds the answer. The key is the challenge id —
		   the same id the scenario runner records — so this lights up the
		   moment challenges become playable. */
		const stopProgress = progress.subscribe((s) => {
			let changed = false;
			for (let i = 0; i < chList.length; i++) {
				const done = !!s.scenarios[chList[i].id];
				const tried = done || !!s.attempts?.[chList[i].id];
				if (done !== chDone[i] || tried !== chTried[i]) {
					chDone[i] = done;
					chTried[i] = tried;
					changed = true;
				}
			}
			if (!changed || !chNodes.length) return;
			for (let i = 0; i < chNodes.length; i++) {
				chNodes[i].classList.toggle('is-done', chDone[i]);
				chNodes[i].classList.toggle('is-tried', chTried[i] && !chDone[i]);
				chNodes[i].setAttribute(
					'aria-label',
					`Challenge: ${chList[i].title}` +
						(chDone[i] ? ', solved' : chTried[i] ? ', attempted' : ', not attempted')
				);
			}
			if (cursorId) card = cardFor(cursorId);
		});

		/* ---- dwell heat ----
		   Built after the nodes exist, because the first publish paints them. The
		   tracker is independent of the rail's lifecycle otherwise: it samples on
		   its own 250ms clock whether or not anyone is hovering, which is the
		   point — a reader who is reading is not touching the rail. */
		rebuildLut();
		tracker = createDwellTracker();
		tracker.setModel(model);
		const stopHeat = tracker.subscribe(paintHeat);

		// The ramp inverts between themes (light goes darker-and-richer, dark
		// goes lighter-and-richer), so a theme flip must rebuild the LUT and
		// repaint every bar. Both the class toggle and the OS preference can
		// cause it.
		const repaintAll = () => {
			rebuildLut();
			if (model) paintHeat(model.bars.map((b) => b.item.id));
		};
		const themeMq = matchMedia('(prefers-color-scheme: dark)');
		themeMq.addEventListener('change', repaintAll);
		const themeObserver = new MutationObserver(repaintAll);
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		// warmNeighbours only runs once the cursor MOVES, which leaves the very
		// first hover of the session cold — the one hover most likely to be
		// someone's first impression of the rail. Warm the neighbourhood of where
		// the reader already is, at idle so it never competes with page load.
		const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 400));
		idle(() => warmNeighbours(model?.barAt(position).item.id ?? null));

		/* Then trickle the REST of the rail in, a few files per idle slot.
		   The bounded ±window around the cursor is the right shape for a hand,
		   but it is a window in NAV-INDEX terms while a pointer step is a
		   window in PIXELS — so the narrower the rail, the more anchors each
		   step retires, and at the narrowest widths a fast sweep outruns it. On
		   a cold cache that showed up as ~3 frames in 91 drawing an unloaded
		   banner, reproducibly, at narrow widths but not at 1440.

		   Widening the window would only move the width at which it breaks.
		   Warming everything up front would mean the whole thumbnail set
		   competing with page load, which is what the bounded window was
		   avoiding in the first place. Trickling is both: nothing extra during
		   load, and a few seconds later every banner is decoded and no sweep at
		   any width or speed can outrun it. The committed set is ~40 files at
		   ~7 KB each — around 300 KB end to end, spread across idle slots.
		   `warmOne` dedupes on URL, so the trickle and the cursor window never
		   double-fetch. */
		let trickleIdx = 0;
		let trickling = true;
		const trickle = () => {
			if (!trickling || !model) return;
			let budget = 3;
			while (budget > 0 && trickleIdx < model.bars.length) {
				if (warmOne(thumbFor(model.bars[trickleIdx++].item.id))) budget--;
			}
			if (trickleIdx < model.bars.length) idle(trickle);
		};
		idle(trickle);

		/* The rail's own width is what the mapping is expressed in, so a width
		   change means re-solving, not just repainting. Height never matters.

		   The rail is responsive: it fills the header up to the search box and
		   gives 60px back when the box opens. So a width change is no longer a
		   rare event to handle once — it is an ANIMATION, arriving ~12 times
		   over 200ms, and the old handler ran a full `layout()` on each of them.
		   That is the wrong shape twice over: `measureLabels` reads 100+ element
		   rects, forcing a synchronous style+layout flush per frame, and
		   re-solving the anchors mid-gesture is work whose answer is about to
		   change again.

		   Split it. The cheap half — the new W, and one repaint — runs every
		   frame, which is exactly the cost of a pointermove and is what makes
		   the resize look continuous rather than stepped. The expensive half
		   waits for the width to settle.

		   Nothing here is deferred to pointerleave the way an items change is:
		   a stale W is not a stale offset, it is a mapping that no longer
		   describes the rail, and every mark would be drawn in the wrong place
		   until the hand left. */
		let w0 = 0;
		let settle: ReturnType<typeof setTimeout> | null = null;
		const ro = new ResizeObserver(() => {
			// The rail just changed size, so the cached rect is wrong by
			// definition. This is one of exactly three invalidation points; the
			// other two are below.
			rectStale = true;
			freshRect();
			const w = W;
			if (Math.abs(w - w0) <= 0.5) return;
			w0 = w;
			// Re-derive the pointer's fraction from the pixel it is actually at.
			// Only the rail's RIGHT edge moves (the search box grows leftward into
			// it), so a stationary hand keeps its PIXEL: the lens must stay under
			// the cursor while the rail narrows. It cannot also keep its item —
			// the item under the lens centre is a function of `pointerFrac` alone,
			// so preserving the pixel necessarily re-picks. Pixel wins: a glow
			// sliding out from under a stationary hand is the visible fault; the
			// card naming the section now under the cursor is just the truth.
			if (hovering) pointerFrac = clamp01(pointerX / W);
			// `pShown` IS `pointerFrac` in pointer mode, so it has to be re-read
			// here too. The old guard excluded exactly the mode the line above
			// just updated, leaving the lens at the stale fraction — ~37px adrift
			// on a 60px shrink — until a synthesized pointermove happened to
			// correct it. `targetP()` already returns the right anchor per mode.
			if (!springing) pShown = targetP();
			// Re-pick under the stationary pointer, the same way the entry tween
			// re-picks on landing. The mapping just changed beneath a hand that
			// is not going to send another pointermove, so without this the card
			// keeps naming the previous section — pointing at one bar, naming
			// another — until the reader happens to move.
			if (mode === 'pointer' && hovering && model) {
				map = makeMapping(pShown, live());
				applyCursor(pickAt(pointerFrac * W, pointerY), false);
			}
			// Only the anchor re-solve genuinely needs redoing, and it can wait
			// for the width to stop changing.
			draw();
			if (settle) clearTimeout(settle);
			settle = setTimeout(() => {
				settle = null;
				layout();
			}, 140);
		});
		ro.observe(host);

		/* The other two rect invalidations. Neither changes the rail's SIZE, so
		   the ResizeObserver above never fires for them, but both move its
		   viewport-relative origin — and `left`/`top` are what the pointer
		   handlers subtract. A stale origin would offset every hit test by the
		   drift, which is the one way caching the rect could be wrong.

		   Marking rather than reading: the read is deferred to the next
		   `freshRect()`, so a scroll costs nothing until the pointer actually
		   arrives. `passive` because neither handler ever calls preventDefault
		   and a non-passive scroll listener on window blocks scrolling. */
		const invalidate = () => {
			rectStale = true;
		};
		window.addEventListener('scroll', invalidate, { passive: true });
		window.addEventListener('resize', invalidate, { passive: true });

		return () => {
			ro.disconnect();
			window.removeEventListener('scroll', invalidate);
			window.removeEventListener('resize', invalidate);
			stopProgress();
			stopHeat();
			// Flushes the dwell buffer to localStorage on the way out. The
			// breakpoint gate unmounts this component on a resize under the rail breakpoint, and
			// that must not cost the reader the last twenty seconds of reading.
			tracker?.destroy();
			tracker = null;
			themeMq.removeEventListener('change', repaintAll);
			themeObserver.disconnect();
			if (settle) clearTimeout(settle);
			if (raf) cancelAnimationFrame(raf);
			// The breakpoint gate unmounts this component on a resize under the rail breakpoint;
			// without this the trickle keeps rescheduling itself against a dead
			// model for the rest of the session.
			trickling = false;
		};
	});

	/* ---- reactive inputs --------------------------------------------------
	   Runes drive the rail's INPUTS only. Nothing here touches the marks
	   directly; each effect ends in the same imperative paint path. */

	// New offsets: the whole model moves, so re-solve. Never while the pointer
	// is on the rail — every mark would slide out from under it — so queue it
	// and apply on pointerleave.
	$effect(() => {
		const next = items;
		untrack(() => {
			if (!model) return;
			if (hovering) pendingRelayout = true;
			else rebuild(next);
		});
	});

	// Scroll only moves the playhead and the green fill; no re-solve, no
	// remeasure. `pRest` follows so the lens parks in the right place when the
	// pointer leaves.
	$effect(() => {
		const at = clamp01(position);
		untrack(() => {
			if (!model) return;
			pRest = solveP(at, restTune);
			if (mode === 'rest' && !springing && !hovering) pShown = pRest;
			draw();
		});
	});

	// Search results, published by the header's search box. Resolving an id to a
	// document position is a linear scan of the model, so it happens HERE — once
	// per result set, i.e. once per keystroke — and never in paint(), which then
	// only has to run each surviving `u` through the mapping.
	$effect(() => {
		// Read the rune here so the effect subscribes to it; `resolveHits` reads
		// it again inside untrack because it is also called from `rebuild`.
		void searchHits.ids;
		untrack(() => {
			if (!model) return;
			resolveHits();
			paint();
		});
	});

	// The card is ordinary markup, so it does not exist in the DOM until Svelte
	// has rendered it — one frame after applyCursor set it. Position it then.
	$effect(() => {
		if (cardEl && card) untrack(() => cursorId && placeCard(cursorId));
	});

	// Progress writes are rare, and only ever toggle classes.
	$effect(() => {
		const read = readIds;
		const done = doneIds;
		untrack(() => {
			if (!model) return;
			for (let i = 0; i < model.bars.length; i++) {
				barNodes[i].classList.toggle('is-read', read.has(model.bars[i].item.id));
			}
			for (let i = 0; i < model.pgs.length; i++) {
				const id = model.pgs[i].item.id;
				pgNodes[i].classList.toggle('is-done', done.has(id));
				pgNodes[i].classList.toggle('is-read', done.has(id) || read.has(id));
			}
			if (cursorId) card = cardFor(cursorId);
			paint();
		});
	});
</script>

<div class="thread-wrap" class:is-open={open}>
	<!-- The rail is one hit surface: every mark is pointer-events:none and the
	     target comes from the mapping, not from a node's pixel extent. -->
	<div
		bind:this={host}
		class="thread-rail"
		role="listbox"
		tabindex="0"
		aria-label="Course progress. Arrow keys to move, Enter to jump."
		onpointerenter={onPointerEnter}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onclick={onClick}
		onfocus={onFocus}
		onblur={onBlur}
		onkeydown={onKeydown}
	></div>

	{#if card}
		<div
			bind:this={cardEl}
			class="tt-card"
			class:is-on={open}
			class:is-pg={card.kind === 'playground'}
			class:is-ch={card.kind === 'challenge'}
		>
			<div bind:this={arrowEl} class="arrow"></div>
			{#if card.kind === 'part' || card.kind === 'section'}
				<div class="tt-banner">
					{#if card.thumb}
						<!-- Deliberately NOT loading="lazy". Lazy is for images below the
					     fold that may never be seen; this one is on screen the instant
					     it exists, so lazy only delayed the fetch until after the card
					     opened — which IS the empty rectangle the first hover showed.
					     decoding="sync" is the other half: warmNeighbours has already
					     decoded this bitmap, so committing it in the same paint as the
					     rest of the card is free, whereas the default async decode can
					     land a frame later and flash the empty banner box.
					     The element is reused across cursor moves (the {#if} stays true,
					     so only `src` changes) — re-creating it would restart the load
					     and blank the box on every single item. -->
						<img src={card.thumb} alt="" width="480" height="270" decoding="sync" />
					{:else}
						<span class="glyph">{card.glyph}</span>
						<span class="tag">{card.kind} banner</span>
					{/if}
				</div>
			{/if}
			<div class="tt-kicker">{card.kicker}</div>
			<div class="tt-title">{card.title}</div>
			{#if card.chips.length}
				<div class="tt-row">
					{#each card.chips as chip (chip.text)}
						<span class="tt-chip" class:on={chip.tone === 'on'} class:gold={chip.tone === 'gold'}>
							{#if chip.tone === 'gold' && (card.kind === 'playground' || card.kind === 'challenge')}
								<svg viewBox="-6 -6 12 12" aria-hidden="true"><path d={sparkPath(5)} /></svg>
							{/if}
							{chip.text}
						</span>
					{/each}
				</div>
			{/if}
			{#if card.hint}
				<div class="tt-hint">{card.hint}</div>
			{/if}
		</div>
	{/if}

	<div class="tt-sr" aria-live="polite">{announce}</div>
</div>

<style>
	/* Colours are semantic, three of them, bound to the app's own tokens:
	     indigo = where you are now (the chrome's own primary — the reading
	              head is the one mark allowed to wear the app's accent)
	     violet = the thread itself + sections (--color-vibe, one step warm of
	              the chrome so the rail reads as content, not chrome)
	     pink   = playgrounds (--color-important, the same token the header's
	              Playground button already wears — one hue, one meaning)
	   Violet and pink sit close together in dark mode, so the rail separates
	   playgrounds from sections GEOMETRICALLY rather than by hue: playgrounds
	   are diamonds in their own lane above the thread, sections are bars on it,
	   part structure sits below. Those three lanes are also the hit-test model. */
	.thread-wrap {
		position: relative;
		width: 100%;
		min-width: 0;
		height: 48px;
		font-family: var(--font-sans);

		--tl-head: var(--color-primary);
		--tl-thread: var(--color-vibe);
		--tl-play: var(--color-important);
		/* The fourth colour, and the only cool-cyan one: search hits. It is the
		   tip callout's own blue, which is why it belongs to this app rather
		   than arriving from nowhere — and being the sole cyan among
		   indigo/violet/pink, it reads as a separate channel instead of
		   competing with any of the three semantic colours. The var() fallback
		   lets a future `--color-search-hit` token in layout.css win without an
		   edit here. */
		--tl-cyan: var(--color-search-hit, var(--color-tip));
		/* The fifth: challenges. Terracotta — warm, iron-rich clay, the one
		   earthen hue on a cool rail, so a chapter's exit test is unmistakably
		   a different kind of stop. `--color-challenge` is the token's name;
		   until layout.css defines it the fallback here stands in, and because
		   var() fallbacks lose to any real definition, the token wins the
		   moment it lands. */
		--tl-clay: var(--color-challenge, #b3572e);
		/* Achievement green. Deliberately neither --tl-head nor --tl-play: "you
		   solved this" must survive next to both "you are here" (indigo) and
		   "this is a playground" (pink), and the terminal's own prompt green is
		   the colour this app already uses for a command that worked. */
		--tl-earned: var(--color-earned, var(--color-terminal-prompt));
		/* The two COMPLETED colours: solved marks step OUT of their lane's
		   resting hue into a bright lift, because "done" carried only by a fill
		   swap inside one hue is invisible at 5px. Both accept a layout.css
		   token so a later theming pass wins without touching this file. */
		--tl-earned-bright: var(--color-earned-bright, var(--color-terminal-prompt));
		--tl-clay-bright: var(--color-challenge-bright, #d97706);
		--tl-text: var(--color-text);
		--tl-text-secondary: var(--color-text-secondary);
		--tl-text-muted: var(--color-text-muted);
		--tl-surface: var(--color-surface);
		--tl-border: var(--color-border);
		--tl-bg-secondary: var(--color-bg-secondary);

		--cy: 24px;
		--ease: cubic-bezier(0.22, 0.61, 0.36, 1);
		/* The unread hatch. Reworked: higher frequency (3.2px period, was 5px)
		   and much thinner strokes (0.55px of solid core, was 1.7px). At the old
		   weight the diagonal read as gouges cut into the bar — "rugged" was
		   exactly right — because a 1.7px stroke on a 15px-tall bar is a third
		   of the bar per stripe.

		   The stops are RAMPED rather than hard (0.55 solid, then a 0.45px fade
		   to nothing) and that is not decoration: a sub-pixel hard edge on a
		   mark that moves a fraction of a pixel per frame is a shimmer
		   generator, and at DPR 1 a 0.55px hard stripe aliases to a flickering
		   1px-or-0px. The ramp hands the rasteriser something to antialias
		   against, so the stripe fades instead of blinking, at both DPRs. */
		--hatch-ink: color-mix(in srgb, var(--tl-thread) 72%, transparent);
		--hatch-bed: color-mix(in srgb, var(--tl-thread) 9%, transparent);
		--thread-dim: color-mix(in srgb, var(--tl-thread) 26%, transparent);

		/* The reading head's leading edge. `--tl-hot` ends the fill; `--tl-core`
		   is the bead sitting on it. They are separate tokens because the two
		   themes need them to disagree.

		   On dark, both climb to near-white: that is the brightest thing on the
		   page and reads as heat. On the light theme's near-white ground, white
		   is LOWER contrast than the indigo it came from — a white-hot tip
		   would fade out at exactly the point it is meant to peak. So light
		   lifts the fill only two thirds of the way to white (still an obvious
		   ramp against the violet thread) and then inverts the bead: a
		   full-strength indigo core, ringed in the surface colour so it is cut
		   cleanly out of its own halo, with a soft indigo cast under it. Same
		   read — "the fill ends in a bright point" — arrived at from opposite
		   directions. */
		--tl-hot: color-mix(in srgb, var(--tl-head) 68%, #fff);
		--tl-core: var(--tl-head);
		--tl-halo: color-mix(in srgb, var(--tl-head) 42%, transparent);
		--tl-halo-soft: color-mix(in srgb, var(--tl-head) 15%, transparent);
		--tl-bead-ring: color-mix(in srgb, var(--tl-surface) 92%, transparent);
		--tl-bead-cast: 0 1px 3px color-mix(in srgb, var(--tl-head) 50%, transparent);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not(.light)) .thread-wrap {
			--tl-clay: var(--color-challenge, #d98a5f);
			--tl-hot: color-mix(in srgb, var(--tl-head) 14%, #fff);
			--tl-core: color-mix(in srgb, var(--tl-head) 6%, #fff);
			--tl-halo: color-mix(in srgb, var(--tl-head) 60%, transparent);
			--tl-halo-soft: color-mix(in srgb, var(--tl-head) 22%, transparent);
			/* no ring, no cast: a white-hot core needs no help separating itself
			   from indigo, and a shadow under it would only muddy the bloom */
			--tl-bead-ring: transparent;
			--tl-bead-cast: 0 0 0 transparent;
		}
	}
	:global(:root.dark) .thread-wrap {
		/* Terracotta lifts in dark for the same reason every accent here does:
		   the light theme's brick is mud on a navy ground. Fallback only — a
		   real --color-challenge definition wins in both themes. */
		--tl-clay: var(--color-challenge, #d98a5f);
		/* The unread bar has to read as a RAIL before it reads as unread. At 9%
		   violet on this ground it is barely there while the hatch sits at 72% —
		   stripes eight times brighter than the thing they are meant to be
		   texturing make an untouched rail look like scratches on an empty
		   strip rather than a timeline waiting to be filled. Lift the bed and
		   pull the ink down toward it: same order, far less contrast between
		   them, so the hatch becomes a surface rather than the subject. */
		--hatch-bed: color-mix(in srgb, var(--tl-thread) 30%, transparent);
		--hatch-ink: color-mix(in srgb, var(--tl-thread) 52%, transparent);
		--thread-dim: color-mix(in srgb, var(--tl-thread) 42%, transparent);
		--tl-hot: color-mix(in srgb, var(--tl-head) 14%, #fff);
		--tl-core: color-mix(in srgb, var(--tl-head) 6%, #fff);
		--tl-halo: color-mix(in srgb, var(--tl-head) 60%, transparent);
		--tl-halo-soft: color-mix(in srgb, var(--tl-head) 22%, transparent);
		--tl-bead-ring: transparent;
		--tl-bead-cast: 0 0 0 transparent;
	}
	:global(:root.light) .thread-wrap {
		--tl-clay: var(--color-challenge, #b3572e);
		--tl-hot: color-mix(in srgb, var(--tl-head) 68%, #fff);
		--tl-core: var(--tl-head);
		--tl-halo: color-mix(in srgb, var(--tl-head) 42%, transparent);
		--tl-halo-soft: color-mix(in srgb, var(--tl-head) 15%, transparent);
		--tl-bead-ring: color-mix(in srgb, var(--tl-surface) 92%, transparent);
		--tl-bead-cast: 0 1px 3px color-mix(in srgb, var(--tl-head) 50%, transparent);
	}

	.thread-wrap :global(*) {
		box-sizing: border-box;
	}

	.thread-rail {
		position: absolute;
		inset: 0;
		outline: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.thread-rail:focus-visible :global(.tt-glow) {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-head) 45%, transparent);
		border-radius: 9px;
	}

	/* The lens, drawn as a soft swell rather than a framed box: there are no
	   edges in the mapping, so there must be none on screen either. Neutral
	   ink, because green is reserved for "where you are". */
	.thread-wrap :global(.tt-glow) {
		position: absolute;
		top: 4px;
		height: 40px;
		left: 0;
		pointer-events: none;
		background: radial-gradient(
			60% 52% at 50% 62%,
			color-mix(in srgb, var(--tl-text) 9%, transparent),
			transparent 72%
		);
		opacity: 0.55;
		transition: opacity 160ms linear;
	}
	.thread-wrap.is-open :global(.tt-glow) {
		opacity: 1;
	}

	/* ---- section bars: the thread itself ---- */
	.thread-wrap :global(.tt-seg) {
		position: absolute;
		border-radius: 3px;
		padding: 0;
		border: 0;
		appearance: none;
		pointer-events: none;
		overflow: hidden;
		transition:
			box-shadow 120ms linear,
			filter 120ms linear;
	}
	/* The hatch now means exactly one thing: you have never been here. It used
	   to be the base state of every bar, which is why the rail read as uniformly
	   "rugged" — a rail of hatched bars is a texture, not a signal. With dwell heat
	   painting everything the reader has actually spent time on, the hatch is
	   left on the handful of bars where "you have not been here" IS the whole
	   message.

	   45°, anchored to THIS ELEMENT. Nothing writes background-position,
	   so the stripe phase relative to the bar's own left edge is identically zero
	   at every width the fisheye hands it. See the long note in paint(). */
	.thread-wrap :global(.tt-seg.is-cold) {
		background-color: var(--hatch-bed);
		background-image: repeating-linear-gradient(
			45deg,
			var(--hatch-ink) 0 0.3px,
			transparent 0.75px 3.9px
		);
		/* A FIXED tile, and this is the SECOND HALF of the anti-crawl fix — dropping
		   the rail-space `background-position` is not on its own enough.

		   `background-size: auto` makes the gradient box the element box, and CSS
		   centres a gradient's line on its own box. So with `auto` the pattern's
		   origin is a function of the element's WIDTH AND HEIGHT, both of which the
		   fisheye rewrites every frame — the hatch crawls just as badly as it did
		   under rail-space pinning, and for a completely different reason.

		   Measured with an opaque 50%-duty stand-in for this hatch (the shipped one
		   is too faint to phase-fit reliably), sweeping the cursor across one bar so
		   the lens varied it 2.45x in width:

		       background-size: auto              1.53px of phase drift
		       background-position: -x,-top       1.58px   (the reverted code)
		       background-size: 31.68px           0.41px
		       ruler's own noise floor            0.33px

		   The floor is from the same measurement run against an element that was
		   only slid to different subpixel offsets at a constant size, so it cannot
		   crawl by construction. The fixed tile sits on that floor; the other two
		   are 4-5x above it.

		   31.68px is 7 periods of the 45° hatch along each axis (3.2px along the
		   gradient line is 3.2 x √2 = 4.5255px along x), so the tiles abut in phase
		   and the repeat is invisible. Changing the 3.2px above without changing
		   this reintroduces a visible seam every 31.68px. */
		background-size: 31.68px 31.68px;
	}

	/* Under ~3px a diagonal hatch is just noise, so compressed bars fall back to
	   a clean flat fill. `background-image` is left to the heat painter, which
	   sets `none` on a warm tiny bar and lets the colour carry it. */
	.thread-wrap :global(.tt-seg.is-tiny) {
		border-radius: 1px;
	}
	.thread-wrap :global(.tt-seg.is-tiny.is-cold) {
		background-image: none;
		background-color: var(--thread-dim);
	}
	/* `is-read` keeps its semantic role for the aria-label and nothing else. It
	   would otherwise force a flat fill and `background-image: none`, which would
	   override every heat gradient — and it was answering the wrong question
	   anyway: "did you scroll past this" rather than "did you stay". */
	/* The green fill still grows through the bar the reader is inside, but it
	   no longer stops on a flat edge: it ramps up into the hot core so the
	   leading edge IS the glow. `.tt-seg` clips, so the bloom proper lives on
	   `.tt-pos`, which sits directly over this edge. */
	.thread-wrap :global(.tt-seg .tt-head) {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		border-radius: 3px 0 0 3px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--tl-head) 60%, transparent) 0%,
			var(--tl-head) 58%,
			var(--tl-hot) 100%
		);
	}
	.thread-wrap :global(.tt-seg.is-active) {
		box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--tl-head) 55%, transparent);
	}
	.thread-wrap :global(.tt-seg.is-cursor) {
		box-shadow: 0 0 0 2px var(--tl-head);
		filter: brightness(1.12) saturate(1.05);
	}

	/* ---- part structure, below the thread ----
	   Nothing is DRAWN for a part any more. The section-number strip went first,
	   then the 1.5px boundary hairlines: the challenge rhomboid at the end of
	   each part already marks where one chapter stops and the next begins, and a
	   second mark saying the same thing 12% further along read as a stray digit.

	   The part LANE is still live — it is the band below LANE_PART, `pick()`
	   still resolves it to `part:<n>` wherever a challenge does not claim the
	   hit, and the hover card still names the chapter. Identity here comes from
	   the card and the screen-reader announcement, not from a glyph. */

	/* ---- the two activity lanes ------------------------------------------
	   Playgrounds are SQUARES above the thread; challenges are RHOMBOIDS below
	   it. Lane and silhouette, not colour, are what separate them — and that is
	   load-bearing, not decoration.

	   Hue alone cannot be trusted to carry the split: pink and terracotta are
	   both warm, and under the common colour-vision deficiencies warm accents
	   collapse toward one another long before they collapse into the cool
	   thread. A reader who cannot resolve the hues resolves this rail by lane
	   and outline instead.

	   So: DO NOT "simplify" both marks to one shape, and do not move either
	   lane to the same side of the thread. Either change silently deletes the
	   only channel that survives colour-blindness here. */
	.thread-wrap :global(.tt-pg),
	.thread-wrap :global(.tt-ch) {
		position: absolute;
		padding: 0;
		border: 0;
		background: none;
		appearance: none;
		pointer-events: none;
		transition: filter 120ms linear;
	}

	/* The stem hangs DOWN from a playground (its lane is above the thread) and
	   UP from a challenge (below). Same 1px hairline either way. */
	.thread-wrap :global(.tt-pg .stem) {
		position: absolute;
		left: 50%;
		top: 100%;
		width: 1px;
		margin-left: -0.5px;
		background: color-mix(in srgb, var(--tl-play) 38%, transparent);
	}
	.thread-wrap :global(.tt-ch .stem) {
		position: absolute;
		left: 50%;
		bottom: 100%;
		width: 1px;
		margin-left: -0.5px;
		background: color-mix(in srgb, var(--tl-clay) 42%, transparent);
	}

	.thread-wrap :global(.tt-pg .gem),
	.thread-wrap :global(.tt-ch .gem) {
		position: absolute;
		inset: 0;
		border-radius: 1.5px;
	}
	/* Squares. Axis-aligned, so an ordinary 1px border rasterises exactly: at
	   DPR 1 it measures 1.00 device px of ink at peak coverage 0.999. Nothing
	   to correct, so nothing is done to it. */
	.thread-wrap :global(.tt-pg .gem) {
		border: 1px solid var(--pg-line);
		background: var(--pg-fill);
	}

	/* Rhomboids, and the reason they are NOT drawn with `border`.
	   "the border of the rhomboids for challenges is thicker than the border of
	   the squares" — they were both literally `border: 1px`, and the rhomboid
	   still read heavier, because a square rotated 45° meets the pixel grid
	   diagonally. Its stroke cannot land on a pixel row, so the rasteriser
	   spreads it across two, and a band of half-lit pixels twice as wide reads
	   as a fatter pen even though the total ink is identical.

	   Measured (8 sub-pixel phases, coverage profile along the edge normal,
	   equivalent width = ink / peak):

	     DPR 1, 9.5px square vs 7.6px rhomboid, both 1px
	       square    ink 1.000  peak 0.999  equivWidth 1.001
	       rhomboid  ink 0.893  peak 0.686  equivWidth 1.301   <- 1.30x
	     DPR 2, same pair, both 1px
	       square    ink 1.000  peak 1.000  equivWidth 1.000
	       rhomboid  ink 0.952  peak 0.940  equivWidth 1.013   <- already level

	   So the defect is a DPR 1 artefact and DPR 2 needs no correction at all —
	   which is why the fix is behind a resolution query rather than applied flat.

	   `border-width` cannot express the correction: Chrome quantises it to whole
	   CSS pixels. Measured on a 40px box, border-width 0.25 / 0.5 / 0.75 / 1 /
	   1.5px ALL render exactly 156 css-px^2 of ink (= 4 x 39 x 1), and only 2px
	   moves, to 304. That holds at DPR 2 as well. `outline` is quantised too
	   (164 at every width). An inset box-shadow is the one stroke that is
	   genuinely sub-pixel — its ink scales with the spread at both DPRs — so the
	   rhomboid's outline is drawn with one.

	   0.75px is where the diagonal band bottoms out: it takes equivWidth from
	   1.301 to 1.165, and no thinner value goes lower (0.70 -> 1.169, 0.60 ->
	   1.178, 0.45 -> 1.278, as ink collapses faster than extent). The residual
	   1.165 vs 1.001 is the irreducible cost of a diagonal on a 1x grid. */
	.thread-wrap {
		--ch-stroke: 0.75px;
	}
	@media (min-resolution: 2dppx) {
		.thread-wrap {
			--ch-stroke: 1px;
		}
	}
	.thread-wrap :global(.tt-ch .gem) {
		transform: rotate(45deg);
		border: 0;
		box-shadow: inset 0 0 0 var(--ch-stroke) var(--ch-line);
		background: var(--ch-fill);
	}

	/* Incomplete marks are TONED DOWN — this is the "they don't look that
	   different" complaint. Before, an unsolved playground carried a hatched
	   fill and a 72%-opacity border, which at 5px is simply a filled blob: it
	   was nearly as loud as a solved one, so the rail reads as uniformly lit
	   whatever the reader had actually done.

	   Three states now, and they step monotonically in weight:
	     not attempted -> hairline outline, barely-there fill
	     visited       -> solid, on-colour
	     solved        -> solid, in the family's BRIGHT lift
	   The silhouette is constant across all three: the step from visited to
	   solved is carried by hue and lightness, not by swapping the shape out.
	   The hatch is gone from both: a 3px stripe inside a 5px square is noise,
	   and it was a second moiré source for no information. */
	.thread-wrap {
		--pg-line: color-mix(in srgb, var(--tl-play) 38%, transparent);
		--pg-fill: color-mix(in srgb, var(--tl-play) 7%, transparent);
		/* Challenges are NOT toned down the way playgrounds are, and the asymmetry
		   is deliberate. A playground sits in the lane above with two dozen
		   companions and a bar row behind it, so a whisper is enough to place
		   it; a challenge is one mark per chapter, the reward at its end, and a
		   hairline over a faint fill would make it the faintest thing on the
		   rail. The unattempted state is a full-strength outline over a fill
		   with real presence, which is what makes a rhomboid unmistakable at
		   rest. */
		--ch-line: var(--tl-clay);
		--ch-fill: color-mix(in srgb, var(--tl-clay) 26%, transparent);
	}
	.thread-wrap :global(.tt-pg.is-read .gem) {
		background: var(--tl-play);
		border-color: var(--tl-play);
	}
	/* Attempted but not solved: filled solid, one clear step up from the
	   outline. Both activity lanes carry the same three states, so a reader
	   never has to learn two different grammars for "started but unfinished". */
	.thread-wrap :global(.tt-ch.is-tried .gem) {
		background: var(--tl-clay);
		box-shadow: inset 0 0 0 var(--ch-stroke) var(--tl-clay);
	}

	/* SOLVED KEEPS ITS SILHOUETTE. Finishing something must not change WHAT
	   SHAPE IT IS — the silhouette is the lane's identity (see the note on the
	   two activity lanes), so a solved playground is still a square and a
	   solved challenge still a rhomboid, and the whole signal is the bright
	   fill. That places the entire done/not-done burden on colour, which is
	   why the bright tokens step in LIGHTNESS as well as hue: a step that
	   survives when hue does not. */
	.thread-wrap :global(.tt-pg.is-done .gem) {
		background: var(--tl-earned-bright);
		border-color: var(--tl-earned-bright);
	}
	.thread-wrap :global(.tt-ch.is-done .gem) {
		background: var(--tl-clay-bright);
		box-shadow: inset 0 0 0 var(--ch-stroke) var(--tl-clay-bright);
	}

	/* THE CURSOR RECOLOURS THE MARK'S OWN OUTLINE. It does not add a ring.

	   A `box-shadow: 0 0 0 2px` cursor ring paints a 2px ring OUTSIDE the 1px
	   border that is already there — two concentric outlines on a mark that is
	   4px across at rest, which is most of the mark's own width spent on
	   chrome. So each lane recolours the stroke it already has: the square its
	   border, the rhomboid its inset shadow. Same geometry before and after,
	   so the mark does not grow or shift on hover — only its outline changes
	   colour. The cursor indigo is the chrome's own accent, which no resting
	   mark wears, so the recolour is unambiguous against every state.

	   `brightness(1.1)` on the whole mark rides along. It is not doing the
	   cursor's work — the recoloured stroke is — but it lifts the fill too,
	   which keeps the cursor legible on the one mark whose outline is the
	   least of it: a solved mark, which is mostly fill. It costs no layout and
	   no second edge. */
	.thread-wrap :global(.tt-pg.is-cursor .gem) {
		border-color: var(--tl-head);
	}
	.thread-wrap :global(.tt-ch.is-cursor .gem) {
		box-shadow: inset 0 0 0 var(--ch-stroke) var(--tl-head);
	}
	.thread-wrap :global(.tt-pg.is-cursor),
	.thread-wrap :global(.tt-ch.is-cursor) {
		filter: brightness(1.1);
	}

	/* ---- the reading head: a glow, not a marker ----
	   The old head was a 2px needle 26px tall with an arrowhead on top. It read
	   as a piece of hardware clamped onto the rail, and geometrically it was
	   wrong: it spanned y 7..37, straight through the playground lane (y < 17,
	   where the diamonds sit) and down past the label strip, so it crossed
	   marks it has nothing to say about.

	   What replaces it is the END of the green fill rather than a thing on top
	   of it — a soft lozenge whose alpha is already zero above y≈17 and below
	   y≈31, i.e. contained in the thread's own lane by falloff rather than by a
	   clip. Nothing overshoots because there is no hard edge anywhere on it:
	   the ends fade instead of being capped, so it cannot "poke through" a
	   diamond. Anisotropic on purpose (wider than tall) so the bloom spreads
	   ALONG the thread — the direction the reader is travelling — instead of
	   ballooning into the neighbouring lanes.

	   No animation: this sits in the header for the whole session, so it is
	   static and gains presence only from contrast. The one movement is a
	   slightly larger bloom while the rail is open, and that is a transition,
	   which the reduced-motion block at the bottom already flattens. */
	.thread-wrap :global(.tt-pos) {
		position: absolute;
		top: calc(var(--cy) - 13px);
		width: 26px;
		height: 26px;
		margin-left: -13px;
		pointer-events: none;
	}
	.thread-wrap :global(.tt-pos::before) {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		/* 0.7 vertical squash keeps the outermost visible stop (76% of 13px)
		   inside ±7px of the centre line — clear of LANE_PG at 17px. */
		transform: scale(1.18, 0.7);
		background: radial-gradient(
			closest-side circle at 50% 50%,
			var(--tl-hot) 0 8%,
			var(--tl-halo) 30%,
			var(--tl-halo-soft) 52%,
			transparent 76%
		);
		transition: transform 200ms var(--ease);
	}
	.thread-wrap.is-open :global(.tt-pos::before) {
		transform: scale(1.34, 0.74);
	}
	/* The core. Small and hard-edged against a bloom that has none — that
	   contrast is what makes the position readable to a pixel rather than
	   merely "somewhere in the glow". On light the ring cuts it out of its own
	   halo; on dark the ring is transparent and the white does that job. */
	.thread-wrap :global(.tt-pos::after) {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 5px;
		height: 5px;
		margin: -2.5px 0 0 -2.5px;
		border-radius: 50%;
		background: var(--tl-core);
		box-shadow:
			0 0 0 1.5px var(--tl-bead-ring),
			var(--tl-bead-cast);
	}

	/* ---- search hits ----------------------------------------------------
	   A glowing cyan point per matching anchor, sitting on the thread itself:
	   the rail's whole claim is that a document position is a place on this
	   line, so "your search is HERE" has to be stated in that same language
	   rather than in a separate lane.

	   Bright at rest, deliberately. Everything else on the rail is subtle until
	   you reach for it, because everything else is ambient. A search hit is the
	   opposite: it exists for a few seconds, in direct response to something
	   the reader just typed, and the moment it matters most is the moment
	   before the pointer arrives. So it carries its own light instead of
	   waiting for the lens.

	   Sized in absolute pixels rather than from `mag`, for the same reason —
	   a hit out in the compressed tail is exactly the one worth finding, and
	   scaling it with the lens would hide it until you had already found it. */
	.thread-wrap :global(.tt-hit) {
		position: absolute;
		top: calc(var(--cy) - 3.5px);
		left: 0;
		width: 7px;
		height: 7px;
		margin-left: -3.5px;
		border-radius: 50%;
		pointer-events: none;
		background: var(--tl-cyan);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--tl-surface) 70%, transparent),
			0 0 7px 2px color-mix(in srgb, var(--tl-cyan) 55%, transparent);
		/* `transform` is the position, written every frame by paint(), so the
		   pulse must live entirely in properties paint() does not touch. */
		animation: tt-hit-pulse 1600ms ease-in-out infinite;
	}

	@keyframes tt-hit-pulse {
		0%,
		100% {
			opacity: 0.8;
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--tl-surface) 70%, transparent),
				0 0 5px 1px color-mix(in srgb, var(--tl-cyan) 42%, transparent);
		}
		50% {
			opacity: 1;
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--tl-surface) 70%, transparent),
				0 0 10px 3px color-mix(in srgb, var(--tl-cyan) 72%, transparent);
		}
	}

	/* ---- hover / focus card ---- */
	.tt-card {
		position: absolute;
		/* 58, not 78. The header is 48px tall, so 78 left a 30px void between the
		   rail and the thing the rail was pointing at — the card read as floating
		   near the header rather than hanging off the mark under the cursor. 10px
		   is enough for the arrow and the shadow to breathe. */
		top: 58px;
		z-index: 60;
		width: 236px;
		background: var(--tl-surface);
		border: 1px solid var(--tl-border);
		border-radius: 10px;
		box-shadow:
			0 12px 28px -12px rgba(0, 0, 0, 0.45),
			0 2px 6px -2px rgba(0, 0, 0, 0.25);
		padding: 8px;
		opacity: 0;
		pointer-events: none;
		transform: translateY(-4px);
		transition:
			opacity 130ms linear,
			transform 130ms var(--ease);
	}
	.tt-card.is-on {
		opacity: 1;
		transform: translateY(0);
	}
	.tt-card.is-pg,
	.tt-card.is-ch {
		width: 212px;
	}
	.tt-card .arrow {
		position: absolute;
		top: -5px;
		width: 9px;
		height: 9px;
		margin-left: -4.5px;
		background: var(--tl-surface);
		border-left: 1px solid var(--tl-border);
		border-top: 1px solid var(--tl-border);
		transform: rotate(45deg);
		border-radius: 2px 0 0 0;
	}
	.tt-banner {
		position: relative;
		width: 100%;
		aspect-ratio: 16/9;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--tl-border);
		background: var(--tl-bg-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8px;
	}
	.tt-banner img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.tt-banner .glyph {
		position: relative;
		font: 600 15px/1 var(--font-mono);
		color: var(--tl-text-secondary);
		letter-spacing: 0.06em;
	}
	.tt-banner .tag {
		position: absolute;
		left: 6px;
		bottom: 5px;
		z-index: 2;
		font: 600 7.5px/1 var(--font-mono);
		letter-spacing: 0.14em;
		color: var(--tl-text-muted);
		text-transform: uppercase;
	}
	.tt-kicker {
		font: 700 8px/1 var(--font-mono);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--tl-text-muted);
		margin-bottom: 4px;
	}
	.tt-card.is-pg .tt-kicker {
		color: var(--tl-play);
	}
	.tt-card.is-ch .tt-kicker {
		color: var(--tl-clay);
	}
	/* The "Solved" chip wears the lane's colour, matching its rail mark. */
	.tt-card.is-ch .tt-chip.gold {
		color: var(--tl-clay);
		border-color: color-mix(in srgb, var(--tl-clay) 52%, transparent);
		background: color-mix(in srgb, var(--tl-clay) 14%, transparent);
	}
	.tt-card.is-pg .tt-chip.gold {
		color: var(--tl-earned);
		border-color: color-mix(in srgb, var(--tl-earned) 52%, transparent);
		background: color-mix(in srgb, var(--tl-earned) 14%, transparent);
	}
	.tt-title {
		font: 600 13px/1.25 var(--font-heading);
		color: var(--tl-text);
		margin-bottom: 6px;
	}
	/* A card with nothing to boast about ends on the title — don't leave its
	   trailing margin behind as a strip of dead padding. */
	.tt-title:last-child {
		margin-bottom: 0;
	}
	.tt-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.tt-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font: 600 9.5px/1 var(--font-mono);
		letter-spacing: 0.02em;
		padding: 3px 6px;
		border-radius: 5px;
		border: 1px solid var(--tl-border);
		color: var(--tl-text-secondary);
		background: var(--tl-bg-secondary);
	}
	.tt-chip.on {
		color: var(--tl-head);
		border-color: color-mix(in srgb, var(--tl-head) 45%, transparent);
		background: color-mix(in srgb, var(--tl-head) 12%, transparent);
	}
	.tt-chip.gold {
		color: var(--tl-play);
		border-color: color-mix(in srgb, var(--tl-play) 52%, transparent);
		background: color-mix(in srgb, var(--tl-play) 14%, transparent);
	}
	.tt-chip svg {
		width: 10px;
		height: 10px;
		fill: currentColor;
	}
	.tt-hint {
		margin-top: 7px;
		padding-top: 6px;
		border-top: 1px solid var(--tl-border);
		font: 500 9.5px/1.3 var(--font-mono);
		color: var(--tl-text-muted);
	}

	.tt-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.thread-wrap :global(*),
		.tt-card {
			transition-duration: 1ms !important;
		}
		/* The hit points stop breathing and simply stay lit at their brightest —
		   the pulse is emphasis, not information, so removing it costs nothing
		   and the hits are if anything easier to see. */
		.thread-wrap :global(.tt-hit) {
			animation: none;
			opacity: 1;
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--tl-surface) 70%, transparent),
				0 0 10px 3px color-mix(in srgb, var(--tl-cyan) 72%, transparent);
		}
	}
</style>
