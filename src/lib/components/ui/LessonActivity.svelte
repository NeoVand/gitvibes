<script lang="ts">
	import { Eye, Gamepad2 } from 'lucide-svelte';
	import Sandbox from '$lib/components/ui/Sandbox.svelte';
	import type { SandboxStep } from '$lib/data/sandbox-steps';
	import type { LessonScenarioId } from '$lib/playground/scenarios';

	let {
		title,
		steps,
		scenarioId,
		id
	}: {
		title: string;
		steps: SandboxStep[];
		scenarioId: LessonScenarioId;
		id: string;
	} = $props();

	let tab = $state<'watch' | 'try'>('watch');
</script>

<div class="my-6" {id}>
	<!-- Tab bar -->
	<div
		class="activity-tabbar"
		role="tablist"
		aria-label="{title} activity"
	>
		<button
			role="tab"
			aria-selected={tab === 'watch'}
			class="activity-tab"
			class:active={tab === 'watch'}
			onclick={() => (tab = 'watch')}
		>
			<Eye size={14} />
			Watch
		</button>
		<button
			role="tab"
			aria-selected={tab === 'try'}
			class="activity-tab"
			class:active={tab === 'try'}
			onclick={() => (tab = 'try')}
		>
			<Gamepad2 size={14} />
			Try it yourself
		</button>
	</div>

	<div
		class="activity-panel"
		role="tabpanel"
	>
		{#if tab === 'watch'}
			<div class="[&>div]:rounded-none">
				<Sandbox {title} {steps} {id} bare />
			</div>
			<p class="px-5 pb-3 text-center text-[11px]" style="color: var(--color-text-muted);">
				Hover the sandbox and use ← → arrow keys to step through
			</p>
	{:else}
		{#await import('$lib/components/playground/GitPlayground.svelte')}
			<div class="flex items-center justify-center p-8" style="color: var(--color-text-muted);">
				<p class="text-sm">Loading playground...</p>
			</div>
		{:then { default: GitPlayground }}
			<div class="[&>div]:rounded-none">
				<GitPlayground {scenarioId} embedded {id} showScenarioPicker={false} />
			</div>
		{:catch error}
			<div class="p-6 text-center">
				<p class="text-sm" style="color: var(--color-warning);">Failed to load playground: {error?.message ?? 'Unknown error'}</p>
				<button
					type="button"
					onclick={() => { tab = 'watch'; requestAnimationFrame(() => { tab = 'try'; }); }}
					class="mt-2 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
					style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
				>
					Retry
				</button>
			</div>
		{/await}
		{/if}
	</div>
</div>

<style>
	.activity-tabbar {
		display: flex;
		gap: 0;
		border: 1px solid color-mix(in srgb, var(--color-important) 35%, var(--color-border));
		border-bottom: none;
		border-radius: 0.75rem 0.75rem 0 0;
		overflow: hidden;
		background: transparent;
		position: relative;
	}

	.activity-tabbar::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: color-mix(in srgb, var(--color-important) 25%, var(--color-border));
	}

	.activity-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1.5rem;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		position: relative;
		transition: color 0.15s ease;
	}

	.activity-tab:hover:not(.active) {
		color: var(--color-text-secondary);
	}

	.activity-tab.active {
		color: var(--color-important);
		font-weight: 600;
	}

	.activity-tab.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0.75rem;
		right: 0.75rem;
		height: 2px;
		background: var(--color-important);
		border-radius: 1px 1px 0 0;
		z-index: 1;
	}

	.activity-panel {
		overflow: hidden;
		border-radius: 0 0 0.75rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-important) 35%, var(--color-border));
		border-top: none;
	}
</style>
