<script lang="ts">
	import { onMount } from 'svelte';
	import BackgroundPixels from '$lib/components/layout/BackgroundPixels.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import CheatSheet from '$lib/components/layout/CheatSheet.svelte';
	import AgentPanel from '$lib/components/layout/AgentPanel.svelte';
	import PlaygroundPanel from '$lib/components/layout/PlaygroundPanel.svelte';
	import Hero from '$lib/components/sections/Hero.svelte';
	import Part1 from '$lib/components/sections/Part1.svelte';
	import Part2 from '$lib/components/sections/Part2.svelte';
	import Part3 from '$lib/components/sections/Part3.svelte';
	import Part4 from '$lib/components/sections/Part4.svelte';
	import Part5 from '$lib/components/sections/Part5.svelte';
	import Part6 from '$lib/components/sections/Part6.svelte';
	import Part7 from '$lib/components/sections/Part7.svelte';
	import Part8 from '$lib/components/sections/Part8.svelte';
	import Part9 from '$lib/components/sections/Part9.svelte';
	import { anchorIds } from '$lib/data/sections';
	import { markSectionVisited } from '$lib/data/progress';
	import { readingContext } from '$lib/ai/reading-context.svelte';
	import { decodeSharedFromHash, type SharedSession } from '$lib/playground/share';
	import {
		loadThemePreference,
		saveThemePreference,
		getEffectiveTheme,
		applyTheme,
		type ThemePreference
	} from '$lib/theme';

	let sidebarOpen = $state(false);
	let cheatSheetOpen = $state(false);
	let playgroundOpen = $state(false);
	let agentOpen = $state(false);
	let sharedSession = $state<SharedSession | null>(null);
	let activeSection = $state('hero');
	let theme = $state<ThemePreference>('system');
	let navClickActive = false;

	// Where the learner is reading — the agent's contextual suggestions
	// mirror the existing scroll-spy value, no second observer.
	$effect(() => {
		readingContext.sectionId = activeSection;
	});

	function getEffectiveThemeLocal(): 'light' | 'dark' {
		return getEffectiveTheme(theme);
	}

	function toggleTheme() {
		const effective = getEffectiveThemeLocal();
		theme = effective === 'dark' ? 'light' : 'dark';
		saveThemePreference(theme);
		applyTheme(theme);
	}

	function sectionScrollTop(el: HTMLElement): number {
		const headerHeight =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) ||
			48;
		return el.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
	}

	function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
		const el = document.getElementById(id);
		if (el) {
			window.scrollTo({ top: sectionScrollTop(el), behavior });
		}
		if (typeof window !== 'undefined') {
			const url = `${window.location.pathname}${window.location.search}#${id}`;
			history.replaceState(null, '', url);
		}
	}

	// Images above a deep-linked section load lazily and shift the layout after
	// the initial scroll lands, so keep re-aligning until things settle. A
	// layout shift moves the section's desired position; any other viewport
	// movement (scrollbar drag, keyboard, script) means someone else is
	// scrolling — they win and the loop stops.
	function keepSectionAligned(id: string, duration = 1500) {
		const started = performance.now();
		let lastDesired = -1;
		function tick() {
			if (!navClickActive) return;
			const el = document.getElementById(id);
			if (el) {
				const desired = sectionScrollTop(el);
				const layoutShifted = lastDesired === -1 || Math.abs(desired - lastDesired) > 2;
				if (!layoutShifted && Math.abs(window.scrollY - desired) > 2) {
					return;
				}
				if (Math.abs(window.scrollY - desired) > 2) {
					window.scrollTo({ top: desired, behavior: 'instant' });
				}
				lastDesired = desired;
			}
			if (performance.now() - started < duration) {
				requestAnimationFrame(tick);
			}
		}
		requestAnimationFrame(tick);
	}

	onMount(() => {
		theme = loadThemePreference();
		applyTheme(theme);

		// A shared playground session (#pg=...) opens the panel and replays
		const decoded = decodeSharedFromHash(window.location.hash);
		if (decoded) {
			sharedSession = decoded;
			playgroundOpen = true;
		}

		const hash = window.location.hash.slice(1);
		if (hash && anchorIds.includes(hash)) {
			activeSection = hash;
			navClickActive = true;
			requestAnimationFrame(() => {
				scrollToSection(hash, 'instant');
				keepSectionAligned(hash);
			});
		}

		const sectionEls = anchorIds
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => el !== null);

		function updateActiveSection() {
			if (navClickActive) return;
			const offset = window.innerHeight * 0.2;
			let best: string | null = null;
			for (const el of sectionEls) {
				if (el.getBoundingClientRect().top <= offset) {
					best = el.id;
				} else {
					break;
				}
			}
			if (best) {
				activeSection = best;
				markSectionVisited(best);
			}
		}

		let rafId = 0;
		let scrollbarTimer: ReturnType<typeof setTimeout> | undefined;
		function onScroll() {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(updateActiveSection);
			// Reveal the root scrollbar while scrolling; hide it after idle
			document.documentElement.classList.add('is-scrolling');
			clearTimeout(scrollbarTimer);
			scrollbarTimer = setTimeout(
				() => document.documentElement.classList.remove('is-scrolling'),
				800
			);
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		updateActiveSection();

		if (window.innerWidth >= 1024 && !playgroundOpen) {
			sidebarOpen = true;
		}

		const params = new URLSearchParams(window.location.search);
		if (params.has('playground')) {
			playgroundOpen = true;
			const url = `${window.location.pathname}${window.location.hash}`;
			history.replaceState(null, '', url);
		}

		const clearNavClick = () => {
			navClickActive = false;
		};
		window.addEventListener('wheel', clearNavClick, { passive: true });
		window.addEventListener('touchmove', clearNavClick, { passive: true });

		// Decorate every section anchor's heading with a copy-permalink button.
		for (const el of sectionEls) {
			const heading = el.querySelector('h2, h3, h4') ?? (/^H[2-4]$/.test(el.tagName) ? el : null);
			if (!heading || heading.querySelector('.heading-anchor')) continue;
			const anchor = document.createElement('a');
			anchor.className = 'heading-anchor';
			anchor.href = `#${el.id}`;
			anchor.textContent = '#';
			anchor.setAttribute('aria-label', 'Copy link to this section');
			anchor.addEventListener('click', (event) => {
				event.preventDefault();
				const url = `${location.origin}${location.pathname}#${el.id}`;
				history.replaceState(null, '', `#${el.id}`);
				navigator.clipboard?.writeText(url).catch(() => {});
			});
			heading.appendChild(anchor);
		}

		return () => {
			window.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(rafId);
			clearTimeout(scrollbarTimer);
			window.removeEventListener('wheel', clearNavClick);
			window.removeEventListener('touchmove', clearNavClick);
		};
	});

	function handleNavigate(id: string) {
		activeSection = id;
		navClickActive = true;
		// Jump instantly: a smooth scroll across a page this tall takes long
		// enough that lazy content materializes mid-flight and the target
		// drifts. The alignment loop absorbs any shifts that land afterwards.
		scrollToSection(id, 'instant');
		keepSectionAligned(id, 2500);
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	// Opening the playground panel enters desktop "reading mode": the sidebar
	// auto-collapses and the content reflows beside the panel. The sidebar's
	// prior state is restored when the panel closes.
	let sidebarBeforePanel = false;

	/** Call BEFORE opening a reading-mode panel. */
	function enterReadingMode() {
		if (!playgroundOpen && !agentOpen) {
			sidebarBeforePanel = sidebarOpen;
			sidebarOpen = false;
		}
	}

	/** Call AFTER closing a reading-mode panel — restores the sidebar. */
	function maybeLeaveReadingMode() {
		if (!playgroundOpen && !agentOpen) {
			sidebarOpen = sidebarBeforePanel;
		}
	}

	function toggleCheatSheet() {
		if (!cheatSheetOpen) {
			playgroundOpen = false;
			agentOpen = false;
			maybeLeaveReadingMode();
		}
		cheatSheetOpen = !cheatSheetOpen;
	}

	function togglePlayground() {
		if (!playgroundOpen) {
			enterReadingMode();
			cheatSheetOpen = false;
			agentOpen = false;
			playgroundOpen = true;
		} else {
			playgroundOpen = false;
			maybeLeaveReadingMode();
		}
	}

	function toggleAgent() {
		if (!agentOpen) {
			enterReadingMode();
			cheatSheetOpen = false;
			playgroundOpen = false;
			agentOpen = true;
		} else {
			agentOpen = false;
			maybeLeaveReadingMode();
		}
	}

	function openPlayground() {
		if (!playgroundOpen) {
			enterReadingMode();
		}
		cheatSheetOpen = false;
		agentOpen = false;
		playgroundOpen = true;
	}
</script>

<svelte:head>
	<title>GitVibes -- Git for Vibe Coders</title>
	<meta
		name="description"
		content="An interactive guide to Git for developers using AI tools. Learn version control as your safety net for AI-assisted coding."
	/>
	<link rel="canonical" href="https://neovand.github.io/gitvibes/" />
	<!-- Safe {@html}: the payload is JSON.stringify of a static literal — no
	     user input can reach it. It exists only to emit the JSON-LD script tag,
	     which Svelte cannot render any other way. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: 'GitVibes — Git for Vibe Coders',
		description:
			'A free, interactive Git course for developers who work with AI coding agents: the core safety loop, branching and PRs, the undo toolkit, advanced workflows, Git guardrails for AI agents, and how modern software ships (CI, bots, releases) — with 22 hands-on exercises in a real in-browser Git playground.',
		url: 'https://neovand.github.io/gitvibes/',
		provider: {
			'@type': 'Organization',
			name: 'GitVibes',
			url: 'https://neovand.github.io/gitvibes/'
		},
		isAccessibleForFree: true,
		educationalLevel: 'Beginner',
		teaches: [
			'Git fundamentals (status, staging, commits)',
			'Branching and pull requests',
			'Undoing mistakes (restore, reset, revert, reflog)',
			'Merge and rebase conflict resolution',
			'Git workflows for AI coding agents (AGENTS.md, hooks, worktrees)',
			'CI/CD, dependency and security bots, and automated releases (Dependabot, CodeQL, release-please)'
		],
		hasCourseInstance: {
			'@type': 'CourseInstance',
			courseMode: 'Online',
			courseWorkload: 'PT6H'
		},
		offers: {
			'@type': 'Offer',
			price: 0,
			priceCurrency: 'USD',
			category: 'Free'
		}
	})}</scr${''}ipt>`}
</svelte:head>

<a href="#main-content" class="skip-link">Skip to content</a>

<BackgroundPixels />

<Header
	theme={getEffectiveThemeLocal()}
	onToggleTheme={toggleTheme}
	onToggleCheatSheet={toggleCheatSheet}
	onTogglePlayground={togglePlayground}
	onToggleAgent={toggleAgent}
	onNavigate={handleNavigate}
/>
<Sidebar open={sidebarOpen} {activeSection} onToggle={toggleSidebar} onNavigate={handleNavigate} />
<CheatSheet open={cheatSheetOpen} onToggle={toggleCheatSheet} />
<PlaygroundPanel open={playgroundOpen} onToggle={togglePlayground} shared={sharedSession} />
<AgentPanel open={agentOpen} onToggle={toggleAgent} onNavigate={handleNavigate} />

<main
	id="main-content"
	class="main-content transition-[margin] duration-200 ease-out"
	class:reading-mode={playgroundOpen || agentOpen}
	style="padding-top: var(--header-height); margin-left: {sidebarOpen
		? 'var(--sidebar-width)'
		: 'var(--sidebar-collapsed-width)'};"
>
	<Hero onOpenPlayground={openPlayground} />
	<Part1 />
	<Part2 />
	<Part3 />
	<Part4 />
	<Part5 />
	<Part6 />
	<Part7 />
	<Part8 />
	<Part9 onOpenPlayground={openPlayground} />

	<footer class="py-10 text-center" style="border-top: 1px solid var(--color-border);">
		<p class="text-xs" style="color: var(--color-text-muted);">
			Built for the vibe coding generation.
		</p>
	</footer>
</main>
