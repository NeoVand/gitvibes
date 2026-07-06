<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import CheatSheet from '$lib/components/layout/CheatSheet.svelte';
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
	import PartNav from '$lib/components/ui/PartNav.svelte';
	import { sectionIds } from '$lib/data/sections';
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
	let activeSection = $state('hero');
	let theme = $state<ThemePreference>('system');
	let navClickActive = false;

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

		const hash = window.location.hash.slice(1);
		if (hash && sectionIds.includes(hash as (typeof sectionIds)[number])) {
			activeSection = hash;
			navClickActive = true;
			requestAnimationFrame(() => {
				scrollToSection(hash, 'instant');
				keepSectionAligned(hash);
			});
		}

		const sectionEls = sectionIds
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
			if (best) activeSection = best;
		}

		let rafId = 0;
		function onScroll() {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(updateActiveSection);
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		updateActiveSection();

		if (window.innerWidth >= 1024) {
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

	function toggleCheatSheet() {
		if (!cheatSheetOpen) {
			playgroundOpen = false;
		}
		cheatSheetOpen = !cheatSheetOpen;
	}

	function togglePlayground() {
		if (!playgroundOpen) {
			cheatSheetOpen = false;
		}
		playgroundOpen = !playgroundOpen;
	}

	function openPlayground() {
		cheatSheetOpen = false;
		playgroundOpen = true;
	}
</script>

<svelte:head>
	<title>GitVibes -- Git for Vibe Coders</title>
	<meta
		name="description"
		content="An interactive guide to Git for developers using AI tools. Learn version control as your safety net for AI-assisted coding."
	/>
</svelte:head>

<a href="#main-content" class="skip-link">Skip to content</a>

<Header
	theme={getEffectiveThemeLocal()}
	onToggleTheme={toggleTheme}
	onToggleCheatSheet={toggleCheatSheet}
	onTogglePlayground={togglePlayground}
	onNavigate={handleNavigate}
/>
<Sidebar open={sidebarOpen} {activeSection} onToggle={toggleSidebar} onNavigate={handleNavigate} />
<CheatSheet open={cheatSheetOpen} onToggle={toggleCheatSheet} />
<PlaygroundPanel open={playgroundOpen} onToggle={togglePlayground} />

<main
	id="main-content"
	class="main-content transition-[margin-left] duration-200 ease-out"
	style="padding-top: var(--header-height); margin-left: {sidebarOpen
		? 'var(--sidebar-width)'
		: 'var(--sidebar-collapsed-width)'};"
>
	<Hero onOpenPlayground={openPlayground} />
	<Part1 />
	<PartNav
		prev={{ id: 'hero', label: 'Introduction' }}
		next={{ id: 'part-2', label: 'Core Safety Loop' }}
		onNavigate={handleNavigate}
	/>
	<Part2 />
	<PartNav
		prev={{ id: 'part-1', label: 'Enterprise Onboarding' }}
		next={{ id: 'part-3', label: 'Branching & PRs' }}
		onNavigate={handleNavigate}
	/>
	<Part3 />
	<PartNav
		prev={{ id: 'part-2', label: 'Core Safety Loop' }}
		next={{ id: 'part-4', label: 'Undo Toolkit' }}
		onNavigate={handleNavigate}
	/>
	<Part4 />
	<PartNav
		prev={{ id: 'part-3', label: 'Branching & PRs' }}
		next={{ id: 'part-5', label: 'Advanced Workflows' }}
		onNavigate={handleNavigate}
	/>
	<Part5 />
	<PartNav
		prev={{ id: 'part-4', label: 'Undo Toolkit' }}
		next={{ id: 'part-6', label: 'Git for AI Agents' }}
		onNavigate={handleNavigate}
	/>
	<Part6 />
	<PartNav
		prev={{ id: 'part-5', label: 'Advanced Workflows' }}
		next={{ id: 'part-7', label: 'VS Code Cockpit' }}
		onNavigate={handleNavigate}
	/>
	<Part7 />
	<PartNav
		prev={{ id: 'part-6', label: 'Git for AI Agents' }}
		next={{ id: 'part-8', label: 'Conclusion' }}
		onNavigate={handleNavigate}
	/>
	<Part8 onOpenPlayground={openPlayground} />

	<footer class="py-10 text-center" style="border-top: 1px solid var(--color-border);">
		<p class="text-xs" style="color: var(--color-text-muted);">
			Built for the vibe coding generation.
		</p>
	</footer>
</main>
