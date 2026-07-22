/**
 * Dwell tracking: how long the reader actually spent at each place in the
 * document, turned into a per-bar heat gradient on the Thread rail.
 *
 * This replaces "did you scroll past it" with "did you stay". The old binary
 * signal marked every section read on one flick to the bottom; the measure
 * here cannot be faked that way, because a fling deposits time proportional to
 * how long the fling took, which is nothing.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE NUMBERS COME FROM, AND THE ONE PLACE TWO SPECS DISAGREED
 *
 * Two design passes produced parameters for this. They are reconciled here, and
 * the reconciliation is not an average — averaging two calibrations produces a
 * third that neither pass validated.
 *
 *  - GRANULARITY: 16 buckets per bar, spanning that bar's own document extent.
 *    Section-relative, never pixel-absolute. A browser resize, a web font
 *    landing, a Mermaid diagram mounting mid-scroll and a new part being added
 *    all move every absolute offset in the document; under a global pixel grid
 *    each of those is data loss, and the first three happen routinely. Under
 *    section-relative buckets none of them touches a stored byte — the geometry
 *    table is rebuilt and the same bucket indices simply point at new pixels.
 *
 *  - EXPECTED TIME: `dwell-calibration.json`, the per-anchor dataset, rather
 *    than word count alone. Prose is only a fifth of this page; the rest is
 *    figures, code blocks and playgrounds. A word-count model demands near-zero
 *    dwell exactly where a learner lingers longest, which is the current bug
 *    wearing a new hat.
 *
 *  - CONCAVITY: ONE PER AXIS, and the two axes now each hold theirs in the
 *    obvious place. On time -> heat it is `heatGamma`. On heat -> colour it is
 *    nothing at all: `chromaGamma` is 1 and the ramp is linear.
 *
 *    This is a REVERSAL of the original choice, and the reversal is the fix.
 *
 *    The two competing specs both proposed a concavity on the time axis —
 *    "saturate at 70% of modelled time" and `heat = (dwell/expected)^0.7` — and
 *    the first was picked because it is the more sayable sentence. But they are
 *    not interchangeable, and the difference is precisely the complaint this
 *    file exists to answer. A saturation fraction is a CLIP POINT: it scales the
 *    ratio uniformly and then flattens the top. It cannot change the SHAPE near
 *    zero, and the shape near zero is the entire problem — "a skim leaves
 *    nothing, and then it goes dark" is a description of a curve that is too
 *    straight at the bottom and clipped at the top, which is exactly what a clip
 *    point gives you.
 *
 *    So the roles swap. `saturateAt` goes to 1.0 — the deliberately-disabled
 *    knob, meaning only "a full read is the modelled time, no more, no less" —
 *    and `heatGamma` carries the concavity. See its note for the shipped table.
 *
 * ---------------------------------------------------------------------------
 * THE DEAD ZONE HAD TWO HALVES, AND THE CURVE WAS THE SMALLER ONE
 *
 * Measured on a production build, fresh profile, 1440x900, wheel-scrolled at
 * a real wall clock, reading back the tracker's own stored seconds:
 *
 *     skim @  700 px/s   276s of scrolling   every bar touched, median 4.4s
 *     skim @ 1500 px/s   158s of scrolling   5 bars touched, median 0.25s
 *
 * The second row is a reader "just casually skimming through". Two and a half
 * minutes of continuous scrolling deposited SIX SECONDS total and left nearly
 * every bar at literally zero — not a faint mark, no mark. That is not the
 * curve being shy; that is `maxVelocityPxPerSec` being a cliff at 900 and
 * rejecting the whole traverse. A cliff cannot be softened by tuning what is
 * on the far side of it, which is why passes at the curve alone cannot land.
 *
 * So the gate becomes a RAMP rather than a wall (`readingVelocityPxPerSec` ->
 * `maxVelocityPxPerSec`), and the curve becomes concave. The first change
 * removes the hard edge; the second makes the seconds that survive it visible.
 *
 * ---------------------------------------------------------------------------
 * ALL TUNING LIVES IN `DWELL`. Nothing else in this file holds a magic number.
 */

import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { migrateSections, progress } from '$lib/data/progress';
import calibration from './dwell-calibration.json';
import type { TimelineModel } from './mapping';

/* ------------------------------------------------------------------ knobs */

/**
 * Every tunable in the dwell model, in one object, so the next round of
 * adjustment is a single edit here rather than a hunt through the file.
 */
export const DWELL = {
	/**
	 * Bins per bar. ONE — a section is a single flat colour, not a gradient.
	 *
	 * It was 16, and the gradient inside each bar is what made the rail read as
	 * "too busy": dozens of bars each carrying their own little ramp is dozens
	 * of pictures competing at 6px tall, and the eye cannot rank them anyway. A
	 * section is the unit the reader thinks in, so it is the unit the colour
	 * describes.
	 *
	 * The code is generic over this, so 1 is not a special case — it is the
	 * same machinery with the finest granularity the design actually wants.
	 * Collapsing it also removes a whole bug class for free: with no gradient
	 * there is no per-bar background-position, and so nothing that can slide
	 * out of register when the lens changes a bar's width.
	 */
	bucketsPerBar: 1,

	/**
	 * Fraction of modelled reading time that counts as a full read.
	 *
	 * 1.0: OFF. This is the disabled knob now — see the header for why the
	 * concavity moved off it and onto `heatGamma`. It survives because it still
	 * says something a tuner might want to change ("a full read is 85% of the
	 * modelled time, because our model is slow") and because `free` is scaled by
	 * it in lockstep with `target`, so a completed playground saturates exactly
	 * whatever this is set to.
	 */
	saturateAt: 1,

	/**
	 * THE concavity on the time->heat axis. 1 = linear; lower lifts the low end
	 * and compresses the top.
	 *
	 * 0.26, and it is deliberately strong, because the requirement is "a skim
	 * must leave a visible mark on the first pass" and a skim deposits SECONDS
	 * against a bar modelled in MINUTES. On the median bar (258s modelled):
	 *
	 *     dwell   what that is                heat   LUT lvl
	 *      0.8s   a fling's landing tail      0.078   cold
	 *      1.5s   one pause                   0.221    4
	 *      4.4s   MEASURED: one 700px/s skim  0.347    6
	 *       15s   a proper glance             0.477    8
	 *       60s   reading a quarter of it     0.684   11
	 *      180s   most of a real read         0.910   15
	 *      258s   the full modelled read      1.000   16
	 *
	 * Read the right-hand column as the thing that matters: a skim is six of the
	 * seventeen available levels, and a full read is seventeen. The gap is real
	 * and legible, but the FIRST pass is already a third of the way up — there is
	 * no stretch of the curve where effort buys nothing, which is the definition
	 * of the dead zone that was being complained about.
	 *
	 * The cost, stated plainly: the top of the curve is compressed, so the last
	 * two minutes of a read move the colour less than the first fifteen seconds
	 * do. That is the trade the owner asked for — softer and more giving, at the
	 * price of resolution at the hot end.
	 */
	heatGamma: 0.26,

	/**
	 * Chroma shaping on the heat->colour axis. 1 = linear, i.e. OFF.
	 *
	 * It was 0.75, front-loading the chroma so that the first seconds of a read
	 * were visible at all. That job now belongs to `heatGamma`, which does it on
	 * the axis where it is actually a measurement question rather than a display
	 * trick. Leaving both on would stack them again — heat 0.35 would paint like
	 * heat 0.45 — and the rail would come back loud.
	 */
	chromaGamma: 1,

	/**
	 * Seconds over which a brand-new mark fades in from nothing.
	 *
	 * A strongly concave curve has a near-vertical start: at gamma 0.26 a tenth
	 * of a second of dwell would otherwise paint at 0.13, so any stray sliver
	 * anywhere would show. This is the noise gate that stops that, and it is NOT
	 * a third concavity — it is a smoothstep confined to the first two seconds,
	 * multiplying the curve rather than reshaping it, and it is 1.0 everywhere
	 * above.
	 *
	 * It also does something unplanned and better than the thing it was added
	 * for. Because it gates on a bar's OWN accumulated seconds, and a neighbour
	 * receives only a fraction of each deposit, the bleed below reaches further
	 * the longer you stay: a 4s skim bleeds nothing, a 40s read warms its two
	 * immediate neighbours, a 120s read reaches two out on each side. The wash
	 * widens with attention instead of being a fixed-width smear.
	 */
	markKneeSeconds: 2,

	/** No bucket expects less than this, so a near-empty one cannot pop hot. */
	minBucketSeconds: 3,

	/**
	 * The velocity ramp. At or below `readingVelocityPxPerSec` a second of wall
	 * clock deposits a full second; at or above `maxVelocityPxPerSec` it deposits
	 * nothing; between them it falls off as `t ** velocityFalloff`.
	 *
	 * This used to be one number and a hard rejection at 900px/s, and that cliff
	 * was the larger half of the dead zone — see the header for the measurement.
	 * The reader gets no feedback about where the cliff is, so crossing it feels
	 * like the feature intermittently not working, which is precisely how it was
	 * described.
	 *
	 * The three numbers, and what each is anchored to:
	 *
	 *  - 650 px/s is a viewport (852px under the header) every 1.3 seconds. That
	 *    is the pace of the measured skim that accrued cleanly under the old
	 *    gate, so full credit at or below it changes nothing that already worked.
	 *
	 *  - 2200 px/s is a viewport every 0.39s. Nobody takes anything in at that
	 *    rate, so it is the honest zero.
	 *
	 *  - the 1.5 exponent bends the ramp toward the slow end, so the credit lost
	 *    in the first slice above reading pace is small. At 1000px/s — brisk, but
	 *    a reader could still be tracking headings — credit is 0.68.
	 *
	 * THE FLING IS UNAFFECTED, and this is the invariant to check first if these
	 * numbers move. A throw to the bottom of this document runs at tens of
	 * thousands of px/s, an order of magnitude past the zero point, and the
	 * trailing-window velocity stays there for a full `velocityWindowMs` after it
	 * lands. Verified after the change: a 40-notch fling left all but one bar at
	 * exactly zero seconds.
	 */
	readingVelocityPxPerSec: 650,
	maxVelocityPxPerSec: 2200,
	velocityFalloff: 1.5,

	/**
	 * Spatial softness: what fraction of a deposit lands on the SECTION either
	 * side, relative to the section actually being read. `neighbourReach` is how
	 * many sections out the kernel extends, each step multiplying by the bleed
	 * again — so 0.1 and 2 give weights 0.01 : 0.1 : 1 : 0.1 : 0.01.
	 *
	 * This is what turns marks into a wash. It is a different mechanism from
	 * `kernelFloor` below, and the two are easy to confuse: that one is
	 * ATTRIBUTION (how a second is split among the bars physically on screen, and
	 * it is a fact about eyes), this one is DEPOSIT (how a second, once
	 * attributed, is allowed to smear into the neighbourhood, and it is a
	 * deliberate softening of the truth).
	 *
	 * Normalised before use, so the total deposited is unchanged: bleeding is
	 * redistribution, never creation. That is what keeps the fling cold — a
	 * kernel over zero is still zero.
	 *
	 * 0.1 is low and the strong `heatGamma` is why. Gamma compresses ratios, so a
	 * neighbour holding a tenth of the deposit paints at roughly half the heat of
	 * the source, not a tenth. Measured on a 40s read of one section, in heat:
	 *
	 *     0.013   0.321   0.585   0.321   0.013
	 *
	 * which is a gradient across five sections off a single stationary read. A
	 * larger bleed here does not make it softer, it makes it uniform.
	 */
	neighbourBleed: 0.1,
	neighbourReach: 2,

	/**
	 * The window the velocity above is measured over, as NET DISPLACEMENT from
	 * where the reader was `velocityWindowMs` ago to where they are now.
	 *
	 * This is the load-bearing knob, and getting it wrong killed the feature.
	 * Velocity used to be sampled across one `sampleMs` tick, which made the real
	 * gate "never advance more than 900 x 0.25 = 225px between two samples".
	 * Discrete scrolling is inherently bursty — a wheel notch and a PageDown are
	 * teleports, not motion — so every notch over 225px tripped the cap, reset
	 * the settle timer, and the reader accrued nothing at all. Measured on the
	 * production build, 60s of steady reading at a 1200ms cadence:
	 *
	 *     100px burst ( 70 px/s avg) -> 53.3s accrued (87%)
	 *     200px burst (155 px/s avg) -> 41.8s accrued (69%)
	 *     300px burst (239 px/s avg) ->  2.3s accrued ( 4%)   <- cliff at 225px
	 *     PageDown    (618 px/s avg) ->  2.3s accrued ( 4%)
	 *
	 * Note what the cliff is NOT about: the 300px reader is slower on average
	 * than plenty of readers who accrued fine. It is burst size, not speed. A
	 * keyboard reader therefore accrued nothing, ever.
	 *
	 * Over a 1s window a wheel notch is what it actually is — a small net move —
	 * while a genuine fling still reads as thousands of px/s and is still
	 * rejected, for as long as it takes the window to slide past it.
	 */
	velocityWindowMs: 1000,

	/**
	 * Velocity must have been under the cap continuously for this long before a
	 * bucket accrues.
	 *
	 * 400ms, down from 1500ms. The 1500ms choice was justified against "an
	 * inertial fling's deceleration tail", but the tail is already killed by the
	 * velocity cap, which stays over the cap for the whole window it is smeared
	 * across. What 1500ms actually taxed was the ordinary wheel notch: its stated
	 * cost — "an attentive reader losing 1.5s per stop" — is immaterial only if
	 * stops are rare, and a reader stops roughly every 1.2s, so the cost was not
	 * a fraction of accrual, it was all of it.
	 */
	settleMs: 400,

	/** No scroll, pointer or key in this long and accrual stops until one lands. */
	idleMs: 120_000,

	/** Sample period. Meaningful resolution here is seconds, so 4Hz is plenty. */
	sampleMs: 250,

	/** A throttled tab must not deposit a lump on the way back. */
	maxTickMs: 400,

	/** Stored dwell caps here, as a multiple of the saturation target. */
	runawayFactor: 2,

	/**
	 * Viewport attribution kernel: weight at the very edge of the viewport,
	 * ramping to 1 across `kernelRamp` of it. Eyes are not uniform over a
	 * screenful — the bottom strip is "coming up" and the top is "just
	 * finished" — but a floor well above zero is required, because any strongly
	 * non-uniform kernel stripes under keyboard paging (a bucket that lands on a
	 * viewport edge on every single stop is never once in the plateau).
	 */
	kernelFloor: 0.45,
	kernelRamp: 0.2,

	/**
	 * Heat given to sections an existing reader had already visited.
	 *
	 * This is a HEAT, not a fraction of target, and the distinction started
	 * mattering with `heatGamma`. It used to be read as "seed dwell to half the
	 * target"; under a 0.26 gamma half the target paints at 0.83, so the same
	 * line would have back-filled every previously-visited section to nearly
	 * full. `seedFromBinaryProgress` inverts the curve instead, so this number is
	 * the thing you can actually see.
	 */
	seedHeat: 0.45,

	/** Trailing flush to localStorage. Also flushed on hide and pagehide. */
	flushMs: 20_000,

	/**
	 * Below this mean heat a bar is "never been here" and keeps the hatch.
	 *
	 * 0.08, up from 0.04, and the raise is a beauty decision rather than a
	 * measurement one. Hatch-to-no-hatch is the single loudest step on the rail —
	 * far louder than any two adjacent LUT levels — so it should be the step that
	 * is hardest to trip. Under the shipped curve this asks for a little under a
	 * second of genuine dwell before a bar stops being hatched, which the
	 * velocity ramp already guarantees a fling cannot supply.
	 */
	coldBelow: 0.08,

	/** Below this bar width a gradient is indistinguishable from its own mean. */
	gradientMinPx: 8,

	/** Publish a repaint every Nth sample. 4 x 250ms = 1Hz. */
	publishEvery: 4
};

/* ---------------------------------------------------------------- storage */

// MIRRORS `DWELL_STORAGE_KEY` in progress.ts: resetAllLearningState() clears
// this exact key, and the two files must never disagree about its name.
const STORAGE_KEY = 'gitvibes-dwell-v1';

/**
 * MIRRORS `CURRENT_VERSION` in progress.ts. Bump both together: dwell is keyed
 * by exactly the same section ids as `progress.sections`, and runs through the
 * same `migrateSections` rename chain, so a version skew here silently points
 * one map's data at the other map's ids.
 */
const DWELL_VERSION = 1;

/** 50ms quantum, 12 bits, two base64 chars per bucket. */
const QUANTUM = 0.05;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MAX_UNITS = 4095;

function encodeBuckets(v: Float64Array): string {
	let out = '';
	for (let i = 0; i < v.length; i++) {
		const u = Math.min(MAX_UNITS, Math.max(0, Math.round(v[i] / QUANTUM)));
		out += B64[u >> 6] + B64[u & 63];
	}
	return out;
}

function decodeBuckets(s: string, n: number): Float64Array {
	const out = new Float64Array(n);
	for (let i = 0; i < n && i * 2 + 1 < s.length; i++) {
		const hi = B64.indexOf(s[i * 2]);
		const lo = B64.indexOf(s[i * 2 + 1]);
		if (hi < 0 || lo < 0) continue;
		out[i] = ((hi << 6) | lo) * QUANTUM;
	}
	return out;
}

interface StoredDwell {
	version: number;
	seeded: boolean;
	d: Record<string, string>;
}

function loadStored(): StoredDwell {
	const empty: StoredDwell = { version: DWELL_VERSION, seeded: false, d: {} };
	if (!browser) return empty;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return empty;
		const parsed = JSON.parse(raw) as Partial<StoredDwell>;
		return {
			version: DWELL_VERSION,
			seeded: parsed.seeded === true,
			// The dwell map is keyed by the same ids as progress.sections, so a
			// curriculum reorder must rewrite it identically. Reusing that
			// function rather than copying the tables is what stops the two maps
			// drifting apart: a reordering that updates one necessarily updates
			// the other.
			d: migrateSections(parsed.d ?? {}, parsed.version ?? 0)
		};
	} catch {
		return empty;
	}
}

/* ------------------------------------------------------------------ model */

const CALIB = calibration.anchors as Record<string, number>;

interface BarState {
	id: string;
	/** Document order. The axis `neighbourBleed` spreads along. */
	i: number;
	s: number;
	e: number;
	/** modelled seconds to saturate, per bucket */
	target: Float64Array;
	/** measured seconds, per bucket */
	dwell: Float64Array;
	/** seconds credited outright by a completed activity, per bucket */
	free: Float64Array;
	/** last published heat, quantised to LUT levels, for dirty detection */
	published: Int8Array;
}

export interface DwellTracker {
	/** (Re)build the geometry table. Safe to call on every re-measure. */
	setModel(model: TimelineModel): void;
	/** Heat per bucket for one bar, or null if unknown. Values in [0,1]. */
	heatOf(id: string): Float64Array | null;
	/** Mean heat for one bar, in [0,1]. */
	meanHeat(id: string): number;
	/** Called with the bar ids whose rendered heat changed. */
	subscribe(fn: (dirty: string[]) => void): () => void;
	destroy(): void;
}

/**
 * Distribute one anchor's modelled seconds across a bar's buckets.
 *
 * The anchor owns a document span and its cost is spread uniformly across it;
 * the bar's buckets are a second partition of the same axis. So this is an
 * overlap integral, which is what keeps an anchor that straddles a bucket
 * boundary from being counted twice or dropped.
 */
function spread(out: Float64Array, barS: number, barE: number, s: number, e: number, secs: number) {
	const span = e - s;
	if (span <= 0 || secs <= 0) return;
	const n = out.length;
	const bw = (barE - barS) / n;
	if (bw <= 0) return;
	const density = secs / span;
	for (let k = 0; k < n; k++) {
		const ks = barS + bw * k;
		const overlap = Math.min(e, ks + bw) - Math.max(s, ks);
		if (overlap > 0) out[k] += overlap * density;
	}
}

/** Hermite ease, 0 at 0 and 1 at 1 with zero slope at both ends. */
function smoothstep(x: number): number {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	return x * x * (3 - 2 * x);
}

/**
 * How much of a second of wall clock counts, at this scroll speed. See the note
 * on `readingVelocityPxPerSec`.
 */
function velocityCredit(v: number): number {
	const { readingVelocityPxPerSec: lo, maxVelocityPxPerSec: hi, velocityFalloff } = DWELL;
	if (v <= lo) return 1;
	if (v >= hi) return 0;
	return Math.pow((hi - v) / (hi - lo), velocityFalloff);
}

/**
 * The normalised bleed kernel, centred: `[b^r, ..., b, 1, b, ..., b^r] / sum`.
 * Built once — it depends only on constants.
 */
const BLEED = (() => {
	const r = Math.max(0, DWELL.neighbourReach);
	const w: number[] = [];
	for (let i = -r; i <= r; i++) w.push(Math.pow(DWELL.neighbourBleed, Math.abs(i)));
	const sum = w.reduce((a, x) => a + x, 0);
	return w.map((x) => x / sum);
})();

export function createDwellTracker(): DwellTracker {
	const bars = new Map<string, BarState>();
	/** The same states in document order, so the bleed has an axis to walk. */
	let order: BarState[] = [];
	const listeners = new Set<(dirty: string[]) => void>();
	const stored = loadStored();
	let seeded = stored.seeded;
	/** scenarioId -> completed, from the progress store */
	let completed: Record<string, unknown> = {};
	let model: TimelineModel | null = null;

	/**
	 * The binary progress AS IT WAS WHEN THIS SESSION STARTED — a snapshot, not a
	 * live read, and that distinction is the whole correctness of the back-fill.
	 *
	 * The scroll-spy writes `progress.sections` continuously while the reader
	 * moves, including on a fling. Seeding from a live subscription therefore
	 * meant the first sections the spy happened to mark IN THIS SESSION got
	 * back-filled to half heat — so one flick to the bottom would light the rail,
	 * which is precisely the bug dwell tracking exists to remove. Measured: a
	 * 40-step fling through a fresh profile seeded a section to 3.4s in all
	 * sixteen buckets without the reader having read a word of it.
	 *
	 * A snapshot cannot do that. Anything already in localStorage was written
	 * before this page load, so it is genuine history; anything the spy writes
	 * from here on has to be earned by dwelling.
	 */
	const seedSource: Record<string, unknown> = browser ? { ...get(progress).sections } : {};

	/* -- geometry ---------------------------------------------------------- */

	function setModel(next: TimelineModel) {
		model = next;
		rebuildTargets();
	}

	function rebuildTargets() {
		if (!model) return;
		const m = model;
		const N = DWELL.bucketsPerBar;

		// A part header has no span of its own — buildModel hands it to the item
		// that follows — but the dataset shows real prose living under part
		// anchors (part intros, the opening Callout). That prose physically sits
		// at the top of the following item's span, so its cost is attributed
		// there. Ignoring it would under-charge the first bucket of every part.
		const bonus = new Map<string, number>();
		for (const p of m.parts) {
			const secs = CALIB[p.item.id];
			const first = p.kids[0];
			if (secs && first) bonus.set(first.item.id, (bonus.get(first.item.id) ?? 0) + secs);
		}

		const seen = new Set<string>();
		order = [];
		for (const b of m.bars) {
			seen.add(b.item.id);
			let st = bars.get(b.item.id);
			if (!st) {
				st = {
					id: b.item.id,
					i: 0,
					s: b.s,
					e: b.e,
					target: new Float64Array(N),
					dwell: decodeBuckets(stored.d[b.item.id] ?? '', N),
					free: new Float64Array(N),
					published: new Int8Array(N).fill(-1)
				};
				bars.set(b.item.id, st);
			}
			// Rebuilt every time rather than assigned once: a re-measure can add or
			// drop bars, and a stale index would bleed a deposit into whatever now
			// sits at that position.
			st.i = order.length;
			order.push(st);
			st.s = b.s;
			st.e = b.e;
			st.target.fill(0);
			st.free.fill(0);

			// Every anchor whose span overlaps this bar contributes. A bar is one
			// section plus any playgrounds that follow it, so this is usually two
			// or three anchors, and the playground is usually the expensive one.
			for (const f of m.flow) {
				if (f.e <= b.s || f.s >= b.e) continue;
				const secs = (CALIB[f.item.id] ?? 0) + (bonus.get(f.item.id) ?? 0);
				if (!secs) continue;
				spread(st.target, b.s, b.e, f.s, f.e, secs * DWELL.saturateAt);

				// A completed playground counts as instantly saturated. Someone who
				// cracked `capstone` in 90s engaged with it harder than the
				// 220s model demands; leaving that stretch of bar two-thirds lit
				// would be the same lie the dwell model exists to remove.
				if (f.item.kind === 'playground' && completed[f.item.id]) {
					spread(st.free, b.s, b.e, f.s, f.e, secs * DWELL.saturateAt);
				}
			}
			for (let k = 0; k < N; k++) {
				if (st.target[k] < DWELL.minBucketSeconds) st.target[k] = DWELL.minBucketSeconds;
			}
		}
		for (const id of [...bars.keys()]) if (!seen.has(id)) bars.delete(id);

		seedFromBinaryProgress();
		publish(true);
	}

	/**
	 * An existing reader with binary progress and no dwell must not open the page
	 * to a blank rail and read it as data loss. Back-fill every section they had
	 * already visited to a middling heat: visibly substantial, visibly short of
	 * full, and it tops up naturally as they carry on. Sections they never
	 * reached stay cold, so the seeded rail carries real information rather than
	 * a flat wash.
	 *
	 * `seeded` is a flag rather than a version bump: it is orthogonal to
	 * reorderings and must run exactly once however many renames the data passes
	 * through.
	 */
	function seedFromBinaryProgress() {
		if (seeded || !bars.size) return;
		// Set unconditionally, even when there is nothing to seed. A brand-new
		// reader has an empty snapshot, and leaving the flag unset would leave the
		// back-fill armed to fire later against whatever the scroll-spy had
		// written by then — which is the failure described on `seedSource`.
		seeded = true;
		dirtyStore = true;
		// Invert the heat curve, so `seedHeat` means the heat it says it means.
		const ratio = Math.pow(DWELL.seedHeat, 1 / DWELL.heatGamma);
		for (const [id, st] of bars) {
			if (!seedSource[id]) continue;
			for (let k = 0; k < st.dwell.length; k++) {
				st.dwell[k] = Math.max(st.dwell[k], st.target[k] * ratio);
			}
		}
		seeded = true;
		dirtyStore = true;
	}

	/* -- heat -------------------------------------------------------------- */

	const heatBuf = new Map<string, Float64Array>();

	function heatOf(id: string): Float64Array | null {
		const st = bars.get(id);
		if (!st) return null;
		let out = heatBuf.get(id);
		if (!out || out.length !== st.dwell.length) {
			out = new Float64Array(st.dwell.length);
			heatBuf.set(id, out);
		}
		for (let k = 0; k < out.length; k++) {
			const secs = st.dwell[k] + st.free[k];
			const r = Math.min(1, secs / st.target[k]);
			const h = DWELL.heatGamma === 1 ? r : Math.pow(r, DWELL.heatGamma);
			// The knee gates on ABSOLUTE seconds, not on the ratio, and it has to:
			// its job is to reject slivers, and a sliver is a sliver whether it
			// landed on the shortest bar or the longest.
			out[k] = h * smoothstep(secs / DWELL.markKneeSeconds);
		}
		return out;
	}

	function meanHeat(id: string): number {
		const h = heatOf(id);
		if (!h) return 0;
		let s = 0;
		for (let k = 0; k < h.length; k++) s += h[k];
		return s / h.length;
	}

	/* -- accrual ----------------------------------------------------------- */

	let lastY = 0;
	let lastSample = 0;
	let stillSince = 0;
	let lastInteraction = 0;
	let ticks = 0;
	let dirtyStore = false;

	/**
	 * Positive evidence that someone is here: a scroll, a wheel, a key, a moved
	 * pointer. Re-arms the focus gate as well as the idle timer, because those
	 * events only reach this window when it is the one being used — which is
	 * better evidence than `document.hasFocus()`, whose answer is also "no" when
	 * devtools has the keyboard.
	 */
	const noteInteraction = () => {
		lastInteraction = performance.now();
		hasFocus = true;
	};

	/**
	 * Net scroll speed over the trailing `velocityWindowMs`, in px/s.
	 *
	 * NET, and over a WINDOW, and both words are the fix. The question the gate
	 * needs answered is "is this reader still roughly where they were a second
	 * ago", not "did the document move between two consecutive 250ms samples".
	 * A wheel notch is a teleport followed by stillness; sampling per-tick sees
	 * only the teleport and concludes the reader is travelling at 1200px/s when
	 * they have moved 300px in a second and are sitting reading it.
	 *
	 * Using net displacement rather than summed |dy| also means a reader who
	 * scrolls down and back up to re-read a line is correctly treated as having
	 * stayed put, which is exactly the behaviour the dwell measure wants.
	 */
	const velT: number[] = [];
	const velY: number[] = [];

	function windowVelocity(now: number, y: number): number {
		velT.push(now);
		velY.push(y);
		// Keep the oldest entry that is still at or beyond the window edge, so the
		// span measured is always >= velocityWindowMs once the history has filled.
		const cutoff = now - DWELL.velocityWindowMs;
		while (velT.length > 2 && velT[1] <= cutoff) {
			velT.shift();
			velY.shift();
		}
		const span = now - velT[0];
		if (span <= 0) return 0;
		return (Math.abs(y - velY[0]) / span) * 1000;
	}

	function sample() {
		const now = performance.now();
		const dt = Math.min(now - lastSample, DWELL.maxTickMs);
		const y = window.scrollY;
		const dy = Math.abs(y - lastY);
		lastSample = now;
		if (dy > 0) noteInteraction();
		const velocity = windowVelocity(now, y);
		lastY = y;

		const awake =
			document.visibilityState === 'visible' && now - lastInteraction < DWELL.idleMs && hasFocus;

		// Partial credit between reading pace and the zero point. The settle gate
		// below still keys off credit reaching zero, so "landed after a fling"
		// behaves exactly as it did — only the boundary is no longer a cliff.
		const credit = velocityCredit(velocity);

		if (!awake || credit <= 0) {
			// Reset rather than pause: coming back to a tab, or landing after a
			// fling, a reader needs a moment to find their line again before
			// anything they are looking at counts as read.
			stillSince = 0;
		} else if (stillSince === 0) {
			stillSince = now;
		}

		if (stillSince === 0 || now - stillSince < DWELL.settleMs || dt <= 0) {
			if (++ticks % DWELL.publishEvery === 0) publish(false);
			return;
		}

		accrue(y, (dt / 1000) * credit);
		if (++ticks % DWELL.publishEvery === 0) publish(false);
	}

	/**
	 * Deposit `secs` of wall-clock time across the buckets currently on screen.
	 *
	 * The weights are NORMALISED, and that is the property that makes the whole
	 * measure honest rather than merely plausible. Without it, one second of
	 * sitting still would deposit one second into each of the ~5 buckets in
	 * view, and the rail would fill in a fifth of the real reading time. With
	 * it, one second of wall clock deposits at most one bucket-second, split by
	 * shape — so total dwell across the document can never exceed total time on
	 * the page, and lighting the whole rail requires genuinely spending the
	 * modelled hours.
	 *
	 * "At most", because the caller now scales `secs` by the velocity credit. The
	 * neighbour bleed applied at the end does NOT change the total: its kernel is
	 * normalised, so it moves seconds sideways and never mints them.
	 */
	function accrue(scrollY: number, secs: number) {
		const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		// The sticky header occludes the top of the viewport. Excluding it is not
		// a nicety: without it every bar's first bucket is systematically credited
		// for content that is literally hidden behind the header.
		const headerPx =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) ||
			48;
		const viewH = window.innerHeight - headerPx;
		if (viewH <= 0) return;
		const top = scrollY / scrollable;
		const bot = (scrollY + viewH) / scrollable;
		const vspan = bot - top;
		if (vspan <= 0) return;

		const N = DWELL.bucketsPerBar;
		const hits: { st: BarState; k: number; w: number }[] = [];
		let sum = 0;
		for (const st of bars.values()) {
			if (st.e <= top || st.s >= bot) continue;
			const bw = (st.e - st.s) / N;
			for (let k = 0; k < N; k++) {
				const ks = st.s + bw * k;
				const overlap = Math.min(bot, ks + bw) - Math.max(top, ks);
				if (overlap <= 0) continue;
				const mid = (Math.max(top, ks) + Math.min(bot, ks + bw)) / 2;
				const t = (mid - top) / vspan;
				const shape =
					DWELL.kernelFloor +
					(1 - DWELL.kernelFloor) * Math.min(1, t / DWELL.kernelRamp, (1 - t) / DWELL.kernelRamp);
				const w = (overlap / bw) * shape;
				hits.push({ st, k, w });
				sum += w;
			}
		}
		// The viewport can sit entirely inside a region no bar claims. Dividing by
		// a near-zero sum there would deposit an enormous lump into one bucket.
		if (sum < 0.05) return;

		// Each attributed share is then smeared along the bar axis by the bleed
		// kernel before it is banked. Doing it here rather than at read time is
		// what makes it cheap: the smear is paid once per 250ms sample over the
		// handful of bars on screen, not on every repaint over every bar.
		const r = DWELL.neighbourReach;
		for (const h of hits) {
			const share = (secs * h.w) / sum;
			for (let o = -r; o <= r; o++) {
				const nb = order[h.st.i + o];
				if (!nb) continue;
				const w = BLEED[o + r];
				if (w <= 0) continue;
				// Bleeding into the same bucket index only makes sense at one bucket
				// per bar, which is what ships. Clamp so a future N > 1 lands in a
				// real bucket rather than off the end.
				const k = Math.min(h.k, nb.dwell.length - 1);
				const cap = nb.target[k] * DWELL.runawayFactor;
				nb.dwell[k] = Math.min(cap, nb.dwell[k] + share * w);
			}
		}
		dirtyStore = true;
	}

	/* -- publish ----------------------------------------------------------- */

	function publish(force: boolean) {
		if (!listeners.size) return;
		const dirty: string[] = [];
		for (const [id, st] of bars) {
			const h = heatOf(id);
			if (!h) continue;
			let changed = force;
			for (let k = 0; k < h.length; k++) {
				const q = Math.round(h[k] * 16);
				if (q !== st.published[k]) {
					st.published[k] = q;
					changed = true;
				}
			}
			if (changed) dirty.push(id);
		}
		if (!dirty.length) return;
		for (const fn of listeners) fn(dirty);
	}

	/* -- persistence ------------------------------------------------------- */

	function flush() {
		if (!dirtyStore || !browser) return;
		dirtyStore = false;
		const d: Record<string, string> = {};
		for (const [id, st] of bars) {
			let any = false;
			for (let k = 0; k < st.dwell.length; k++) {
				if (st.dwell[k] > 0) {
					any = true;
					break;
				}
			}
			if (any) d[id] = encodeBuckets(st.dwell);
		}
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ version: DWELL_VERSION, seeded, d } satisfies StoredDwell)
			);
		} catch {
			// A full or blocked localStorage must not take the rail down with it.
		}
	}

	/* -- wiring ------------------------------------------------------------ */

	let hasFocus = true;
	let timer: ReturnType<typeof setInterval> | undefined;
	let flusher: ReturnType<typeof setInterval> | undefined;
	let stopProgress: (() => void) | undefined;
	let teardown: (() => void) | undefined;

	if (browser) {
		lastY = window.scrollY;
		lastSample = performance.now();
		lastInteraction = lastSample;
		// Starts true rather than from `document.hasFocus()`. Seeding it from that
		// call made accrual dead-on-arrival for any page that loaded while the
		// window was not frontmost: the flag could only ever be set again by a
		// `focus` EVENT, which never fires if the window was already focused by
		// the time the reader looked at it. The blur handler still closes the
		// "walked away to another app" hole, and the idle gate backs it up.

		// The scroll position is read on the sampler's own clock, so no scroll
		// listener is needed for measurement. These exist only for the idle gate:
		// they answer "is anyone still there", and each is a single timestamp
		// write on a passive listener.
		for (const ev of ['pointermove', 'keydown', 'wheel'] as const) {
			window.addEventListener(ev, noteInteraction, { passive: true });
		}
		// A browser window covered by another application is still "visible", so
		// visibilitychange alone does not catch walking away from the machine.
		const onFocus = () => {
			hasFocus = true;
			noteInteraction();
		};
		const onBlur = () => {
			hasFocus = false;
		};
		window.addEventListener('focus', onFocus);
		window.addEventListener('blur', onBlur);
		const onVis = () => {
			if (document.visibilityState === 'hidden') flush();
			else noteInteraction();
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('pagehide', flush);

		timer = setInterval(sample, DWELL.sampleMs);
		flusher = setInterval(flush, DWELL.flushMs);

		// The only thing the live store still tells the tracker is which
		// playgrounds have been solved, because a solve saturates its stretch of
		// bar outright. `sections` is deliberately NOT read here — see the note on
		// `seedSource` for why a live read of it re-creates the fling bug.
		stopProgress = progress.subscribe((s) => {
			const next = s.scenarios as Record<string, unknown>;
			const changed = Object.keys(next).length !== Object.keys(completed).length;
			completed = next;
			if (changed && bars.size) rebuildTargets();
		});

		teardown = () => {
			flush();
			clearInterval(timer);
			clearInterval(flusher);
			for (const ev of ['pointermove', 'keydown', 'wheel'] as const) {
				window.removeEventListener(ev, noteInteraction);
			}
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('pagehide', flush);
			stopProgress?.();
			listeners.clear();
		};
	}

	return {
		setModel,
		heatOf,
		meanHeat,
		subscribe(fn) {
			listeners.add(fn);
			if (bars.size) publish(true);
			return () => listeners.delete(fn);
		},
		destroy() {
			teardown?.();
		}
	};
}
