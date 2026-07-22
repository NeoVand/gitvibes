<script lang="ts">
	import { onMount } from 'svelte';
	import { RotateCcw } from 'lucide-svelte';
	import type { LessonScenarioId } from '$lib/playground/scenarios';
	import type { ActivityKind } from '$lib/data/sidebar-nav';

	let {
		title,
		scenarioId,
		id,
		kind = 'playground'
	}: {
		title: string;
		scenarioId: LessonScenarioId;
		id: string;
		/**
		 * Lesson activities are playgrounds; the prop exists so the card, its
		 * accent and its data marker stay in lockstep with ChallengeActivity —
		 * the two cards are meant to read as siblings, one accent apart.
		 */
		kind?: ActivityKind;
	} = $props();

	const accent = $derived(
		kind === 'challenge' ? 'var(--color-challenge)' : 'var(--color-important)'
	);

	let retryKey = $state(0);
	let resetFn = $state<(() => void) | null>(null);

	// Each playground seeds a full isomorphic-git repo into IndexedDB; doing
	// that for every activity at page load starves whichever one the user is
	// actually looking at, so wait until the activity is near the viewport.
	let visible = $state(false);
	let rootEl: HTMLElement | undefined = $state(undefined);

	onMount(() => {
		if (!rootEl || typeof IntersectionObserver === 'undefined') {
			visible = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(rootEl);
		return () => observer.disconnect();
	});
</script>

<div
	class="my-6"
	data-lesson-activity={id}
	data-activity-kind={kind}
	style="--activity-accent: {accent};"
	bind:this={rootEl}
>
	<div class="activity-header">
		<span class="text-sm font-semibold" style="color: {accent};">{title}</span>
		<button
			type="button"
			onclick={() => resetFn?.()}
			disabled={!resetFn}
			class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
			style="color: var(--color-text-muted);"
			aria-label="Reset playground"
		>
			<RotateCcw size={13} />
			Reset
		</button>
	</div>

	<div class="activity-panel">
		{#if !visible}
			<div
				class="placeholder flex items-center justify-center p-8"
				style="color: var(--color-text-muted);"
			>
				<p class="text-sm">Loading playground...</p>
			</div>
		{:else}
			{#key retryKey}
				{#await import('$lib/components/playground/GitPlayground.svelte')}
					<div
						class="placeholder flex items-center justify-center p-8"
						style="color: var(--color-text-muted);"
					>
						<p class="text-sm">Loading playground...</p>
					</div>
				{:then { default: GitPlayground }}
					<div class="[&>div]:rounded-none">
						<GitPlayground
							{scenarioId}
							embedded
							hideHeader
							{id}
							showScenarioPicker={false}
							onResetReady={(fn) => (resetFn = fn)}
						/>
					</div>
				{:catch error}
					<div class="p-6 text-center">
						<p class="text-sm" style="color: var(--color-warning);">
							Failed to load playground: {error?.message ?? 'Unknown error'}
						</p>
						<button
							type="button"
							onclick={() => retryKey++}
							class="mt-2 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
							style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
						>
							Retry
						</button>
					</div>
				{/await}
			{/key}
		{/if}
	</div>
</div>

<style>
	.activity-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 1.25rem;
		border: 1px solid color-mix(in srgb, var(--activity-accent) 55%, var(--color-border));
		border-bottom: none;
		border-radius: 0.75rem 0.75rem 0 0;
		background: transparent;
	}

	.activity-panel {
		overflow: hidden;
		border-radius: 0 0 0.75rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--activity-accent) 55%, var(--color-border));
		border-top: none;
	}

	/* Match the loaded playground's height so materializing it doesn't
	   shift everything below (which breaks in-flight scrolls). */
	.placeholder {
		min-height: 500px;
	}
</style>
