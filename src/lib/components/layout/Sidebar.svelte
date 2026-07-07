<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { ChevronRight, PanelLeftClose, PanelLeft, RotateCcw } from 'lucide-svelte';
	import { autohideScroll } from '$lib/actions/autohide-scroll';
	import { sidebarNav, type NavItem } from '$lib/data/sidebar-nav';
	import { sectionIds } from '$lib/data/sections';
	import { progress, resetProgress } from '$lib/data/progress';
	import { lessonScenarioIds } from '$lib/playground/scenarios';

	let {
		open = false,
		activeSection = '',
		onToggle,
		onNavigate
	}: {
		open: boolean;
		activeSection: string;
		onToggle: () => void;
		onNavigate: (id: string) => void;
	} = $props();

	const sections = sidebarNav;

	// Reading progress: share of content sections ever scrolled into view.
	// Exercise progress: lesson scenarios with a recorded completion.
	const readPct = $derived(
		Math.round((sectionIds.filter((id) => $progress.sections[id]).length / sectionIds.length) * 100)
	);
	const doneCount = $derived(
		(lessonScenarioIds as readonly string[]).filter((id) => $progress.scenarios[id]).length
	);
	const isDone = (id: string) => Boolean($progress.scenarios[id]);

	const expandedSections = new SvelteSet<string>();
	const manuallyExpanded = new SvelteSet<string>();
	let flyoutSection = $state<string | null>(null);
	let flyoutY = $state(0);

	// Resetting wipes every recording (bar, ✔ ticks, checklist) — ask twice.
	let resetArmed = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	function handleResetProgress() {
		if (!resetArmed) {
			resetArmed = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (resetArmed = false), 2500);
			return;
		}
		clearTimeout(resetTimer);
		resetArmed = false;
		resetProgress();
	}

	function toggleSection(id: string) {
		if (expandedSections.has(id)) {
			expandedSections.delete(id);
			manuallyExpanded.delete(id);
		} else {
			expandedSections.add(id);
			manuallyExpanded.add(id);
		}
	}

	function scrollTo(id: string, closeSidebarOnMobile = true) {
		const el = document.getElementById(id);
		if (el) {
			onNavigate(id);
			if (closeSidebarOnMobile && open && window.innerWidth < 1024) onToggle();
		}
	}

	function isActive(sectionId: string): boolean {
		if (activeSection === sectionId) return true;
		if (sectionId === 'hero')
			return activeSection === 'hero' || activeSection.startsWith('section-intro-');
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
		scrollTo(id, false);
		closeFlyout();
	}

	$effect(() => {
		const current = activeSection;
		let activeSectionParent: string | null = null;
		for (const section of sections) {
			if (section.children?.some((c) => c.id === current)) {
				activeSectionParent = section.id;
				break;
			}
		}
		if (activeSectionParent && isActive(activeSectionParent)) {
			for (const id of [...expandedSections]) {
				if (!manuallyExpanded.has(id) && id !== activeSectionParent) {
					expandedSections.delete(id);
				}
			}
			expandedSections.add(activeSectionParent);
		}
	});
</script>

{#snippet navIcon(item: NavItem, active: boolean, size: number)}
	{@const Icon = item.icon}
	<Icon {size} strokeWidth={active ? 2.5 : 2} />
{/snippet}

<!-- Backdrop on mobile when expanded -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/30 lg:hidden"
		onclick={onToggle}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Flyout backdrop (click outside to close) -->
{#if flyoutSection && !open}
	<button class="fixed inset-0 z-40" onclick={closeFlyout} aria-label="Close flyout"></button>
{/if}

<!-- ───── EXPANDED SIDEBAR ───── -->
<aside
	class="sidebar-expanded fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r transition-all duration-200 ease-out"
	style="width: var(--sidebar-width); padding-top: var(--header-height); border-color: var(--color-border-light);"
	class:translate-x-0={open}
	class:-translate-x-full={!open}
>
	<div class="flex items-center justify-between px-4 py-3">
		<span
			class="text-xs font-bold tracking-widest uppercase"
			style="color: var(--color-text-muted); letter-spacing: 0.14em; font-family: var(--font-heading);"
		>
			Contents
		</span>
		<button
			onclick={onToggle}
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Collapse sidebar"
		>
			<PanelLeftClose size={16} />
		</button>
	</div>

	{#if readPct > 0 || doneCount > 0}
		<div
			class="px-4 pb-2"
			title="{readPct}% read · {doneCount}/{lessonScenarioIds.length} exercises completed"
		>
			<!-- mr-1 puts the reset button on the same vertical axis (30px from
			     the right edge) as the section carets and the collapse button -->
			<div class="flex items-center">
				<div
					class="h-1 flex-1 overflow-hidden rounded-full"
					style="background: var(--color-border);"
				>
					<div
						class="h-full rounded-full transition-all duration-500"
						style="width: {readPct}%; background: var(--color-primary);"
					></div>
				</div>
				<button
					onclick={handleResetProgress}
					class="mr-1 ml-2 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-all hover:opacity-100"
					style="color: {resetArmed
						? 'var(--color-warning)'
						: 'var(--color-text-muted)'}; opacity: {resetArmed ? '1' : '0.6'};"
					aria-label={resetArmed ? 'Click again to reset all progress' : 'Reset progress'}
					title={resetArmed ? 'Click again to reset all progress' : 'Reset progress'}
				>
					<RotateCcw size={11} />
				</button>
			</div>
			<p class="mt-1 text-[10.5px]" style="color: var(--color-text-muted);">
				{#if resetArmed}
					Click again to reset all progress
				{:else}
					{readPct}% read · {doneCount}/{lessonScenarioIds.length} exercises
				{/if}
			</p>
		</div>
	{/if}

	<nav class="flex-1 overflow-y-auto px-3 py-2" use:autohideScroll>
		{#each sections as section (section.id)}
			{@const active = isActive(section.id)}
			<div class="mb-0.5">
				<div
					class="nav-item relative flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-all"
					style="color: {active ? 'var(--color-primary)' : 'var(--color-text)'};"
				>
					{#if active}
						<span
							class="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full"
							style="background: var(--color-primary);"
						></span>
					{/if}
					<button
						onclick={() => {
							if (section.children) {
								if (!expandedSections.has(section.id)) {
									toggleSection(section.id);
								}
							}
							scrollTo(section.id);
						}}
						class="flex flex-1 cursor-pointer items-center gap-2.5 text-left"
						style="color: inherit;"
					>
						{@render navIcon(section, active, 17)}
						<span
							class="flex-1"
							style="font-family: var(--font-heading); font-weight: {active
								? '700'
								: '500'}; font-size: 14.5px; letter-spacing: -0.01em;"
						>
							{section.label}
						</span>
					</button>
					{#if section.children}
						<!-- -mr-1 lines the caret up with the collapse and reset buttons
						     (all centered 30px from the sidebar's right edge) -->
						<button
							onclick={() => toggleSection(section.id)}
							class="-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors"
							aria-label={expandedSections.has(section.id) ? 'Collapse' : 'Expand'}
						>
							<ChevronRight
								size={13}
								class="transition-transform duration-150"
								style="transform: rotate({expandedSections.has(section.id)
									? '90deg'
									: '0deg'}); opacity: 0.5;"
							/>
						</button>
					{/if}
				</div>

				{#if section.children && expandedSections.has(section.id)}
					<div
						class="mt-0.5 ml-[28px] space-y-0.5 border-l pl-3"
						style="border-color: var(--color-border);"
					>
						{#each section.children as child (child.id)}
							{@const childActive = activeSection === child.id}
							{@const playgroundColor = child.isPlayground ? 'var(--color-important)' : undefined}
							<button
								onclick={() => scrollTo(child.id)}
								class="nav-child-item relative flex w-full cursor-pointer items-center gap-2 py-1.5 text-left text-[13px] transition-all"
								class:pl-5={child.isPlayground}
								class:px-2.5={!child.isPlayground}
								style="color: {playgroundColor ??
									(childActive
										? 'var(--color-primary)'
										: 'var(--color-text-muted)')}; font-weight: {childActive
									? '600'
									: '400'}; opacity: {child.isPlayground && !childActive
									? '0.7'
									: '1'}; font-size: {child.isPlayground ? '12px' : '13px'};"
							>
								{@render navIcon(child, childActive, child.isPlayground ? 11 : 13)}
								<span
									>{child.label}{#if child.isPlayground && isDone(child.id)}<span
											class="ml-1"
											style="color: var(--color-tip);">✔</span
										>{/if}</span
								>
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
		class="sidebar-collapsed fixed top-0 bottom-0 left-0 z-40 flex flex-col items-center border-r py-2"
		style="width: var(--sidebar-collapsed-width); padding-top: calc(var(--header-height) + 8px); border-color: var(--color-border-light);"
	>
		<button
			onclick={onToggle}
			class="mb-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="Expand sidebar"
		>
			<PanelLeft size={17} />
		</button>

		<div class="mb-1.5"></div>

		{#each sections as section (section.id)}
			{@const active = isActive(section.id)}
			<button
				onclick={(e) => {
					if (section.children) {
						openFlyout(section.id, e);
					} else {
						scrollTo(section.id);
						closeFlyout();
					}
				}}
				onmouseenter={(e) => {
					if (section.children) {
						openFlyout(section.id, e);
					}
				}}
				class="group relative mb-0.5 flex h-10 w-10 cursor-pointer items-center justify-center transition-all"
				style="color: {active ? 'var(--color-primary)' : 'var(--color-text-muted)'};"
				aria-label={section.label}
			>
				{@render navIcon(section, active, 17)}
				{#if !flyoutSection}
					<span
						class="pointer-events-none absolute left-14 z-50 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
						style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);"
					>
						{section.label}
					</span>
				{/if}
			</button>
		{/each}
	</aside>

	{#if flyoutSection}
		{@const section = sections.find((s) => s.id === flyoutSection)}
		{#if section}
			<div
				class="fixed z-50 rounded-xl border shadow-xl"
				style="left: calc(var(--sidebar-collapsed-width) + 6px); top: {flyoutY}px; width: 210px; background: var(--color-surface); border-color: var(--color-border);"
				role="group"
				aria-label={section.label}
				onmouseleave={closeFlyout}
			>
				<button
					onclick={() => {
						handleFlyoutNavigate(section.id);
					}}
					class="flyout-header flex w-full cursor-pointer items-center gap-2 rounded-t-xl px-3 py-2.5 text-left transition-colors"
					style="color: var(--color-text); border-bottom: 1px solid var(--color-border-light); font-family: var(--font-heading); font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em;"
				>
					{@render navIcon(section, isActive(section.id), 15)}
					{section.label}
				</button>

				{#if section.children}
					<div class="px-1.5 py-1.5">
						{#each section.children as child (child.id)}
							{@const childActive = activeSection === child.id}
							{@const playgroundColor = child.isPlayground ? 'var(--color-important)' : undefined}
							<button
								onclick={() => handleFlyoutNavigate(child.id)}
								class="flyout-child flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 text-left transition-all"
								class:pl-5={child.isPlayground}
								class:px-2.5={!child.isPlayground}
								style="color: {playgroundColor ??
									(childActive
										? 'var(--color-primary)'
										: 'var(--color-text-secondary)')}; font-weight: {childActive
									? '600'
									: '400'}; opacity: {child.isPlayground && !childActive
									? '0.7'
									: '1'}; font-size: {child.isPlayground ? '11px' : '12px'};"
							>
								{@render navIcon(child, childActive, child.isPlayground ? 10 : 12)}
								<span
									>{child.label}{#if child.isPlayground && isDone(child.id)}<span
											class="ml-1"
											style="color: var(--color-tip);">✔</span
										>{/if}</span
								>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
{/if}

<style>
	.sidebar-expanded {
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
		backdrop-filter: blur(28px) saturate(1.5);
		-webkit-backdrop-filter: blur(28px) saturate(1.5);
	}

	.sidebar-collapsed {
		background: color-mix(in srgb, var(--color-bg) 40%, transparent);
		backdrop-filter: blur(24px) saturate(1.4);
		-webkit-backdrop-filter: blur(24px) saturate(1.4);
	}

	.nav-item:hover {
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
	}

	.nav-child-item:hover {
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
		border-radius: 6px;
	}

	.flyout-header:hover {
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
	}

	.flyout-child:hover {
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}
</style>
