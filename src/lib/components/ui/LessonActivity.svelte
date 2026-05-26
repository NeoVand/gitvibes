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
		class="mb-0 flex overflow-hidden rounded-t-xl"
		style="border: 1px solid var(--color-border); border-bottom: none; background: var(--color-bg-tertiary);"
		role="tablist"
		aria-label="{title} activity"
	>
		<button
			role="tab"
			aria-selected={tab === 'watch'}
			class="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:px-6"
			style="color: {tab === 'watch' ? 'var(--color-text)' : 'var(--color-text-muted)'}; background: {tab === 'watch' ? 'var(--color-bg-secondary)' : 'transparent'}; border-bottom: {tab === 'watch' ? '2px solid var(--color-primary)' : '2px solid transparent'};"
			onclick={() => (tab = 'watch')}
		>
			<Eye size={15} />
			Watch
		</button>
		<button
			role="tab"
			aria-selected={tab === 'try'}
			class="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:px-6"
			style="color: {tab === 'try' ? 'var(--color-text)' : 'var(--color-text-muted)'}; background: {tab === 'try' ? 'var(--color-bg-secondary)' : 'transparent'}; border-bottom: {tab === 'try' ? '2px solid var(--color-primary)' : '2px solid transparent'};"
			onclick={() => (tab = 'try')}
		>
			<Gamepad2 size={15} />
			Try it yourself
		</button>
	</div>

	<div
		class="overflow-hidden rounded-b-xl"
		style="border: 1px solid var(--color-border); border-top: none;"
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
