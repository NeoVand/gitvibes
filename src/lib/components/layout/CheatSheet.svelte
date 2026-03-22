<script lang="ts">
	import {
		X,
		Search,
		ChevronRight,
		Settings,
		GitCommitHorizontal,
		GitBranch,
		Cloud,
		Archive,
		Undo2,
		History,
		GitPullRequest,
		Tag,
		Wrench,
		Check,
		Copy
	} from 'lucide-svelte';
	import { cheatSheet, type CheatSheetCategory } from '$lib/data/cheat-sheet';

	let {
		open = false,
		onToggle
	}: { open: boolean; onToggle: () => void } = $props();

	let searchQuery = $state('');
	let expandedCategories = $state<Set<string>>(new Set(cheatSheet.map((c) => c.label)));
	let copiedCommand = $state<string | null>(null);

	// Map icon string names to lucide components
	const iconMap: Record<string, typeof Settings> = {
		settings: Settings,
		'git-commit-horizontal': GitCommitHorizontal,
		'git-branch': GitBranch,
		cloud: Cloud,
		archive: Archive,
		'undo-2': Undo2,
		history: History,
		'git-pull-request': GitPullRequest,
		tag: Tag,
		wrench: Wrench
	};

	let filteredCategories = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return cheatSheet;

		const result: CheatSheetCategory[] = [];
		for (const category of cheatSheet) {
			const matchingCommands = category.commands.filter(
				(cmd) =>
					cmd.command.toLowerCase().includes(query) ||
					cmd.description.toLowerCase().includes(query)
			);
			if (matchingCommands.length > 0) {
				result.push({ ...category, commands: matchingCommands });
			}
		}
		return result;
	});

	function toggleCategory(label: string) {
		const next = new Set(expandedCategories);
		if (next.has(label)) next.delete(label);
		else next.add(label);
		expandedCategories = next;
	}

	async function copyCommand(command: string) {
		try {
			await navigator.clipboard.writeText(command);
			copiedCommand = command;
			setTimeout(() => {
				copiedCommand = null;
			}, 1500);
		} catch {
			// Clipboard API not available
		}
	}

	// When searching, expand all categories that have results
	$effect(() => {
		if (searchQuery.trim()) {
			expandedCategories = new Set(filteredCategories.map((c) => c.label));
		}
	});
</script>

<!-- Backdrop on mobile -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
		onclick={onToggle}
		aria-label="Close cheat sheet"
	></button>
{/if}

<!-- Right-side sliding panel -->
<aside
	class="fixed top-0 right-0 bottom-0 z-40 flex w-80 flex-col border-l transition-transform duration-200 ease-out"
	style="padding-top: var(--header-height); border-color: var(--color-border); background: var(--color-bg-secondary);"
	class:translate-x-0={open}
	class:translate-x-full={!open}
>
	<!-- Header -->
	<div
		class="flex items-center justify-between border-b px-4 py-3"
		style="border-color: var(--color-border);"
	>
		<span
			class="text-xs font-semibold tracking-wider uppercase"
			style="color: var(--color-text-muted); letter-spacing: 0.08em;"
		>
			Git Cheat Sheet
		</span>
		<button
			onclick={onToggle}
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
			style="color: var(--color-text-muted);"
			aria-label="Close cheat sheet"
		>
			<X size={15} />
		</button>
	</div>

	<!-- Search -->
	<div class="flex items-center gap-2 px-4 py-2.5" style="background: var(--color-bg-tertiary);">
		<Search size={13} style="color: var(--color-text-muted); flex-shrink: 0;" />
		<input
			type="text"
			placeholder="Filter commands..."
			bind:value={searchQuery}
			class="w-full border-none bg-transparent text-xs outline-none shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus:border-none"
			style="color: var(--color-text); font-family: var(--font-sans);"
		/>
	</div>

	<!-- Scrollable command list -->
	<div class="flex-1 overflow-y-auto px-3 py-3">
		{#each filteredCategories as category}
			{@const IconComponent = iconMap[category.icon]}
			{@const isExpanded = expandedCategories.has(category.label)}
			<div class="mb-1">
				<!-- Category header -->
				<button
					onclick={() => toggleCategory(category.label)}
					class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] font-semibold transition-colors"
					style="color: var(--color-text-secondary);"
				>
					{#if IconComponent}
						<svelte:component this={IconComponent} size={14} strokeWidth={2} />
					{/if}
					<span class="flex-1">{category.label}</span>
					<span
						class="text-[10px] font-normal"
						style="color: var(--color-text-muted);"
					>
						{category.commands.length}
					</span>
					<ChevronRight
						size={12}
						class="transition-transform duration-150"
						style="transform: rotate({isExpanded ? '90deg' : '0deg'}); opacity: 0.5;"
					/>
				</button>

				<!-- Commands -->
				{#if isExpanded}
					<div
						class="mt-0.5 ml-[22px] space-y-px border-l pl-2.5"
						style="border-color: var(--color-border);"
					>
						{#each category.commands as cmd}
							{@const isCopied = copiedCommand === cmd.command}
							<button
								onclick={() => copyCommand(cmd.command)}
								class="group block w-full cursor-pointer rounded-md px-2 py-[6px] text-left transition-colors"
								style="background: transparent;"
								title="Click to copy"
							>
								<div class="flex items-start gap-1.5">
									<code
										class="inline-block break-all rounded px-1 py-0.5 text-[11px] leading-relaxed"
										style="background: var(--color-code-bg); color: var(--color-code-text); font-family: var(--font-mono);"
									>
										{cmd.command}
									</code>
									<span
										class="mt-0.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
										style="color: {isCopied ? 'var(--color-tip)' : 'var(--color-text-muted)'};"
									>
										{#if isCopied}
											<Check size={11} />
										{:else}
											<Copy size={11} />
										{/if}
									</span>
								</div>
								<p
									class="mt-0.5 text-[11px] leading-snug"
									style="color: var(--color-text-muted);"
								>
									{cmd.description}
								</p>
								{#if isCopied}
									<span
										class="mt-0.5 inline-block text-[10px] font-medium"
										style="color: var(--color-tip);"
									>
										Copied!
									</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#if filteredCategories.length === 0}
			<div class="px-2 py-8 text-center">
				<p class="text-xs" style="color: var(--color-text-muted);">
					No commands match your search.
				</p>
			</div>
		{/if}
	</div>
</aside>
