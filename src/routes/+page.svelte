<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ScrollProgress from '$lib/components/layout/ScrollProgress.svelte';
	import Hero from '$lib/components/sections/Hero.svelte';
	import Part1 from '$lib/components/sections/Part1.svelte';
	import Part2 from '$lib/components/sections/Part2.svelte';
	import Part3 from '$lib/components/sections/Part3.svelte';
	import Part4 from '$lib/components/sections/Part4.svelte';
	import Part5 from '$lib/components/sections/Part5.svelte';
	import Part6 from '$lib/components/sections/Part6.svelte';
	import Part7 from '$lib/components/sections/Part7.svelte';

	let sidebarOpen = $state(false);
	let activeSection = $state('hero');

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
				// Pick the first visible section in document order
				for (const id of sectionIds) {
					if (visibleSections.has(id)) {
						activeSection = id;
						break;
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

		// Responsive sidebar: open by default on desktop
		if (window.innerWidth >= 1024) {
			sidebarOpen = true;
		}

		return () => observer.disconnect();
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
</script>

<svelte:head>
	<title>Git for Vibe Coders | The AI-First Developer's Guide</title>
	<meta
		name="description"
		content="An interactive guide to Git for developers using AI tools. Learn version control as your safety net for AI-assisted coding."
	/>
</svelte:head>

<ScrollProgress />
<Header {sidebarOpen} onToggleSidebar={toggleSidebar} />
<Sidebar open={sidebarOpen} {activeSection} onClose={() => (sidebarOpen = false)} />

<main
	class="transition-[margin-left] duration-300"
	style="padding-top: var(--header-height); margin-left: {sidebarOpen ? 'var(--sidebar-width)' : '0'};"
>
	<Hero />

	<div
		class="divide-y"
		style="border-color: var(--color-border-light);"
	>
		<Part1 />
		<Part2 />
		<Part3 />
		<Part4 />
		<Part5 />
		<Part6 />
		<Part7 />
	</div>

	<footer
		class="py-12 text-center"
		style="background: var(--color-bg-secondary); border-top: 1px solid var(--color-border);"
	>
		<p class="text-sm" style="color: var(--color-text-muted);">
			Built for the vibe coding generation. Git is your safety net.
		</p>
	</footer>
</main>
