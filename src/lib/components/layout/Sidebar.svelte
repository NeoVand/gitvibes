<script lang="ts">
	import {
		Laptop,
		RefreshCw,
		GitBranch,
		Undo2,
		Layers,
		Monitor,
		BookOpen,
		ChevronRight,
		Rocket
	} from 'lucide-svelte';
	let {
		open = false,
		activeSection = '',
		onClose
	}: { open: boolean; activeSection: string; onClose: () => void } = $props();

	interface SectionItem {
		id: string;
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		children?: { id: string; label: string }[];
	}

	const sections: SectionItem[] = [
		{
			id: 'hero',
			label: 'Introduction',
			icon: Rocket
		},
		{
			id: 'part-1',
			label: 'Enterprise Onboarding',
			icon: Laptop,
			children: [
				{ id: 'section-1-1', label: 'Git Configuration' },
				{ id: 'section-1-2', label: 'Authentication' },
				{ id: 'section-1-3', label: 'Cloning a Repo' }
			]
		},
		{
			id: 'part-2',
			label: 'Core Safety Loop',
			icon: RefreshCw,
			children: [
				{ id: 'section-2-1', label: 'git status' },
				{ id: 'section-2-2', label: 'Staging Changes' },
				{ id: 'section-2-3', label: 'Committing' }
			]
		},
		{
			id: 'part-3',
			label: 'Branching & PRs',
			icon: GitBranch,
			children: [
				{ id: 'section-3-1', label: 'Creating Branches' },
				{ id: 'section-3-2', label: 'Syncing Changes' },
				{ id: 'section-3-3', label: 'Pull Requests' }
			]
		},
		{
			id: 'part-4',
			label: 'Undo Toolkit',
			icon: Undo2,
			children: [
				{ id: 'section-4-1', label: 'Discard Local' },
				{ id: 'section-4-2', label: 'Unstage Files' },
				{ id: 'section-4-3', label: 'Amend Commits' },
				{ id: 'section-4-4', label: 'Reset (Local)' },
				{ id: 'section-4-5', label: 'Revert (Public)' },
				{ id: 'section-4-6', label: 'Force Push' },
				{ id: 'section-4-7', label: 'Recovery Matrix' }
			]
		},
		{
			id: 'part-5',
			label: 'Advanced Workflows',
			icon: Layers,
			children: [
				{ id: 'section-5-1', label: 'Git Stash' },
				{ id: 'section-5-2', label: 'Rebase vs Merge' },
				{ id: 'section-5-3', label: 'Merge Conflicts' }
			]
		},
		{
			id: 'part-6',
			label: 'VS Code Cockpit',
			icon: Monitor,
			children: [
				{ id: 'section-6-1', label: 'Source Control View' },
				{ id: 'section-6-2', label: 'Timeline & GitLens' },
				{ id: 'section-6-3', label: 'Merge Editor' }
			]
		},
		{
			id: 'part-7',
			label: 'Conclusion',
			icon: BookOpen,
			children: [
				{ id: 'section-7-1', label: 'AI-First Workflow' },
				{ id: 'section-7-2', label: 'Teaching AI Git' },
				{ id: 'section-quick-ref', label: 'Quick Reference' }
			]
		}
	];

	let expandedSections = $state<Set<string>>(new Set());

	function toggleSection(id: string) {
		const next = new Set(expandedSections);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedSections = next;
	}

	function scrollTo(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
			if (window.innerWidth < 1024) onClose();
		}
	}

	function isActive(sectionId: string): boolean {
		return activeSection === sectionId || activeSection.startsWith(sectionId.replace('part-', 'section-'));
	}

	// Auto-expand the section containing the active subsection
	$effect(() => {
		for (const section of sections) {
			if (section.children?.some((c) => c.id === activeSection)) {
				expandedSections = new Set([...expandedSections, section.id]);
			}
		}
	});
</script>

<!-- Backdrop on mobile -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={onClose}
		aria-label="Close sidebar"
	></button>
{/if}

<aside
	class="fixed top-0 bottom-0 left-0 z-40 flex flex-col overflow-y-auto border-r transition-transform duration-300"
	style="width: var(--sidebar-width); padding-top: var(--header-height); border-color: var(--color-border); background: var(--color-bg-secondary);"
	class:translate-x-0={open}
	class:-translate-x-full={!open}
>
	<nav class="flex-1 px-3 py-4">
		{#each sections as section}
			{@const active = isActive(section.id)}
			<div class="mb-1">
				<button
					onclick={() => {
						if (section.children) {
							toggleSection(section.id);
							scrollTo(section.id);
						} else {
							scrollTo(section.id);
						}
					}}
					class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors"
					style="color: {active ? 'var(--color-primary)' : 'var(--color-text-secondary)'}; background: {active ? 'var(--color-primary-dim)' : 'transparent'};"
				>
					<section.icon size={16} />
					<span class="flex-1 font-medium">{section.label}</span>
					{#if section.children}
						<ChevronRight
							size={14}
							class="transition-transform"
							style="transform: rotate({expandedSections.has(section.id) ? '90deg' : '0deg'});"
						/>
					{/if}
				</button>

				{#if section.children && expandedSections.has(section.id)}
					<div class="mt-1 ml-6 space-y-0.5 border-l pl-3" style="border-color: var(--color-border);">
						{#each section.children as child}
							{@const childActive = activeSection === child.id}
							<button
								onclick={() => scrollTo(child.id)}
								class="block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors"
								style="color: {childActive ? 'var(--color-primary)' : 'var(--color-text-muted)'}; background: {childActive ? 'var(--color-primary-dim)' : 'transparent'};"
							>
								{child.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>
</aside>
