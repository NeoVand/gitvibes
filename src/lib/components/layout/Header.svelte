<script lang="ts">
	import { tick } from 'svelte';
	import { Sun, Moon, ScrollText, Gamepad2, Bot, X, RotateCcw } from 'lucide-svelte';
	import Github from '$lib/components/ui/GithubIcon.svelte';
	import Linkedin from '$lib/components/ui/LinkedinIcon.svelte';
	import { base } from '$app/paths';
	import Search from './Search.svelte';
	import ThreadRail from './ThreadRail.svelte';
	import { resetAllLearningState } from '$lib/data/progress';
	import type { PlacedItem } from '$lib/timeline/mapping';
	import { watchRailBreakpoint } from '$lib/timeline/breakpoint';

	let {
		theme = 'system',
		onToggleTheme,
		onToggleCheatSheet,
		onTogglePlayground,
		onToggleAgent,
		onNavigate,
		timelineItems = [],
		scrollPosition = 0,
		readIds = new Set<string>(),
		doneIds = new Set<string>(),
		cheatSheetOpen = false,
		playgroundOpen = false,
		agentOpen = false
	}: {
		theme: string;
		onToggleTheme: () => void;
		onToggleCheatSheet: () => void;
		onTogglePlayground: () => void;
		onToggleAgent: () => void;
		onNavigate?: (id: string) => void;
		/** the course manifest with measured offsets — empty until measured */
		timelineItems?: PlacedItem[];
		scrollPosition?: number;
		readIds?: Set<string>;
		doneIds?: Set<string>;
		/* Whether each button's panel is currently on screen. The buttons are
		   toggles that leave no other trace in the header once their panel
		   covers the far side of the viewport, so they wear the state
		   themselves: a steadier wash than hover, plus aria-pressed so the
		   state is spoken, not just painted. */
		cheatSheetOpen?: boolean;
		playgroundOpen?: boolean;
		agentOpen?: boolean;
	} = $props();

	let aboutOpen = $state(false);

	/** Whether the search box currently holds focus, and so is at full width. */
	let searchExpanded = $state(false);

	// The rail is a fisheye over 75 anchors and is hover-driven. Gate on
	// matchMedia rather than CSS so it is not merely hidden: a display:none rail
	// would still mount, measure a zero width, and keep a ResizeObserver alive
	// for nothing.
	//
	// The query itself lives in $lib/timeline/breakpoint, which also carries the
	// reasoning behind the 720px value and the shedding ladder this header uses
	// to hold the rail down to it.
	let wide = $state(false);
	$effect(() => watchRailBreakpoint((m) => (wide = m)));

	/* ── reset ──────────────────────────────────────────────────────────────
	   Lives here rather than in the sidebar alone because it is an action ON
	   the timeline, and the timeline is here. The sidebar keeps its own copy
	   for readers who never see the rail. */

	// Wiping an hour of reading is not something a stray click gets to do, so
	// the first press only arms. Same affordance the sidebar has always had.
	let resetArmed = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	/* Held across the wipe to drop the rail's live dwell tracker.

	   The tracker buffers dwell in memory and FLUSHES IT BACK on teardown, so
	   clearing storage underneath a running rail achieves nothing: the next
	   unmount writes the old seconds straight back. Unmounting first, letting
	   that final flush land, and only then clearing is what makes the heat map
	   actually go out. `await tick()` is the wait for the teardown. */
	let railSuppressed = $state(false);

	async function handleReset() {
		if (!resetArmed) {
			resetArmed = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (resetArmed = false), 2500);
			return;
		}
		clearTimeout(resetTimer);
		resetArmed = false;

		railSuppressed = true;
		await tick();
		resetAllLearningState();
		railSuppressed = false;

		// "Back to the initial state" includes where the reader is standing. A
		// reset that leaves them at section 8.3 with an empty rail has cleared
		// the record but not the experience.
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
	}

	$effect(() => () => clearTimeout(resetTimer));
</script>

<header
	class="app-header fixed top-0 right-0 left-0 z-50 flex items-center"
	class:search-expanded={searchExpanded}
	style="height: var(--header-height);"
>
	<div
		class="flex flex-shrink-0 items-center justify-center"
		style="width: var(--sidebar-collapsed-width);"
	>
		<button
			onclick={() => (aboutOpen = true)}
			class="flex h-7 w-7 cursor-pointer items-center justify-center transition-opacity hover:opacity-80"
			aria-label="About GitVibes"
		>
			<img src="{base}/images/logo.webp" alt="" class="h-7 w-7" width="28" height="28" />
		</button>
	</div>

	<!-- The logo is unconditional; the wordmark is the first thing spent when
	     the rail needs room. See the ladder in the stylesheet below. -->
	<span
		class="wordmark text-[15px] font-bold tracking-tight"
		style="color: var(--color-text); font-family: var(--font-heading); letter-spacing: -0.02em;"
	>
		GitVibes
	</span>

	<!-- The Thread rail lives in the one flexible cell of the header, between
	     the wordmark and the control cluster. flex-1 is what makes it
	     responsive: it takes every pixel the cluster does not, so the rail runs
	     right up to the search box and gives the pixels back when the box
	     opens. min-w-0 lets it shrink, and .thread-cell's min-width is the
	     floor below which the sweep stops being usable (see the CSS below). -->
	<div class="thread-cell flex min-w-0 flex-1 items-center">
		{#if wide}
			<!-- Immediately left of the rail, and deliberately the quietest
			     control in the header until it is armed, at which point it turns
			     --color-warning and says so. 24px is the WCAG 2.2 SC 2.5.8 (AA)
			     floor for a pointer target and every pixel past it comes
			     straight out of the rail beside it. -->
			<button
				onclick={handleReset}
				class="reset-btn flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded transition-all"
				class:is-armed={resetArmed}
				aria-label={resetArmed ? 'Click again to reset all progress' : 'Reset progress'}
				title={resetArmed ? 'Click again to reset all progress' : 'Reset all progress'}
			>
				<RotateCcw size={13} />
			</button>
		{/if}

		<div class="rail-cell min-w-0 flex-1">
			{#if wide && !railSuppressed && timelineItems.length}
				<ThreadRail
					items={timelineItems}
					position={scrollPosition}
					{readIds}
					{doneIds}
					{onNavigate}
				/>
			{/if}
		</div>
	</div>

	<!-- One control set for all breakpoints. Nothing here is duplicated per
	     width; each control just sheds its optional half as the rail needs the
	     pixels back. The order of shedding is in the stylesheet. -->
	<div class="header-cluster flex flex-shrink-0 items-center">
		<div class="search-slot">
			<Search {onNavigate} onExpandedChange={(v) => (searchExpanded = v)} />
		</div>

		<button
			onclick={onTogglePlayground}
			class="playground-btn labelled-btn flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-all"
			class:is-active={playgroundOpen}
			aria-pressed={playgroundOpen}
			aria-label="Open Git Playground"
		>
			<Gamepad2 size={16} />
			<span class="btn-label text-xs font-semibold">Playground</span>
		</button>

		<button
			onclick={onToggleAgent}
			class="agent-btn labelled-btn flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-all"
			class:is-active={agentOpen}
			aria-pressed={agentOpen}
			aria-label="Open Agent"
		>
			<Bot size={16} />
			<span class="btn-label text-xs font-semibold">Agent</span>
		</button>

		<button
			onclick={onToggleCheatSheet}
			class="cheatsheet-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all"
			class:is-active={cheatSheetOpen}
			aria-pressed={cheatSheetOpen}
			aria-label="Git Cheat Sheet"
		>
			<ScrollText size={16} />
		</button>

		<a
			href="https://github.com/NeoVand/gitvibes"
			target="_blank"
			rel="noopener noreferrer"
			class="gh-link h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="View on GitHub"
		>
			<Github size={16} />
		</a>

		<button
			onclick={onToggleTheme}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Toggle theme"
		>
			{#if theme === 'dark'}
				<Sun size={16} />
			{:else}
				<Moon size={16} />
			{/if}
		</button>
	</div>
</header>

{#if aboutOpen}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={() => (aboutOpen = false)}
			aria-label="Close about"
		></button>
		<div
			class="about-modal relative w-full max-w-sm rounded-xl border p-6 shadow-2xl"
			style="background: var(--color-surface); border-color: var(--color-border);"
		>
			<button
				onclick={() => (aboutOpen = false)}
				class="absolute top-3 right-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-70"
				style="color: var(--color-text-muted);"
				aria-label="Close"
			>
				<X size={16} />
			</button>

			<div class="mb-4 flex items-center gap-3">
				<img
					src="{base}/images/logo.webp"
					alt="GitVibes logo"
					class="h-10 w-10"
					width="40"
					height="40"
				/>
				<div>
					<h2
						class="text-lg font-bold"
						style="color: var(--color-text); font-family: var(--font-heading); letter-spacing: -0.02em;"
					>
						GitVibes
					</h2>
					<p class="text-xs" style="color: var(--color-text-muted);">Git for Vibe Coders</p>
				</div>
			</div>

			<p class="mb-5 text-sm leading-relaxed" style="color: var(--color-text-secondary);">
				An interactive educational app built to teach Git to developers working with AI tools. For
				educational purposes only.
			</p>

			<div class="mb-4 text-sm" style="color: var(--color-text-secondary);">
				<p class="mb-1 font-medium" style="color: var(--color-text);">Created by Neo Mohsenvand</p>
			</div>

			<div class="flex gap-2">
				<a
					href="https://github.com/NeoVand"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
					style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
				>
					<Github size={14} />
					GitHub
				</a>
				<a
					href="https://linkedin.com/in/mohsenvand"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
					style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
				>
					<Linkedin size={14} />
					LinkedIn
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Frosted glass, matching the sidebar's treatment: content scrolls
	   visibly behind the header through the blur. */
	.app-header {
		background: color-mix(in srgb, var(--color-bg) 62%, transparent);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-border) 80%, transparent);
	}

	/* ── the shedding ladder ────────────────────────────────────────────────
	   The rail is held down to tablet portrait by spending the control cluster
	   rather than the rail. Everything optional in this header has a width at
	   which it stops being worth what it costs the timeline:

	     wordmark             ~66px of type
	     Playground label     ~76px  (label, its gap, and the button's padding)
	     Agent label          ~45px
	     GitHub link          ~36px  (32px target + gap; the About modal, which
	                                  the logo opens, carries the same link)
	     search box       240 -> 32  (collapsing to its magnifier)

	   Spend order is cheapest-to-lose first, which is also least-visible
	   first: labels have icons carrying the same meaning, the GitHub link is
	   duplicated in the About modal, the search box keeps its whole function
	   behind one click, and the wordmark goes last because it is the only one
	   of the four that is pure identity. The logo never goes.

	   Below 720 nothing is left to sell — the cluster is already down to five
	   32px icons — so that is where RAIL_MEDIA_QUERY unmounts the rail. */

	/* Default is the narrowest arrangement, and the ladder adds things back.
	   Mobile-first the same way the rest of the app is: the phone case is the
	   one that must never depend on a query having matched. */
	.wordmark {
		display: none;
	}
	.btn-label {
		display: none;
	}
	.gh-link {
		display: none;
	}
	.header-cluster {
		gap: 2px;
		padding-right: 4px;
	}
	.thread-cell {
		gap: 6px;
		padding-left: 8px;
		padding-right: 8px;
	}

	@media (min-width: 860px) {
		.wordmark {
			display: inline;
		}
		.header-cluster {
			gap: 4px;
			padding-right: 8px;
		}
	}

	@media (min-width: 1120px) {
		.gh-link {
			display: flex;
		}
	}

	@media (min-width: 1280px) {
		.btn-label {
			display: inline;
		}
		.labelled-btn {
			width: auto;
			padding-left: 10px;
			padding-right: 10px;
		}
	}

	/* The rail's width floor. Cursor travel per anchor is a fixed FRACTION of
	   the sweep and only scales with the rail's pixel width, so a floor is a
	   division: the tightest section in the measured document needs 3px of
	   cursor travel at the hover magnification, and this cell width is what
	   guarantees it, plus the cell's own chrome (8px padding each side, the
	   24px reset button, the 6px gap). It is a tripwire, not a layout driver —
	   every real band leaves the cell wider than this — and it exists so a
	   future change to the header cluster fails visibly instead of quietly
	   starving the sweep.

	   Scoped to the same 720px gate the rail mounts at (RAIL_MEDIA_QUERY in
	   $lib/timeline/breakpoint.ts — the two MUST stay equal, or there is a
	   band where the rail exists with no floor under it). Below the gate the
	   cell is empty, and an unconditional min-width would make a 375px header
	   overflow sideways to reserve room for a rail that is not there.

	   A RESTING-state guarantee only, and `.search-expanded` is what says so.
	   Opening the search box deliberately squeezes the rail leftward — that is
	   the behaviour, not a regression. The suspension is not cosmetic either:
	   a min-width that outranks the squeeze does not protect anything — the
	   cell cannot shrink and the cluster beside it is flex-shrink-0, so the
	   overflow would come out of the RIGHT EDGE and push the theme toggle off
	   the viewport. A floor that defends the rail by pushing the controls off
	   screen is worse than no floor. */
	@media (min-width: 720px) {
		.thread-cell {
			min-width: 460px;
		}

		.app-header.search-expanded .thread-cell {
			min-width: 0;
		}
	}

	.search-slot {
		margin-right: 0;
	}

	@media (min-width: 860px) {
		.search-slot {
			margin-right: 4px;
		}
	}

	/* Quiet by default — it sits beside the rail all day and must not compete
	   with it — and unmistakable once armed. The armed colour is the shared
	   warning token, so both themes follow it. */
	.reset-btn {
		color: var(--color-text-muted);
		opacity: 0.55;
	}

	.reset-btn:hover {
		opacity: 1;
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	.reset-btn.is-armed {
		color: var(--color-warning);
		opacity: 1;
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
	}

	/* Each panel button keeps its 10% hover wash and gains a steadier 16%
	   while its panel is open, so the header always says which surface is on
	   screen. The is-active rules sit AFTER the hover rules on purpose: same
	   specificity, so source order is what keeps an open button's wash from
	   dimming under the pointer. */
	.playground-btn {
		color: var(--color-important);
	}

	.playground-btn:hover {
		background: color-mix(in srgb, var(--color-important) 10%, transparent);
	}

	.playground-btn.is-active {
		background: color-mix(in srgb, var(--color-important) 16%, transparent);
	}

	.agent-btn {
		color: var(--color-btn-agent);
	}

	.agent-btn:hover {
		background: color-mix(in srgb, var(--color-btn-agent) 10%, transparent);
	}

	.agent-btn.is-active {
		background: color-mix(in srgb, var(--color-btn-agent) 16%, transparent);
	}

	/* Same inviting treatment as the playground button, in the cheat
	   sheet's accent — matching its "Quick reference" callout on the page */
	.cheatsheet-btn {
		color: var(--color-primary);
	}

	.cheatsheet-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.cheatsheet-btn.is-active {
		background: color-mix(in srgb, var(--color-primary) 16%, transparent);
	}
</style>
