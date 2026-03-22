<script lang="ts">
	import { onMount } from 'svelte';

	let { definition, id = 'mermaid' }: { definition: string; id?: string } = $props();

	let container: HTMLDivElement;
	let mermaidModule: typeof import('mermaid') | null = $state(null);
	let renderCount = $state(0);

	onMount(async () => {
		const m = await import('mermaid');
		m.default.initialize({
			startOnLoad: false,
			theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
			gitGraph: {
				mainBranchName: 'main',
				showCommitLabel: true,
				showBranches: true
			},
			themeVariables: {
				git0: '#6366f1',
				git1: '#10b981',
				git2: '#ef4444',
				git3: '#f59e0b',
				git4: '#8b5cf6',
				git5: '#ec4899',
				git6: '#06b6d4',
				git7: '#84cc16',
				gitBranchLabel0: '#ffffff',
				gitBranchLabel1: '#ffffff',
				gitBranchLabel2: '#ffffff',
				gitBranchLabel3: '#ffffff'
			}
		});
		mermaidModule = m;

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		mql.addEventListener('change', (e) => {
			m.default.initialize({
				startOnLoad: false,
				theme: e.matches ? 'dark' : 'default'
			});
			renderCount++;
		});
	});

	$effect(() => {
		if (!mermaidModule || !container || !definition) return;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		renderCount;

		const uniqueId = `${id}-${Date.now()}`;
		mermaidModule.default
			.render(uniqueId, definition)
			.then(({ svg }) => {
				container.innerHTML = svg;
			})
			.catch((err) => {
				console.warn('Mermaid render error:', err);
				container.innerHTML = `<p class="text-sm" style="color: var(--color-text-muted)">Diagram rendering...</p>`;
			});
	});
</script>

<div
	class="mermaid-container flex items-center justify-center overflow-hidden rounded-lg p-4"
	style="background: var(--color-bg-tertiary); min-height: 200px;"
	bind:this={container}
></div>
