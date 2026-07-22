/**
 * The dwell heat ramp: a scalar in [0,1] -> a colour, and a run of scalars -> a
 * CSS gradient.
 *
 * The signal the ramp carries is SATURATION RISING. Both themes raise chroma
 * monotonically from cold to hot; they disagree only about lightness, because
 * on the light theme's near-white surfaces a lighter hot end would have less
 * contrast than the cold end, not more. So light goes darker-and-richer and
 * dark goes lighter-and-richer, and the thing they share — more colour means
 * more time spent — is the part a reader actually decodes.
 *
 * Interpolation is in OKLCh rather than sRGB. Between a dim grey-violet and a
 * saturated violet, sRGB dips through a desaturated mud at the midpoint; polar
 * interpolation holds chroma across the whole ramp. Since the entire message is
 * "chroma increases", the colour space here is the mechanism, not a refinement.
 *
 * Resolved ONCE per theme into concrete `rgb()` strings. Painting dozens of
 * bars with `color-mix()` would be hundreds of colour resolutions inside a
 * style string; indexing a LUT is an array read and a join.
 */

/**
 * Endpoints, seated inside the sRGB gamut at their own (L,H) so no stop clips.
 *
 * The family is the violet the thread itself wears (`--color-vibe`, ~H 293 in
 * OKLCh), NOT the indigo of the chrome. The rail sits on indigo/navy surfaces
 * all session; a ramp rising toward the chrome's own indigo would dissolve a
 * bar into its background at exactly the hot end, where it should be most
 * present. Violet is one step warm of the chrome — visibly kin, never lost —
 * and warming a bar therefore reads as the thread itself gaining body rather
 * than as a foreign colour arriving.
 *
 * DELIBERATELY QUIET. The heat curve is strongly concave (`heatGamma` 0.26),
 * which means the mid and upper ramp is where ordinary reading actually LIVES.
 * A louder swing under that curve paints the rail saturated everywhere. What
 * the restraint costs is resolution — two bars an hour of reading apart are a
 * small colour step — and that is the intended trade: the rail is a mood, not
 * a gauge, and a reader who wants the number has the progress summary.
 */
const RAMP = {
	light: { L: [0.91, 0.62], C: [0.006, 0.095], H: [300, 292] },
	dark: { L: [0.3, 0.7], C: [0.01, 0.105], H: [288, 296] }
} as const;

export type Theme = 'light' | 'dark';

/** How many discrete colours the LUT holds. Gradient stops index into it. */
export const LUT_SIZE = 17;

function srgb(v: number): number {
	const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
	return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

/** OKLCh -> `r,g,b` triple, clamped into gamut. */
function oklch(L: number, C: number, H: number): [number, number, number] {
	const h = (H * Math.PI) / 180;
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
	];
}

/**
 * Build the LUT for a theme. `chromaGamma` below 1 front-loads the chroma rise.
 *
 * It ships at 1 — linear — and the reason is worth keeping next to the code:
 * front-loading here would be compensating for a heat curve that is too
 * straight at the bottom, and that is fixed at the source instead
 * (`DWELL.heatGamma`). Turning both on stacks two concavities on the same
 * visual result, which is the exact mistake dwell.ts's header spends a page
 * warning about.
 */
export function buildHeatLut(theme: Theme, chromaGamma = 1): string[] {
	const r = RAMP[theme];
	const out: string[] = new Array(LUT_SIZE);
	for (let i = 0; i < LUT_SIZE; i++) {
		const t = i / (LUT_SIZE - 1);
		const [R, G, B] = oklch(
			r.L[0] + (r.L[1] - r.L[0]) * t,
			r.C[0] + (r.C[1] - r.C[0]) * Math.pow(t, chromaGamma),
			r.H[0] + (r.H[1] - r.H[0]) * t
		);
		out[i] = `rgb(${R},${G},${B})`;
	}
	return out;
}

export const lutColour = (lut: string[], heat: number): string =>
	lut[Math.round(Math.min(1, Math.max(0, heat)) * (LUT_SIZE - 1))];

/**
 * A run of bucket heats -> one `linear-gradient`.
 *
 * Stops sit at bucket CENTRES, with the first and last pinned to 0%/100%.
 * Edge-placed stops make the browser draw N visible plateaus — a bar chart
 * rather than a ramp.
 *
 * Stops are ALWAYS evenly spaced percentages, and deliberately so.
 *
 * Lens-correcting them — each bucket placed at `map.toScreen(bucketDocPos)` so
 * the heat stays registered to the document under the fisheye — is defensible
 * in principle and wrong in practice: the corrected stops shift on every
 * pointer move, so the gradient visibly churns inside a bar that is otherwise
 * just growing. A small static distortion is imperceptible; the same
 * distortion in motion is the most salient thing on the rail.
 *
 * The bar is the unit. Its gradient is its identity: when the lens grows the
 * bar, the gradient should scale with it like a zoomed image and nothing
 * should slosh. Percentages give exactly that for free — the browser rescales
 * a percentage gradient with its element — so the correct implementation is
 * also the cheapest one, with no per-frame work at all.
 *
 * Bin COUNT is likewise fixed at every zoom level (see DWELL.bucketsPerBar):
 * resampling bins under magnification distorts the very record being shown.
 */
export function heatGradient(buckets: ArrayLike<number>, lut: string[]): string {
	const n = buckets.length;
	if (n === 0) return 'none';
	if (n === 1) return lutColour(lut, buckets[0]);
	let out = 'linear-gradient(90deg';
	for (let i = 0; i < n; i++) {
		const pct = i === 0 ? 0 : i === n - 1 ? 100 : ((i + 0.5) / n) * 100;
		out += `,${lutColour(lut, buckets[i])} ${pct.toFixed(1)}%`;
	}
	return out + ')';
}
