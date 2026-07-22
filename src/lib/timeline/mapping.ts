/**
 * The Thread rail's geometry — pure, framework-free, no DOM.
 *
 * Everything the rail does is a function of ONE number: `p`, the cursor's
 * position along the rail in [0,1]. A density over SCREEN space dips at the
 * cursor and relaxes to 1 far away,
 *
 *     w(t) = 1 - (1 - 1/A) * exp(-((t - p) / sigma)^2)
 *
 * and screen -> document is its normalised integral:
 *
 *     u(s) = INT_0^s w  /  INT_0^1 w
 *
 * Because w is strictly positive everywhere (min w = 1/A > 0 for finite A),
 * u is continuous and STRICTLY INCREASING with u(0) = 0 and u(1) = 1.
 * Therefore sweeping the cursor left to right walks the document forward
 * through every anchor, in order, exactly once — nothing skipped, nothing
 * backwards, nothing unreachable. That property is the whole design, and
 * mapping.test.ts is where it is enforced.
 *
 * du/ds is smallest at the cursor, so the document is stretched there by A —
 * "magnification". Normalising by INT_0^1 w conserves screen width, so
 * magnifying near the cursor necessarily compresses the far field in exactly
 * the right proportion: the squish adapts to the zoom by construction rather
 * than by hand-tuning.
 *
 * DO NOT rewrite the numerics. The trapezoid table, the U[0]=0 / U[N]=1
 * pinning, the shared-table toDoc/toScreen pair and the 36-step bisection in
 * solveP are jointly what give monotonicity and a ~1e-16 round trip.
 */

/* ------------------------------------------------------------------ types */

/**
 * `challenge` is the fourth kind, and unlike the other three it has no lane of
 * its own in `buildModel`: a challenge rides the BAR row like a section, and the
 * rhomboid the rail draws for it comes from the manifest's own challenge rows,
 * positioned at their measured anchors. So this union can grow without the
 * model growing with it — a course with no challenges yet simply has zero rows
 * of this kind and every codepath below degenerates cleanly.
 */
export type TimelineKind = 'part' | 'section' | 'playground' | 'challenge';

/** One row of src/lib/data/timeline-manifest.json (build-time document order). */
export interface TimelineItem {
	id: string;
	kind: TimelineKind;
	/** Rendered heading, or the playground's clever name. */
	title: string;
	/** Banner file name under static/images. Never null — see the inheritance
	 *  pass in scripts/build-timeline.mjs. */
	image: string;
	/** Anchor id that OWNS the thumbnail file this anchor draws. Equals `id` for
	 *  the anchors with their own banner; for the rest it is the section they
	 *  borrow from, so borrowers share one encoded file and one cache entry. */
	thumb: string;
	/** True when the banner is borrowed rather than this anchor's own art. */
	inherited: boolean;
	/** Source component, for debugging. */
	comp: string;
}

/** A manifest item once its scroll offset has been measured. */
export interface PlacedItem extends TimelineItem {
	/** document position, 0..1 of total scrollable height */
	f: number;
}

export interface Tune {
	/** magnification at the cursor while hovering. 1 = no lens (identity mapping). */
	A: number;
	/**
	 * Magnification at rest, before the pointer arrives. Deliberately gentler
	 * than `A`: the rail sits in the header all session, so its resting state
	 * should read as trim rather than as an instrument, and only bloom when
	 * someone actually reaches for it.
	 *
	 * Lowering this is free. Cursor-travel-per-anchor is near-flat in A — the
	 * Gaussian is centred on the cursor and travels with it, so the local
	 * stretch largely cancels for whatever sits under the cursor (measured:
	 * worst-case section travel moves only 4.08px→5.42px across A = 1..12).
	 * Landability comes from the bar row tiling [0,1] and geometric hit
	 * testing, not from the zoom. So A is a cosmetic dial, and the rest/hover
	 * split costs nothing.
	 */
	aRest: number;
	/** lens half-width as a fraction of the RAIL, at the 1/e point. */
	sigma: number;
	/** cumulative-integral resolution. 512–1024 is plenty. */
	samples: number;
	/** glide durations, ms. Geometry never tweens except through `p`. */
	enterMs: number;
	leaveMs: number;
	keyMs: number;
	/** section bar height at full compression / full magnification */
	barMinH: number;
	barMaxH: number;
	/** playground diamond edge at full compression / full magnification */
	pgMin: number;
	pgMax: number;
	/** how close (px) the pointer must be to a diamond to grab it */
	pgGrabPx: number;
}

/**
 * The approved defaults. A = 3.2 with sigma = 0.115 puts roughly a chapter's
 * worth of sections under a lens about 0.27 of the rail wide, and keeps the
 * tightest anchor above 3px of cursor travel at a 760px rail (see
 * mapping.test.ts).
 */
export const TUNE: Tune = {
	A: 3.2,
	aRest: 1.7,
	sigma: 0.115,
	samples: 768,
	enterMs: 180,
	leaveMs: 260,
	keyMs: 170,
	barMinH: 3,
	barMaxH: 15,
	pgMin: 4,
	pgMax: 9.5,
	pgGrabPx: 24
};

/* ------------------------------------------------------------------ utils */

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------------------------------------------------------- mapping */

export interface Mapping {
	p: number;
	A: number;
	sigma: number;
	N: number;
	/** normalising constant, INT_0^1 w */
	Z: number;
	/** cumulative table, U[i] = u(i/N), pinned to U[0]=0 and U[N]=1 */
	U: Float64Array;
	/** screen fraction -> document fraction */
	toDoc(s: number): number;
	/** document fraction -> screen fraction (exact inverse of toDoc) */
	toScreen(u: number): number;
	/** the raw Gaussian bump in [0,1] */
	lens(s: number): number;
	/** normalised local magnification in [0,1]: 0 at the far field, 1 at p */
	mag(s: number): number;
}

/**
 * Build the screen<->document mapping for a cursor at screen fraction `p`.
 *
 * `toDoc` and `toScreen` are exact inverses to sampling precision because both
 * read the SAME cumulative table and both treat u as piecewise-linear in s
 * across a cell.
 */
export function makeMapping(p: number, tune: Tune = TUNE): Mapping {
	// A >= 1 keeps w in (0,1]; A finite keeps min(w) = 1/A strictly positive,
	// which is what makes u invertible. sigma > 0 for the same reason.
	const A = clamp(Number(tune.A) || 1, 1, 256);
	const sigma = clamp(Number(tune.sigma) || 0.001, 0.001, 8);
	const N = Math.round(clamp(Number(tune.samples) || 768, 64, 4096));

	const pc = clamp01(Number(p) || 0);
	const amp = 1 - 1 / A; // in [0,1) — never 1, so w never reaches 0

	function bump(s: number): number {
		const z = (s - pc) / sigma;
		return Math.exp(-z * z);
	}
	function w(s: number): number {
		return 1 - amp * bump(s);
	}

	const h = 1 / N;
	const U = new Float64Array(N + 1);
	let prev = w(0);
	let acc = 0;
	for (let i = 1; i <= N; i++) {
		const cur = w(i * h);
		acc += (prev + cur) * 0.5 * h; // trapezoid
		prev = cur;
		U[i] = acc;
	}
	const Z = acc; // >= 1/A > 0, so the divide is always safe
	for (let i = 0; i <= N; i++) U[i] /= Z;
	U[0] = 0;
	U[N] = 1;

	function toDoc(s: number): number {
		const x = clamp01(s) * N;
		let i = Math.floor(x);
		if (i >= N) i = N - 1;
		const fr = x - i;
		return U[i] + fr * (U[i + 1] - U[i]);
	}

	function toScreen(u: number): number {
		const uc = clamp01(u);
		let lo = 0;
		let hi = N;
		while (hi - lo > 1) {
			const mid = (lo + hi) >> 1;
			if (U[mid] <= uc) lo = mid;
			else hi = mid;
		}
		const d = U[hi] - U[lo];
		return (lo + (d > 0 ? (uc - U[lo]) / d : 0)) / N;
	}

	/**
	 * ds/du = Z/w(s), so the expansion RELATIVE to the far field is exactly
	 * 1/w(s), which runs over [1, A]. Marks are sized by this rather than by the
	 * raw Gaussian so the visual swell always states the truth about the
	 * geometry — in particular A = 1 is a flat, undistorted rail.
	 */
	function mag(s: number): number {
		const d = A - 1;
		if (d <= 1e-9) return 0;
		return (1 / w(s) - 1) / d;
	}

	return { p: pc, A, sigma, N, Z, U, toDoc, toScreen, lens: bump, mag };
}

/**
 * Find the cursor position `p` whose own document position is `target`. Used
 * for the resting lens (sit on the reading head) and for keyboard navigation
 * (sit on the selected item).
 *
 * d(p) = makeMapping(p).toDoc(p) runs 0 -> 1 as p runs 0 -> 1, so a bisection
 * always brackets a root.
 */
export function solveP(target: number, tune: Tune = TUNE): number {
	const t = clamp01(target);
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 36; i++) {
		const mid = (lo + hi) * 0.5;
		if (makeMapping(mid, tune).toDoc(mid) < t) lo = mid;
		else hi = mid;
	}
	return (lo + hi) * 0.5;
}

/* ------------------------------------------------------------------ model */

/** A non-part item with a true document span. */
export interface FlowEntry {
	item: PlacedItem;
	s: number;
	e: number;
}

/** A part header and everything under it. */
export interface PartEntry {
	item: PlacedItem;
	start: number;
	end: number;
	kids: FlowEntry[];
}

/** One drawn bar on the thread (a section, plus any playgrounds after it). */
export interface BarEntry {
	item: PlacedItem;
	s: number;
	e: number;
}

export interface TimelineModel {
	items: PlacedItem[];
	parts: PartEntry[];
	flow: FlowEntry[];
	bars: BarEntry[];
	pgs: FlowEntry[];
	/** item id -> index into `parts` */
	partOf: Map<string, number>;
	/** keyboard navigation order (every non-part item) */
	navList: PlacedItem[];
	indexOfId: Map<string, number>;
	barAt(u: number): BarEntry;
	partAt(u: number): PartEntry;
	/** document centre of an item, for parking the lens on it */
	docCentreOf(id: string): number;
}

/**
 * Fold the flat manifest into the rail's three lanes.
 *
 * The part-header rule: a part gets NO span of its own. Its scroll span
 * belongs to the item that follows it, and the part marker pins to that
 * segment's leading edge. Without this, every part header would steal a sliver
 * of the thread from its own first section and the markers would sit a hair
 * to the right of the boundaries they name.
 *
 * The bar row then TILES [0,1] with no gap at either end: hit-testing is by
 * containment, so a sliver of unclaimed document would fall through to the
 * wrong bar rather than merely look wrong.
 */
export function buildModel(items: PlacedItem[]): TimelineModel {
	const parts: PartEntry[] = [];
	const partOf = new Map<string, number>();
	const flow: FlowEntry[] = [];

	let pendingStart: number | null = null;
	let cur = -1;
	for (const it of items) {
		if (it.kind === 'part') {
			cur = parts.length;
			const start: number = pendingStart === null ? it.f : pendingStart;
			parts.push({ item: it, start, end: 1, kids: [] });
			pendingStart = start;
			partOf.set(it.id, cur);
		} else {
			const s = pendingStart !== null ? pendingStart : it.f;
			pendingStart = null;
			const entry: FlowEntry = { item: it, s, e: it.f };
			flow.push(entry);
			partOf.set(it.id, cur);
			if (cur >= 0) parts[cur].kids.push(entry);
		}
	}
	for (let i = 0; i < flow.length - 1; i++) flow[i].e = flow[i + 1].s;
	if (flow.length) {
		flow[0].s = 0;
		flow[flow.length - 1].e = 1;
	}
	for (let i = 0; i < parts.length; i++) {
		parts[i].end = i + 1 < parts.length ? parts[i + 1].start : 1;
		if (parts[i].kids.length) parts[i].start = parts[i].kids[0].s;
	}
	if (parts.length) parts[0].start = 0;

	// One bar per section; a playground's scroll span joins the bar before it,
	// so the bar row tiles [0,1] with no gaps and no overlaps.
	const bars: BarEntry[] = [];
	for (const f of flow) {
		if (f.item.kind === 'section' || !bars.length) bars.push({ s: f.s, e: f.e, item: f.item });
		else bars[bars.length - 1].e = f.e;
	}
	const pgs = flow.filter((f) => f.item.kind === 'playground');

	const navList = flow.map((f) => f.item);
	const indexOfId = new Map(navList.map((it, i) => [it.id, i]));

	function barAt(u: number): BarEntry {
		for (let i = 0; i < bars.length; i++) if (u >= bars[i].s && u < bars[i].e) return bars[i];
		return bars[bars.length - 1];
	}
	function partAt(u: number): PartEntry {
		for (let i = parts.length - 1; i >= 0; i--) if (u >= parts[i].start) return parts[i];
		return parts[0];
	}
	function docCentreOf(id: string): number {
		const b = bars.find((x) => x.item.id === id);
		if (b) return (b.s + b.e) / 2;
		const f = flow.find((x) => x.item.id === id);
		return f ? f.item.f : 0;
	}

	return {
		items,
		parts,
		flow,
		bars,
		pgs,
		partOf,
		navList,
		indexOfId,
		barAt,
		partAt,
		docCentreOf
	};
}

/* ----------------------------------------------------------- mark layout */

/** Lane boundaries and the vertical anchor, in px from the top of the rail. */
export const LANE_PG = 17; // above this line the pointer is asking about playgrounds
export const LANE_PART = 34; // below this line it is asking about chapters
export const PG_BASE = 14; // diamonds bottom-anchor here at full magnification
export const CY = 24; // the thread's own centre line
export const RAIL_H = 48;

export interface BarMark {
	x: number;
	w: number;
	h: number;
	top: number;
	/** midpoint in px, where the label wants to sit */
	mid: number;
	/** normalised local magnification at the bar's midpoint, in [0,1] */
	k: number;
	/** below ~5.5px a diagonal hatch is just noise — drop to a clean two-tone */
	tiny: boolean;
	/** does the reading head sit inside this bar? */
	active: boolean;
	/** width of the green fill, or 0 when inactive */
	headW: number;
}

export interface PgMark {
	x: number;
	size: number;
	top: number;
	stemH: number;
	/** centre in px, for the grab test and the card arrow */
	cx: number;
}

/** The vertical geometry of ONE activity mark at a given local magnification. */
export interface LaneMark {
	/** the mark's edge length in px */
	size: number;
	/**
	 * The mark's INNER edge — the side facing away from the thread — as a
	 * distance in px from the top of the rail, for the lane above. The
	 * playground square is bottom-anchored here; the challenge lane mirrors it
	 * about `CY` and anchors its top vertex at `2 * CY - base`.
	 */
	base: number;
	/** the connector from the bar's edge to the mark's edge */
	stemH: number;
}

/**
 * The vertical geometry of an activity mark, from its local magnification.
 *
 * BOTH lanes go through here, and that is the point. The playground lane uses
 * it as written (square above the thread, bottom-anchored at `base`); the
 * challenge lane mirrors `base` about `CY` and hangs the same `stemH`
 * downward. That is the whole of "a challenge sits as far below the thread as
 * a playground sits above it", and because `size`, `base` and `stemH` are all
 * functions of `k`, the two lanes breathe with the lens identically instead of
 * one of them being pinned to a constant.
 *
 * Compressed marks sit CLOSER to the thread on a short stem; as the lens
 * reaches them they lift into their own lane, and the stem shortens again
 * because the bar has grown to meet them.
 */
export function laneMark(k: number, tune: Tune = TUNE): LaneMark {
	const size = tune.pgMin + (tune.pgMax - tune.pgMin) * k;
	const base = PG_BASE + 3 - 3 * k;
	const hLocal = tune.barMinH + (tune.barMaxH - tune.barMinH) * k;
	return { size, base, stemH: Math.max(1, CY - hLocal / 2 - base) };
}

/**
 * The diamond's edge as a fraction of the square's, and its floor in px.
 * See `challengeMark`.
 */
export const CH_RATIO = 0.8;
export const CH_MIN = 4.6;

/** The drawn geometry of one challenge rhomboid. */
export interface ChMark {
	/** the unrotated square's edge — what goes on width/height */
	edge: number;
	/** half the diagonal: the diamond's real half-height */
	half: number;
	/** y of the TOP VERTEX, the point the eye reads as the mark's edge */
	vertex: number;
	/** y of the element box's top, i.e. `vertex + (half - edge/2)` */
	top: number;
	/** the connector up to the thread — identical to the playground's */
	stemH: number;
}

/**
 * A challenge mark: the playground lane's geometry, mirrored about the thread.
 *
 * The top VERTEX sits as far below `CY` as the square's top edge (`base`) sits
 * above it, and the stem is the same length. That is the whole answer to "the
 * playground markers are closer to the timeline than the challenges" and to
 * "under the magnifier the challenges don't change their Y position" — both
 * were symptoms of this lane having its own constants instead of being a
 * reflection of the one above.
 *
 * The diamond's EDGE is `CH_RATIO` of the square's rather than equal to it: a
 * square rotated 45° measures edge * √2 across, so an equal edge would draw a
 * mark 41% wider than its neighbour and, at full magnification, push the lowest
 * vertex to y 49.6 on a 48px rail. 0.80 leaves it 1.13x the square across and
 * 46.4 at its lowest. `CH_MIN` floors it where the ratio alone would give a
 * ~3.6px edge that cannot survive its own 1px outline; it binds below k = 0.21
 * only.
 */
export function challengeMark(k: number, tune: Tune = TUNE): ChMark {
	const g = laneMark(k, tune);
	const edge = Math.max(CH_MIN, g.size * CH_RATIO);
	const half = edge * Math.SQRT1_2;
	const vertex = 2 * CY - g.base;
	return { edge, half, vertex, top: vertex + (half - edge / 2), stemH: g.stemH };
}

export interface MarkLayout {
	bars: BarMark[];
	pgs: PgMark[];
	/** the lens swell: width and left edge in px */
	glowW: number;
	glowX: number;
	/** the green reading head, px */
	headX: number;
}

/** Allocate a layout buffer sized for `model`, reused across every frame. */
export function makeLayout(model: TimelineModel): MarkLayout {
	return {
		bars: model.bars.map(() => ({
			x: 0,
			w: 0,
			h: 0,
			top: 0,
			mid: 0,
			k: 0,
			tiny: false,
			active: false,
			headW: 0
		})),
		pgs: model.pgs.map(() => ({ x: 0, size: 0, top: 0, stemH: 0, cx: 0 })),
		glowW: 0,
		glowX: 0,
		headX: 0
	};
}

/**
 * Compute every mark's pixel geometry for one frame, writing into `out`.
 *
 * Pure and allocation-free by design: this runs on every pointermove, and the
 * component's job afterwards is only to copy numbers onto `.style`. Sizes come
 * from `map.mag`, the NORMALISED magnification, so the visual swell always
 * corresponds to a real zoom.
 */
export function layoutMarks(
	model: TimelineModel,
	map: Mapping,
	W: number,
	position: number,
	out: MarkLayout,
	tune: Tune = TUNE
): MarkLayout {
	const toScreen = map.toScreen;
	const hRange = tune.barMaxH - tune.barMinH;

	out.glowW = Math.max(24, tune.sigma * 3.4 * W);
	out.glowX = map.p * W - out.glowW / 2;
	out.headX = toScreen(clamp01(position)) * W;

	for (let i = 0; i < model.bars.length; i++) {
		const b = model.bars[i];
		const x1 = toScreen(b.s) * W;
		const x2 = toScreen(b.e) * W;
		const raw = x2 - x1;
		const mid = (x1 + x2) / 2;
		const k = map.mag(mid / W);
		const h = tune.barMinH + hRange * k;
		// The inter-bar gap fades out as bars compress, so the row closes into
		// one continuous thread instead of dissolving into dashes.
		const gap = clamp((raw - 4) * 0.28, 0, 2);
		const w = Math.max(0.6, raw - gap);
		const m = out.bars[i];
		m.x = x1;
		m.w = w;
		m.h = h;
		m.top = CY - h / 2;
		m.mid = mid;
		m.k = k;
		// Keyed off bar HEIGHT, i.e. off the lens itself, so the hatch/two-tone
		// changeover is one smooth radial boundary rather than a scatter of
		// per-bar decisions.
		m.tiny = h < 5.5;
		m.active = position >= b.s && position < b.e;
		m.headW = m.active ? clamp(((position - b.s) / (b.e - b.s)) * w, 2, w) : 0;
	}

	for (let i = 0; i < model.pgs.length; i++) {
		const x = toScreen(model.pgs[i].item.f) * W;
		// Shared with the challenge lane — see `laneMark`. The square is
		// bottom-anchored at `base`, so it grows UPWARD away from the thread.
		const g = laneMark(map.mag(x / W), tune);
		const m = out.pgs[i];
		m.cx = x;
		m.x = x - g.size / 2;
		m.size = g.size;
		m.top = g.base - g.size;
		m.stemH = g.stemH;
	}

	// De-clutter the playground lane. Some anchors sit close enough in the
	// document to overlap on the rail — `rebase-merge`/`interactive-rebase`
	// back-to-back in 5.2, `reflog-rescue`/`bisect` in 4.9 — so their diamonds
	// collide into one smudge at rest. Push overlapping neighbours apart in
	// SCREEN space with a
	// single left-to-right pass: it is O(n), continuous in the lens (the shift
	// is `max(0, minGap − naturalGap)`, so nothing snaps as you sweep), and the
	// nudge is a couple of px — far inside `pgGrabPx`, and `pick()` reads the
	// true document position, so the hit test still lands on the right one. Draw
	// only; the manifest offset that navigation and heat use is untouched.
	for (let i = 1; i < out.pgs.length; i++) {
		const prev = out.pgs[i - 1];
		const cur = out.pgs[i];
		const minGap = (prev.size + cur.size) / 2 + 1.5;
		if (cur.cx - prev.cx < minGap) {
			cur.cx = prev.cx + minGap;
			cur.x = cur.cx - cur.size / 2;
		}
	}

	return out;
}

/* ------------------------------------------------------------ hit testing */

/**
 * What is the pointer asking about? Marks are pointer-events:none and the whole
 * rail is one hit surface, so the target is computed from the MAPPING rather
 * than from the pixel extent of a DOM node. That is what makes the sweep exact:
 * an item half a pixel wide out in the compressed tail is selected the instant
 * the cursor's document position enters it — and by then the lens has already
 * magnified it.
 *
 * Returns an item id, or `part:<index>` for the chapter lane.
 */
export function pick(
	model: TimelineModel,
	map: Mapping,
	W: number,
	x: number,
	y: number,
	tune: Tune = TUNE
): string {
	const u = map.toDoc(clamp01(x / W));
	if (y < LANE_PG) {
		let best: FlowEntry | null = null;
		let bd = Infinity;
		for (const f of model.pgs) {
			const d = Math.abs(map.toScreen(f.item.f) * W - x);
			if (d < bd) {
				bd = d;
				best = f;
			}
		}
		// The diamonds are deliberately small; a generous grab radius is what
		// keeps them clickable at ~3px of cursor travel each.
		if (best && bd <= tune.pgGrabPx) return best.item.id;
	}
	if (y >= LANE_PART) return 'part:' + model.parts.indexOf(model.partAt(u));
	return model.barAt(u).item.id;
}

/* ----------------------------------------------------------------- labels */

/** "2.3" / "what" / the playground's name — the short form on the rail. */
export function shortLabel(it: TimelineItem): string {
	if (it.kind === 'playground') return it.title || it.id;
	const m = /^section-(.+)$/.exec(it.id);
	// A section anchor without a `section-N-M` id has no numeric path. Fall
	// back to the rendered title rather than the slug — printing a raw id
	// between "2.1" and "2.2" reads as a bug in a strip that is otherwise all
	// chapter numbers.
	if (!m) return it.title || it.id;
	if (m[1].startsWith('intro-')) return m[1].slice(6);
	return m[1].replace(/-/g, '.');
}

export function partLabel(it: TimelineItem | undefined): string {
	if (!it) return '';
	if (it.id === 'hero') return 'Introduction';
	const n = /(\d+)/.exec(it.id);
	return n ? 'Part ' + n[1] : it.title || it.comp;
}

/** The long form for the hover card and the screen-reader announcement. */
export function longLabel(it: TimelineItem): string {
	if (it.kind === 'part') return partLabel(it);
	if (it.title && it.title !== it.id) return it.title;
	const s = shortLabel(it);
	if (/^\d/.test(s)) return 'Section ' + s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}
