<script lang="ts">
	import { ChevronLeft, ChevronRight, Terminal, GitBranch } from 'lucide-svelte';
	import MermaidDiagram from './MermaidDiagram.svelte';

	interface SandboxStep {
		command: string;
		output?: string;
		description?: string;
		diagram: string;
	}

	let {
		title = 'Git Sandbox',
		steps,
		id = 'sandbox'
	}: { title?: string; steps: SandboxStep[]; id?: string } = $props();

	let currentStep = $state(0);

	let visibleCommands = $derived(steps.slice(0, currentStep + 1));
	let currentDiagram = $derived(steps[currentStep].diagram);

	function next() {
		if (currentStep < steps.length - 1) currentStep++;
	}
	function prev() {
		if (currentStep > 0) currentStep--;
	}
</script>

<div
	class="my-6 overflow-hidden rounded-xl"
	style="background: var(--color-bg-secondary);"
>
	<!-- Header -->
	<div
		class="flex items-center justify-between px-5 py-3"
		style="background: var(--color-bg-tertiary);"
	>
		<div class="flex items-center gap-2">
			<GitBranch size={16} style="color: var(--color-primary);" />
			<span class="text-sm font-semibold" style="color: var(--color-text);">{title}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs tabular-nums" style="color: var(--color-text-muted);">
				Step {currentStep + 1} of {steps.length}
			</span>
		</div>
	</div>

	<!-- Content -->
	<div class="grid grid-cols-1 lg:grid-cols-2" style="min-height: 300px;">
		<!-- Terminal pane -->
		<div class="flex flex-col">
			<div
				class="flex items-center gap-2 px-4 py-2"
				style="background: var(--color-terminal-bg);"
			>
				<div class="flex gap-1.5">
					<span class="block h-3 w-3 rounded-full" style="background: #ef4444;"></span>
					<span class="block h-3 w-3 rounded-full" style="background: #f59e0b;"></span>
					<span class="block h-3 w-3 rounded-full" style="background: #10b981;"></span>
				</div>
				<Terminal size={12} style="color: var(--color-text-muted);" />
				<span class="text-xs" style="color: var(--color-text-muted);">Terminal</span>
			</div>
			<div
				class="flex-1 overflow-y-auto p-4"
				style="background: var(--color-terminal-bg); min-height: 260px;"
			>
				{#each visibleCommands as step, i}
					<div class="mb-3" class:opacity-50={i < currentStep}>
						{#if step.description}
							<p
								class="mb-1 text-xs italic"
								style="color: var(--color-text-muted); font-family: var(--font-mono);"
							>
								# {step.description}
							</p>
						{/if}
						<div class="flex gap-2" style="font-family: var(--font-mono); font-size: 13px;">
							<span style="color: var(--color-terminal-prompt);">$</span>
							<span style="color: var(--color-terminal-command);">{step.command}</span>
						</div>
						{#if step.output && i <= currentStep}
							<pre
								class="mt-1 whitespace-pre-wrap pl-5 text-xs leading-relaxed"
								style="color: var(--color-terminal-output); font-family: var(--font-mono);">{step.output}</pre>
						{/if}
					</div>
				{/each}
				<div class="flex items-center gap-1 animate-pulse" style="font-family: var(--font-mono); font-size: 13px;">
					<span style="color: var(--color-terminal-prompt);">$</span>
					<span
						class="inline-block h-4 w-2"
						style="background: var(--color-terminal-prompt); opacity: 0.7;"
					></span>
				</div>
			</div>
		</div>

		<!-- Visualization pane -->
		<div class="flex flex-col">
			<div class="flex items-center gap-2 px-4 py-2">
				<GitBranch size={12} style="color: var(--color-primary);" />
				<span class="text-xs" style="color: var(--color-text-muted);">Visualization</span>
			</div>
			<div class="flex flex-1 items-center justify-center p-4">
				{#key currentStep}
					<MermaidDiagram definition={currentDiagram} id="{id}-{currentStep}" />
				{/key}
			</div>
		</div>
	</div>

	<!-- Navigation footer -->
	<div
		class="flex items-center justify-between px-5 py-3"
	>
		<button
			onclick={prev}
			disabled={currentStep === 0}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30"
			style="color: var(--color-text-muted);"
		>
			<ChevronLeft size={16} />
			Previous
		</button>

		<!-- Step dots -->
		<div class="flex items-center gap-1.5">
			{#each steps as _, i}
				<button
					onclick={() => (currentStep = i)}
					class="h-1.5 rounded-full transition-all"
					class:w-5={i === currentStep}
					class:w-1.5={i !== currentStep}
					style="background: {i === currentStep
						? 'var(--color-text-muted)'
						: i < currentStep
							? 'var(--color-text-muted)'
							: 'var(--color-border)'}; opacity: {i === currentStep ? '1' : i < currentStep ? '0.5' : '0.3'};"
					aria-label="Go to step {i + 1}"
				></button>
			{/each}
		</div>

		<button
			onclick={next}
			disabled={currentStep === steps.length - 1}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30"
			style="color: var(--color-text-secondary);"
		>
			Next
			<ChevronRight size={16} />
		</button>
	</div>
</div>
