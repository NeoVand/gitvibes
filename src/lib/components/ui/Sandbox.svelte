<script lang="ts">
	import { ChevronLeft, ChevronRight, Terminal, GitBranch, RotateCcw } from 'lucide-svelte';
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
		id = 'sandbox',
		bare = false
	}: { title?: string; steps: SandboxStep[]; id?: string; bare?: boolean } = $props();

	let currentStep = $state(0);
	let isHovered = $state(false);

	let visibleCommands = $derived(steps.slice(0, currentStep + 1));
	let currentDiagram = $derived(steps[currentStep].diagram);

	function next() {
		if (currentStep < steps.length - 1) currentStep++;
	}
	function prev() {
		if (currentStep > 0) currentStep--;
	}
	function reset() {
		currentStep = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isHovered) return;
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			next();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prev();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class:my-6={!bare}
	class:rounded-xl={!bare}
	class="overflow-hidden outline-none"
	style="background: var(--color-bg-secondary);"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	role="region"
	aria-label="{title} interactive sandbox"
>
	<!-- Header -->
	<div
		class="flex items-center justify-between px-5 py-3"
		style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border);"
	>
		<div class="flex items-center gap-2">
			<GitBranch size={14} style="color: var(--color-important);" />
			<span class="text-sm font-semibold" style="color: var(--color-text);">{title}</span>
		</div>
		<div class="flex items-center gap-2.5">
			<button
				onclick={reset}
				disabled={currentStep === 0}
				class="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
				style="color: var(--color-text-muted);"
				aria-label="Reset sandbox"
			>
				<RotateCcw size={12} />
				Reset
			</button>
			<span class="text-[11px] font-medium tabular-nums" style="color: var(--color-text-muted);">
				{currentStep + 1} / {steps.length}
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
				<Terminal size={12} style="color: var(--color-text-muted);" />
				<span class="text-xs font-medium" style="color: var(--color-text-muted);">Terminal</span>
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
		<div class="flex flex-col" style="border-left: 1px solid var(--color-border);">
			<div class="flex items-center gap-2 px-4 py-2">
				<GitBranch size={12} style="color: var(--color-important);" />
				<span class="text-xs font-medium" style="color: var(--color-text-muted);">Commit Graph</span>
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
		style="border-top: 1px solid var(--color-border);"
	>
		<button
			onclick={prev}
			disabled={currentStep === 0}
			class="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30"
			style="color: var(--color-text-muted);"
		>
			<ChevronLeft size={14} />
			Prev
		</button>

		<!-- Step dots -->
		<div class="flex items-center gap-1.5">
			{#each steps as _, i}
				<button
					onclick={() => (currentStep = i)}
					class="h-1.5 cursor-pointer rounded-full transition-all"
					class:w-5={i === currentStep}
					class:w-1.5={i !== currentStep}
					style="background: {i === currentStep
						? 'var(--color-important)'
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
			class="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30"
			style="color: var(--color-important);"
		>
			Next
			<ChevronRight size={14} />
		</button>
	</div>
</div>

{#if !bare}
<p class="mt-2 mb-6 text-center text-[11px]" style="color: var(--color-text-muted);">
	Use ← → arrow keys to step through
</p>
{/if}
