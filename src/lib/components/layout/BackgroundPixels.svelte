<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * The living background, ported from TerminalVibes and re-lit in GitVibes
	 * indigo: a near-continuous fabric of soft pixels behind the entire app.
	 * Cells ease in and out of brightness (no hard pops), a gentle ambient
	 * breath keeps the whole surface alive, and the cursor presses a smooth
	 * Gaussian dent into the fabric while circular waves ripple outward from
	 * it — each wave stochastically brightening some cells more than others,
	 * like light catching threads. A second canvas above the content replays
	 * the very same cells in difference blend, clipped to [data-fabric]
	 * surfaces (TOC, code blocks, callouts), so the fabric subtly inverts
	 * through what sits on top of it.
	 *
	 * Deliberately cheap: two 2D canvases sharing one Map of active cells
	 * (only those are updated/drawn), 24 fps tick, pauses when the tab is
	 * hidden and respects prefers-reduced-motion.
	 */

	const CELL = 13; // grid pitch in px
	const DOT = 11; // drawn dot size — a 2px seam between neighbors
	const AMBIENT_BIRTHS_PER_SEC = 120; // baseline breath across the screen
	const GOAL_FADE_PER_SEC = 0.5; // release — quick enough that waves read as motion
	const EASE = 0.16; // per-tick approach toward the target (softness)
	const MOUSE_SIGMA = 90; // Gaussian radius of the cursor's press, px
	const MAX_CELLS = 4000;
	const RING_EVERY_MS = 1050; // a new wave leaves the cursor about once a second
	const RING_SPEED = 130; // outward speed, px/s
	const RING_SIGMA = 24; // radial thickness of the wave band
	const RING_MAX_R = 360; // waves dissolve past this radius

	let canvas: HTMLCanvasElement;
	let overlay: HTMLCanvasElement;

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = canvas.getContext('2d', { alpha: true });
		const octx = overlay.getContext('2d', { alpha: true });
		if (!ctx || !octx) return;

		// Each active cell eases its brightness toward a goal; the goal decays.
		interface Cell {
			cx: number;
			cy: number;
			a: number; // displayed brightness 0..1
			goal: number; // where the brightness is headed
		}
		// Non-reactive canvas bookkeeping (lives inside the effect, drawn via
		// rAF) — SvelteMap reactivity would be pure overhead here.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const cells = new Map<number, Cell>();
		interface Ring {
			x: number;
			y: number;
			born: number;
			seed: number;
		}
		let rings: Ring[] = [];
		let lastRing = 0;
		let ringSeed = 1;
		let cols = 0;
		let rows = 0;

		// Theme: luminous indigo in the dark, deep indigo ink in the light.
		let dark = true;
		let ceiling = 0.15;
		let overlayCeiling = 0.1;
		function readTheme() {
			const root = document.documentElement;
			dark = root.classList.contains('dark')
				? true
				: root.classList.contains('light')
					? false
					: window.matchMedia('(prefers-color-scheme: dark)').matches;
			ceiling = dark ? 0.15 : 0.1;
			overlayCeiling = dark ? 0.1 : 0.07;
		}
		readTheme();
		const themeObs = new MutationObserver(readTheme);
		themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		mql.addEventListener('change', readTheme);

		function resize() {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const size = (cv: HTMLCanvasElement, c2d: CanvasRenderingContext2D) => {
				cv.width = Math.floor(window.innerWidth * dpr);
				cv.height = Math.floor(window.innerHeight * dpr);
				// Work in CSS pixels on both canvases
				c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
			};
			size(canvas, ctx!);
			size(overlay, octx!);
			cols = Math.ceil(window.innerWidth / CELL);
			rows = Math.ceil(window.innerHeight / CELL);
			cells.clear();
		}
		resize();
		window.addEventListener('resize', resize);

		function press(cx: number, cy: number, goal: number) {
			if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
			const key = cy * cols + cx;
			const cell = cells.get(key);
			if (cell) {
				cell.goal = Math.max(cell.goal, goal);
			} else if (cells.size < MAX_CELLS) {
				cells.set(key, { cx, cy, a: 0, goal });
			}
		}

		// Stable pseudo-random per (cell, ring): the same thread catches the
		// same light for the whole pass of one wave — stochastic but not noisy.
		function hash(cx: number, cy: number, seed: number) {
			const s = Math.sin(cx * 127.1 + cy * 311.7 + seed * 74.7) * 43758.5453;
			return s - Math.floor(s);
		}

		let mouseX = -1;
		let mouseY = -1;
		function onMove(e: MouseEvent) {
			mouseX = e.clientX;
			mouseY = e.clientY;
		}
		function onLeave() {
			mouseX = -1;
			mouseY = -1;
		}
		window.addEventListener('mousemove', onMove, { passive: true });
		document.documentElement.addEventListener('mouseleave', onLeave);

		// Surfaces the overlay ripples through, re-queried occasionally
		// (sections mount lazily) and measured every tick (they scroll).
		let fabricEls: Element[] = [];
		let lastQuery = 0;

		let raf = 0;
		let last = performance.now();
		const FRAME = 1000 / 24;

		function tick(now: number) {
			raf = requestAnimationFrame(tick);
			const dt = now - last;
			if (dt < FRAME) return;
			last = now;

			// Ambient breath: soft blooms scattered across the whole surface
			const expected = (AMBIENT_BIRTHS_PER_SEC * dt) / 1000;
			let births = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
			while (births-- > 0) {
				press(
					Math.floor(Math.random() * cols),
					Math.floor(Math.random() * rows),
					0.2 + Math.random() * 0.45
				);
			}

			if (mouseX >= 0) {
				// The cursor's press: a smooth Gaussian dent, recomputed for every
				// cell under it each tick — the fabric follows the hand, no dice.
				const reach = Math.ceil((MOUSE_SIGMA * 2.6) / CELL);
				const mcx = Math.round(mouseX / CELL);
				const mcy = Math.round(mouseY / CELL);
				for (let gy = mcy - reach; gy <= mcy + reach; gy++) {
					for (let gx = mcx - reach; gx <= mcx + reach; gx++) {
						const dx = gx * CELL + CELL / 2 - mouseX;
						const dy = gy * CELL + CELL / 2 - mouseY;
						const g = Math.exp(-(dx * dx + dy * dy) / (2 * MOUSE_SIGMA * MOUSE_SIGMA));
						if (g > 0.04) press(gx, gy, g * 0.7);
					}
				}
				// ...and waves depart from it, one about every second
				if (now - lastRing > RING_EVERY_MS) {
					lastRing = now;
					rings.push({ x: mouseX, y: mouseY, born: now, seed: ringSeed++ });
				}
			}

			// Each wave: an annulus sweeping outward, fading as it travels.
			// Per-cell jitter makes threads catch the light unevenly, and a few
			// cells flare brighter than the wave itself.
			rings = rings.filter((ring) => ((now - ring.born) / 1000) * RING_SPEED < RING_MAX_R);
			for (const ring of rings) {
				const rad = ((now - ring.born) / 1000) * RING_SPEED;
				const fade = Math.pow(1 - rad / RING_MAX_R, 1.4) * Math.min(1, rad / 50);
				if (fade <= 0.02) continue;
				const reach = Math.ceil((rad + RING_SIGMA * 3) / CELL);
				const mcx = Math.round(ring.x / CELL);
				const mcy = Math.round(ring.y / CELL);
				for (let gy = mcy - reach; gy <= mcy + reach; gy++) {
					for (let gx = mcx - reach; gx <= mcx + reach; gx++) {
						const dx = gx * CELL + CELL / 2 - ring.x;
						const dy = gy * CELL + CELL / 2 - ring.y;
						const d = Math.sqrt(dx * dx + dy * dy) - rad;
						if (d > RING_SIGMA * 3 || d < -RING_SIGMA * 3) continue;
						const band = Math.exp(-(d * d) / (2 * RING_SIGMA * RING_SIGMA)) * fade;
						if (band <= 0.05) continue;
						const h = hash(gx, gy, ring.seed);
						const flare = h > 0.93 ? 1.7 : 1;
						press(gx, gy, Math.min(0.95, band * (0.5 + h * 0.9) * flare * 0.8));
					}
				}
			}

			// Overlay clip: the [data-fabric] surfaces currently on screen
			if (now - lastQuery > 2000) {
				lastQuery = now;
				fabricEls = Array.from(document.querySelectorAll('[data-fabric]'));
			}
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			ctx!.clearRect(0, 0, vw, vh);
			octx!.clearRect(0, 0, vw, vh);
			let clipped = false;
			for (const el of fabricEls) {
				const r = el.getBoundingClientRect();
				if (r.width < 1 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
				if (!clipped) {
					octx!.save();
					octx!.beginPath();
					clipped = true;
				}
				if (typeof octx!.roundRect === 'function') {
					octx!.roundRect(r.x, r.y, r.width, r.height, 8);
				} else {
					octx!.rect(r.x, r.y, r.width, r.height);
				}
			}
			if (clipped) octx!.clip();

			const goalDecay = (GOAL_FADE_PER_SEC * dt) / 1000;
			const [r, g, b] = dark ? [129, 140, 248] : [79, 70, 229];
			for (const [key, c] of cells) {
				c.goal = Math.max(0, c.goal - goalDecay);
				// Sparkle: now and then a cell flashes past its neighborhood
				if (c.a > 0.05 && Math.random() < 0.0015) c.goal = Math.min(1, c.a + 0.4);
				c.a += (c.goal - c.a) * EASE;
				if (c.a < 0.01 && c.goal < 0.01) {
					cells.delete(key);
					continue;
				}
				// A slow per-cell shimmer, deep enough to actually see
				const tw = 0.72 + 0.28 * Math.sin(now / 540 + c.cx * 1.7 + c.cy * 2.9);
				const x = c.cx * CELL + (CELL - DOT) / 2;
				const y = c.cy * CELL + (CELL - DOT) / 2;
				ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${ceiling * c.a * tw})`;
				ctx!.fillRect(x, y, DOT, DOT);
				if (clipped) {
					octx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${overlayCeiling * c.a * tw})`;
					octx!.fillRect(x, y, DOT, DOT);
				}
			}
			if (clipped) octx!.restore();
		}
		raf = requestAnimationFrame(tick);

		function onVisibility() {
			if (document.hidden) {
				cancelAnimationFrame(raf);
			} else {
				last = performance.now();
				raf = requestAnimationFrame(tick);
			}
		}
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('mousemove', onMove);
			document.documentElement.removeEventListener('mouseleave', onLeave);
			document.removeEventListener('visibilitychange', onVisibility);
			themeObs.disconnect();
			mql.removeEventListener('change', readTheme);
		};
	});
</script>

<canvas bind:this={canvas} class="bg-pixels" aria-hidden="true"></canvas>
<canvas bind:this={overlay} class="bg-pixels-overlay" aria-hidden="true"></canvas>

<style>
	.bg-pixels,
	.bg-pixels-overlay {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
	}

	.bg-pixels {
		z-index: -1;
	}

	/* Above the page surfaces it ripples through, below the header (50)
	   and every modal; difference blend inverts instead of glowing, and a
	   whisper of blur melts the dots into the glass they pass behind. */
	.bg-pixels-overlay {
		z-index: 45;
		mix-blend-mode: difference;
		filter: blur(2px);
	}
</style>
