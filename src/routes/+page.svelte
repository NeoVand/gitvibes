<script lang="ts">
	import { onMount } from 'svelte';
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

	let sidebarOpen = $state(false);
	let cheatSheetOpen = $state(false);
	let activeSection = $state('hero');
	let theme = $state<'light' | 'dark' | 'system'>('system');
	let navClickActive = false;

	const sectionIds = [
		'hero',
		'part-1',
		'section-1-1',
		'section-1-2',
		'section-1-3',
		'part-2',
		'section-2-1',
		'section-2-2',
		'section-2-3',
		'part-3',
		'section-3-1',
		'section-3-2',
		'section-3-3',
		'part-4',
		'section-4-1',
		'section-4-2',
		'section-4-3',
		'section-4-4',
		'section-4-5',
		'section-4-6',
		'section-4-7',
		'part-5',
		'section-5-1',
		'section-5-2',
		'section-5-3',
		'part-6',
		'section-6-1',
		'section-6-2',
		'section-6-3',
		'part-7',
		'section-7-1',
		'section-7-2',
		'section-quick-ref'
	];

	function getEffectiveTheme(): 'light' | 'dark' {
		if (theme !== 'system') return theme;
		if (typeof window === 'undefined') return 'dark';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function toggleTheme() {
		const effective = getEffectiveTheme();
		theme = effective === 'dark' ? 'light' : 'dark';
		applyTheme();
	}

	function applyTheme() {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		if (theme !== 'system') {
			root.classList.add(theme);
		}
	}

	onMount(() => {
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

<Header theme={getEffectiveTheme()} onToggleTheme={toggleTheme} onToggleCheatSheet={toggleCheatSheet} />
<Sidebar open={sidebarOpen} {activeSection} onToggle={toggleSidebar} onNavigate={handleNavigate} />
<CheatSheet open={cheatSheetOpen} onToggle={toggleCheatSheet} />

<main
	class="transition-[margin-left] duration-200 ease-out"
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
