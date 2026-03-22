<script lang="ts">
	import { Menu, X, GitBranch } from 'lucide-svelte';

	let {
		sidebarOpen = false,
		onToggleSidebar
	}: { sidebarOpen: boolean; onToggleSidebar: () => void } = $props();
</script>

<header
	class="fixed top-0 right-0 left-0 z-50 flex items-center border-b backdrop-blur-xl"
	style="height: var(--header-height); border-color: var(--color-border); background: color-mix(in srgb, var(--color-bg) 85%, transparent);"
>
	<div class="flex w-full items-center justify-between px-5">
		<div class="flex items-center gap-3">
			<button
				onclick={onToggleSidebar}
				class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
				style="color: var(--color-text-secondary);"
				aria-label="Toggle sidebar"
			>
				{#if sidebarOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
			<div class="flex items-center gap-2.5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg"
					style="background: var(--color-primary); color: white;"
				>
					<GitBranch size={18} />
				</div>
				<div>
					<h1 class="text-base leading-tight font-bold" style="color: var(--color-text);">
						Git for Vibe Coders
					</h1>
					<p class="text-xs leading-tight" style="color: var(--color-text-muted);">
						The AI-First Developer's Guide
					</p>
				</div>
			</div>
		</div>
	</div>
</header>
