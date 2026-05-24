<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import CheatSheet from '$lib/components/layout/CheatSheet.svelte';
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

		const visibleSections = new Set<string>();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visibleSections.add(entry.target.id);
					} else {
						visibleSections.delete(entry.target.id);
					}
				}
				if (!navClickActive) {
					for (const id of sectionIds) {
						if (visibleSections.has(id)) {
							activeSection = id;
							break;
						}
					}
				}
			},
			{
				rootMargin: '-10% 0px -70% 0px',
				threshold: 0
			}
		);

		for (const id of sectionIds) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}

		if (window.innerWidth >= 1024) {
			sidebarOpen = true;
		}

		const clearNavClick = () => {
			navClickActive = false;
		};
		window.addEventListener('wheel', clearNavClick, { passive: true });
		window.addEventListener('touchmove', clearNavClick, { passive: true });

		return () => {
			observer.disconnect();
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
		cheatSheetOpen = !cheatSheetOpen;
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
	onNavigate={handleNavigate}
/>
<Sidebar open={sidebarOpen} {activeSection} onToggle={toggleSidebar} onNavigate={handleNavigate} />
<CheatSheet open={cheatSheetOpen} onToggle={toggleCheatSheet} />

<main
	class="main-content transition-[margin-left] duration-200 ease-out"
	style="padding-top: var(--header-height); margin-left: {sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)'};"
>
	<Hero />
	<Part1 />
	<Part2 />
	<Part3 />
	<Part4 />
	<Part5 />
	<Part6 />
	<Part7 />

	<footer
		class="py-10 text-center"
		style="border-top: 1px solid var(--color-border);"
	>
		<p class="text-xs" style="color: var(--color-text-muted);">
			Built for the vibe coding generation.
		</p>
	</footer>
</main>
