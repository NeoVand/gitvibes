<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
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

	function scrollToSection(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
		if (typeof window !== 'undefined') {
			const url = `${window.location.pathname}${window.location.search}#${id}`;
			history.replaceState(null, '', url);
		}
	}

	onMount(() => {
		theme = loadThemePreference();
		applyTheme(theme);

		const hash = window.location.hash.slice(1);
		if (hash && sectionIds.includes(hash as (typeof sectionIds)[number])) {
			activeSection = hash;
			navClickActive = true;
			requestAnimationFrame(() => scrollToSection(hash));
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
		scrollToSection(id);
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
	class="main-content transition-[margin-left] duration-200 ease-out"
	style="padding-top: var(--header-height); margin-left: {sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)'};"
>
	<Hero onOpenPlayground={openPlayground} />
	<Part1 />
	<Part2 />
	<Part3 />
	<Part4 />
	<Part5 />
	<Part6 />
	<Part7 onOpenPlayground={openPlayground} />

	<footer
		class="py-10 text-center"
		style="border-top: 1px solid var(--color-border);"
	>
		<p class="text-xs" style="color: var(--color-text-muted);">
			Built for the vibe coding generation.
		</p>
	</footer>
</main>
