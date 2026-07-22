/**
 * Where every anchor actually sits in the document.
 *
 * The rail's whole model is `f` — each anchor's scroll position as a fraction
 * of the scrollable height. Everything else (bar widths, the reading head, the
 * hit test) is downstream of it, so a wrong `f` is a rail that points at the
 * wrong section while looking perfectly fine.
 *
 * Framework-free on purpose: no Svelte imports, so it can be reasoned about
 * (and driven) independently of the component's lifecycle.
 */

/** Header offset + breathing room, IDENTICAL to +page.svelte's sectionScrollTop. */
function headerOffset(): number {
	const h =
		parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) ||
		48;
	return h + 16;
}

export interface Offsets {
	/** anchor id -> document fraction in [0,1] */
	f: Map<string, number>;
	/** scrollHeight - innerHeight, the denominator */
	scrollable: number;
	/** how long the read pass took, ms (dev guard) */
	ms: number;
}

/**
 * Measure every anchor in ONE read pass.
 *
 * Reads only, with no interleaved writes: the first getBoundingClientRect
 * forces a single layout and the remaining ones are free. Never call this from
 * inside a loop that also writes styles, and never call the rail's layout()
 * from inside the read loop — that turns 107 free reads into 107 reflows.
 *
 * The offset expression matches +page.svelte's `sectionScrollTop` exactly, so
 * the rail's notion of "where a section starts" is the same place clicking it
 * lands. Anything else and the reading head sits a header's height off.
 */
export function measureOffsets(ids: readonly string[]): Offsets {
	const t0 = performance.now();
	const scrollY = window.scrollY;
	const off = headerOffset();
	const tops: (number | null)[] = new Array(ids.length);
	for (let i = 0; i < ids.length; i++) {
		const el = document.getElementById(ids[i]);
		tops[i] = el ? el.getBoundingClientRect().top + scrollY - off : null;
	}
	const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
	const f = new Map<string, number>();
	// Monotone by construction: a lazily-mounted block can momentarily report a
	// top above its predecessor mid-reflow, and a non-monotone f makes the bar
	// row fail to tile — which the hit test reads as "this document region
	// belongs to nobody".
	let prev = 0;
	for (let i = 0; i < ids.length; i++) {
		const top = tops[i];
		if (top === null) continue;
		const v = Math.min(1, Math.max(prev, top / scrollable));
		f.set(ids[i], v);
		prev = v;
	}
	return { f, scrollable, ms: performance.now() - t0 };
}

/** How far down the page the reader is, 0..1 — the reading head's position. */
export function scrollFraction(): number {
	const scrollable = document.documentElement.scrollHeight - window.innerHeight;
	if (scrollable <= 0) return 0;
	return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

export interface ReflowWatcherOptions {
	/** Called when something may have moved the anchors. Debounced. */
	onReflow: () => void;
	/** Called when the rail's own width changed and geometry must re-solve. */
	onResize: () => void;
	/** Element whose block size stands in for "the page got taller". */
	target: HTMLElement | null;
}

/**
 * Watch for everything that moves an anchor after first paint.
 *
 * This page reflows for the whole session, not just at startup:
 *
 *  - MermaidDiagram reserves 180px for a diagram that is usually taller, and
 *    renders it lazily behind an IntersectionObserver with a dynamic import —
 *    so diagrams grow the page AS THE READER SCROLLS, and again on theme flip.
 *  - LessonActivity does the same with a 500px placeholder and a dynamically
 *    imported playground.
 *  - Web fonts land after mount and move every heading.
 *
 * Rather than hooking each of those, watch the one thing they all change: the
 * height of <main>. A trailing debounce collapses a burst of lazy mounts into
 * a single remeasure. (Banner images need no handling — ExpandableImage sets
 * explicit width/height, so their boxes are reserved before load.)
 */
export function createReflowWatcher(opts: ReflowWatcherOptions): () => void {
	let reflowTimer: ReturnType<typeof setTimeout> | undefined;
	let resizeTimer: ReturnType<typeof setTimeout> | undefined;
	let lastHeight = 0;
	let lastWidth = typeof window === 'undefined' ? 0 : window.innerWidth;

	const fireReflow = () => {
		clearTimeout(reflowTimer);
		reflowTimer = setTimeout(opts.onReflow, 200);
	};

	let ro: ResizeObserver | undefined;
	if (opts.target && typeof ResizeObserver === 'function') {
		lastHeight = opts.target.getBoundingClientRect().height;
		ro = new ResizeObserver(() => {
			const h = opts.target!.getBoundingClientRect().height;
			if (Math.abs(h - lastHeight) < 1) return;
			lastHeight = h;
			fireReflow();
		});
		ro.observe(opts.target);
	}

	const onWinResize = () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			// A width change moves the rail's geometry as well as the anchors;
			// a pure height change (mobile URL bar) only moves the anchors.
			if (window.innerWidth !== lastWidth) {
				lastWidth = window.innerWidth;
				opts.onResize();
			}
			opts.onReflow();
		}, 150);
	};
	window.addEventListener('resize', onWinResize);

	// Webfonts land after mount and shift every section boundary.
	document.fonts?.ready.then(fireReflow).catch(() => {});

	return () => {
		clearTimeout(reflowTimer);
		clearTimeout(resizeTimer);
		ro?.disconnect();
		window.removeEventListener('resize', onWinResize);
	};
}
