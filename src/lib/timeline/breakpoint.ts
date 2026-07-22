/**
 * The one breakpoint that decides whether the header's course timeline exists.
 *
 * At or above this width the header's Thread rail mounts and owns course
 * progress; below it the rail is not mounted at all (no width to be legible,
 * no pointer to drive its fisheye) and the sidebar's progress bar carries on
 * alone.
 *
 * Every consumer imports THIS constant rather than writing its own query,
 * because the failure mode is a width where the rail is mounted with no width
 * floor under it, or a floor reserved for a rail that is not there. One
 * string; Header.svelte consumes it twice — the matchMedia gate that mounts
 * the rail, and the `.thread-cell` min-width floor scoped to the same 720px
 * (the CSS cannot import a TS constant, so the number is pinned there with a
 * comment pointing back here).
 *
 * ── why 720 and not a laptop width ──────────────────────────────────────────
 * 744pt is iPad mini portrait; 820pt is iPad Air portrait. The rail is the
 * app's one piece of ambient art, and gating it at a laptop width would kill
 * it on every tablet held upright — far earlier than the width actually
 * demands.
 *
 * What the rail needs is not viewport width but its OWN width, and the header
 * can buy that back by spending the control cluster instead. Header.svelte
 * sheds, in order: the Playground/Agent text labels (<1280), the GitHub link
 * and the resting search field, which collapses to its magnifier (<1120), and
 * the wordmark (<860). That ladder holds the rail above the sweep floor
 * documented on `.thread-cell` in Header.svelte all the way down.
 *
 * The gate is 720, NOT 744, and the 24px is the point. 744 is iPad mini
 * portrait exactly — gating there means the device the rail is meant to reach
 * sits precisely ON the boundary, and a scrollbar or any browser chrome tips
 * it into mobile. Gating at 720 buys iPad mini a real cushion instead of a
 * coin flip.
 *
 * This is a resting-state guarantee. Focusing the search box deliberately
 * squeezes the rail leftward, and on tablets that squeeze does dip under the
 * floor — see the note on `.thread-cell`. That is a mode the reader is in for
 * as long as they are typing, and it restores itself on blur.
 */
export const RAIL_MEDIA_QUERY = '(min-width: 720px)';

/**
 * Track `RAIL_MEDIA_QUERY` from inside an `$effect`. Returns the teardown, so
 * the call site is one line:
 *
 * ```ts
 * let wide = $state(false);
 * $effect(() => watchRailBreakpoint((m) => (wide = m)));
 * ```
 *
 * `wide` starts false, which is the mobile arrangement — so SSR and the first
 * client frame render no rail, then it mounts on the matchMedia event. There
 * is never a frame where a half-measured rail flashes at a width it is about
 * to be unmounted from.
 */
export function watchRailBreakpoint(set: (matches: boolean) => void): () => void {
	const mq = window.matchMedia(RAIL_MEDIA_QUERY);
	const sync = () => set(mq.matches);
	sync();
	mq.addEventListener('change', sync);
	return () => mq.removeEventListener('change', sync);
}
