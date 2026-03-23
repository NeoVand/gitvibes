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
		onToggle,
		onNavigate
	}: { open: boolean; activeSection: string; onToggle: () => void; onNavigate: (id: string) => void } =
		$props();

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
			icon: Rocket,
			children: [
				{ id: 'section-intro-what', label: 'What Is Git?' },
				{ id: 'section-intro-install', label: 'Installing Git' },
				{ id: 'section-intro-repo', label: 'What Is a Repository?' }
			]
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
	let flyoutSection = $state<string | null>(null);
	let flyoutY = $state(0);

	function toggleSection(id: string) {
		const next = new Set(expandedSections);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedSections = next;
	}

	function scrollTo(id: string) {
		const el = document.getElementById(id);
		if (el) {
			onNavigate(id);
			el.scrollIntoView({ behavior: 'smooth' });
			if (window.innerWidth < 1024) onToggle();
		}
	}

	function isActive(sectionId: string): boolean {
		if (activeSection === sectionId) return true;
		if (sectionId === 'hero') return activeSection === 'hero' || activeSection.startsWith('section-intro-');
		const partNum = sectionId.replace('part-', '');
		return activeSection.startsWith(`section-${partNum}-`);
	}

	function openFlyout(sectionId: string, event: MouseEvent) {
		const btn = event.currentTarget as HTMLElement;
		const rect = btn.getBoundingClientRect();
		flyoutY = rect.top;
		flyoutSection = flyoutSection === sectionId ? null : sectionId;
	}

	function closeFlyout() {
		flyoutSection = null;
	}

	function handleFlyoutNavigate(id: string) {
		scrollTo(id);
		closeFlyout();
	}

	$effect(() => {
		const current = activeSection;
		for (const section of sections) {
			if (
				section.children?.some((c) => c.id === current) &&
				!expandedSections.has(section.id)
			) {
				expandedSections = new Set([...expandedSections, section.id]);
				break;
			}
		}
	});
</script>

<!-- Backdrop on mobile when expanded -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
		onclick={onToggle}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Flyout backdrop (click outside to close) -->
{#if flyoutSection && !open}
	<button
		class="fixed inset-0 z-40"
		onclick={closeFlyout}
		aria-label="Close flyout"
	></button>
{/if}

<!-- ───── EXPANDED SIDEBAR ───── -->
<aside
	class="fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-200 ease-out"
	style="width: var(--sidebar-width); padding-top: var(--header-height); background: linear-gradient(to right, var(--color-bg-secondary), transparent);"
	class:translate-x-0={open}
	class:-translate-x-full={!open}
>
	<div
		class="flex items-center justify-between px-4 py-2"
	>
		<span
			class="text-xs font-semibold tracking-wider uppercase"
			style="color: var(--color-text-muted); letter-spacing: 0.08em;"
		>
			Contents
		</span>
		<button
			onclick={onToggle}
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
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
				<div
					class="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] transition-colors"
					style="color: {active ? 'var(--color-primary-text)' : 'var(--color-text-secondary)'}; font-weight: {active ? '600' : '500'};"
				>
					<button
						onclick={() => {
							if (section.children) {
								if (!expandedSections.has(section.id)) {
									toggleSection(section.id);
								}
							}
							scrollTo(section.id);
						}}
						class="flex flex-1 cursor-pointer items-center gap-2 text-left"
						style="color: inherit;"
					>
						<svelte:component this={section.icon} size={14} strokeWidth={active ? 2.5 : 2} />
						<span class="flex-1">{section.label}</span>
					</button>
					{#if section.children}
						<button
							onclick={() => toggleSection(section.id)}
							class="flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors"
							aria-label={expandedSections.has(section.id) ? 'Collapse' : 'Expand'}
						>
							<ChevronRight
								size={12}
								class="transition-transform duration-150"
								style="transform: rotate({expandedSections.has(section.id) ? '90deg' : '0deg'}); opacity: 0.5;"
							/>
						</button>
					{/if}
				</div>

				{#if section.children && expandedSections.has(section.id)}
					<div
						class="mt-0.5 ml-[22px] space-y-px pl-2.5"
					>
						{#each section.children as child}
							{@const childActive = activeSection === child.id}
							<button
								onclick={() => scrollTo(child.id)}
								class="block w-full cursor-pointer px-2 py-[5px] text-left text-xs transition-colors"
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

<!-- ───── COLLAPSED ICON RAIL ───── -->
{#if !open}
	<aside
		class="fixed top-0 bottom-0 left-0 z-40 flex flex-col items-center py-2 max-lg:hidden"
		style="width: var(--sidebar-collapsed-width); padding-top: calc(var(--header-height) + 8px); background: linear-gradient(to right, var(--color-bg-secondary), transparent);"
	>
		<!-- Expand button -->
		<button
			onclick={onToggle}
			class="mb-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors"
			style="color: var(--color-text-muted);"
			aria-label="Expand sidebar"
		>
			<PanelLeft size={16} />
		</button>

		<div class="mb-2"></div>

		<!-- Icon buttons -->
		{#each sections as section}
			{@const active = isActive(section.id)}
			{@const isFlyoutOpen = flyoutSection === section.id}
			<button
				onclick={(e) => {
					if (section.children) {
						openFlyout(section.id, e);
					} else {
						scrollTo(section.id);
						closeFlyout();
					}
				}}
				class="group relative mb-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-all"
				style="color: {active ? 'var(--color-primary-text)' : 'var(--color-text-muted)'};"
				aria-label={section.label}
			>
				<svelte:component
					this={section.icon}
					size={16}
					strokeWidth={active ? 2.5 : 1.8}
				/>
				<!-- Tooltip (only when no flyout is open) -->
				{#if !flyoutSection}
					<span
						class="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
						style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);"
					>
						{section.label}
					</span>
				{/if}
			</button>
		{/each}
	</aside>

	<!-- ───── FLYOUT PANEL ───── -->
	{#if flyoutSection}
		{@const section = sections.find((s) => s.id === flyoutSection)}
		{#if section}
			<div
				class="fixed z-50 min-w-[180px] rounded-lg border shadow-xl"
				style="left: calc(var(--sidebar-collapsed-width) + 6px); top: {flyoutY}px; background: var(--color-surface); border-color: var(--color-border);"
			>
				<!-- Flyout header -->
				<button
					onclick={() => {
						handleFlyoutNavigate(section.id);
					}}
					class="flex w-full cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors"
					style="color: var(--color-text); border-bottom: 1px solid var(--color-border-light);"
				>
					<svelte:component this={section.icon} size={14} />
					{section.label}
				</button>

				<!-- Flyout children -->
				{#if section.children}
					<div class="px-1.5 py-1.5">
						{#each section.children as child}
							{@const childActive = activeSection === child.id}
							<button
								onclick={() => handleFlyoutNavigate(child.id)}
								class="block w-full cursor-pointer rounded-md px-2.5 py-[6px] text-left text-xs transition-colors"
								style="color: {childActive ? 'var(--color-primary-text)' : 'var(--color-text-secondary)'}; font-weight: {childActive ? '600' : '400'}; background: {childActive ? 'var(--color-primary-dim)' : 'transparent'};"
							>
								{child.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
{/if}
