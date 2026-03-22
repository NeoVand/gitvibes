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
		Rocket,
		PanelLeftClose,
		PanelLeft
	} from 'lucide-svelte';

	let {
		open = false,
		activeSection = '',
		onToggle
	}: { open: boolean; activeSection: string; onToggle: () => void } = $props();

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
			if (window.innerWidth < 1024) onToggle();
		}
	}

	function isActive(sectionId: string): boolean {
		if (activeSection === sectionId) return true;
		const partNum = sectionId.replace('part-', '');
		return activeSection.startsWith(`section-${partNum}-`);
	}

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
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
		onclick={onToggle}
		aria-label="Close sidebar"
	></button>
{/if}

<aside
	class="fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r transition-transform duration-200 ease-out"
	style="width: var(--sidebar-width); padding-top: var(--header-height); border-color: var(--color-border); background: var(--color-bg-secondary);"
	class:translate-x-0={open}
	class:-translate-x-full={!open}
>
	<!-- Sidebar header with collapse -->
	<div
		class="flex items-center justify-between border-b px-4 py-3"
		style="border-color: var(--color-border);"
	>
		<span class="text-xs font-semibold tracking-wider uppercase" style="color: var(--color-text-muted); letter-spacing: 0.08em;">
			Contents
		</span>
		<button
			onclick={onToggle}
			class="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
			style="color: var(--color-text-muted);"
			aria-label="Collapse sidebar"
		>
			<PanelLeftClose size={15} />
		</button>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 py-3">
		{#each sections as section}
			{@const active = isActive(section.id)}
			<div class="mb-0.5">
				<button
					onclick={() => {
						if (section.children) {
							toggleSection(section.id);
							scrollTo(section.id);
						} else {
							scrollTo(section.id);
						}
					}}
					class="flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors"
					style="color: {active ? 'var(--color-primary-text)' : 'var(--color-text-secondary)'}; background: {active ? 'var(--color-primary-dim)' : 'transparent'}; font-weight: {active ? '600' : '500'};"
				>
					<svelte:component this={section.icon} size={14} strokeWidth={active ? 2.5 : 2} />
					<span class="flex-1">{section.label}</span>
					{#if section.children}
						<ChevronRight
							size={12}
							class="transition-transform duration-150"
							style="transform: rotate({expandedSections.has(section.id) ? '90deg' : '0deg'}); opacity: 0.5;"
						/>
					{/if}
				</button>

				{#if section.children && expandedSections.has(section.id)}
					<div class="mt-0.5 ml-[22px] space-y-px border-l pl-2.5" style="border-color: var(--color-border);">
						{#each section.children as child}
							{@const childActive = activeSection === child.id}
							<button
								onclick={() => scrollTo(child.id)}
								class="block w-full rounded-md px-2 py-[5px] text-left text-xs transition-colors"
								style="color: {childActive ? 'var(--color-primary-text)' : 'var(--color-text-muted)'}; font-weight: {childActive ? '600' : '400'};"
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

<!-- Collapsed sidebar toggle -->
{#if !open}
	<button
		onclick={onToggle}
		class="fixed z-40 flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
		style="top: calc(var(--header-height) + 12px); left: 12px; background: var(--color-surface); border-color: var(--color-border); color: var(--color-text-muted);"
		aria-label="Open sidebar"
	>
		<PanelLeft size={15} />
	</button>
{/if}
