<script lang="ts">
	import { onMount } from 'svelte';

	let { definition, id = 'mermaid' }: { definition: string; id?: string } = $props();

	let container: HTMLDivElement;
	let mermaidModule: typeof import('mermaid') | null = $state(null);
	let renderCount = $state(0);

	function isDark(): boolean {
		const root = document.documentElement;
		if (root.classList.contains('dark')) return true;
		if (root.classList.contains('light')) return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function getMermaidConfig(dark: boolean) {
		return {
			startOnLoad: false,
			theme: 'base' as const,
			themeVariables: dark
				? {
						// Dark mode — flowcharts
						primaryColor: '#2d2b55',
						primaryTextColor: '#e2e8f0',
						primaryBorderColor: '#6366f1',
						secondaryColor: '#1a3a2a',
						secondaryTextColor: '#a7f3d0',
						secondaryBorderColor: '#34d399',
						tertiaryColor: '#1e2030',
						tertiaryTextColor: '#cbd5e1',
						tertiaryBorderColor: '#334155',
						lineColor: '#64748b',
						textColor: '#e2e8f0',
						mainBkg: '#1e2030',
						nodeBorder: '#6366f1',
						clusterBkg: '#171926',
						clusterBorder: '#334155',
						titleColor: '#e2e8f0',
						edgeLabelBackground: '#1e2030',
						nodeTextColor: '#e2e8f0',
						// gitGraph
						git0: '#818cf8',
						git1: '#34d399',
						git2: '#fb7185',
						git3: '#fbbf24',
						git4: '#a78bfa',
						git5: '#f472b6',
						git6: '#22d3ee',
						git7: '#a3e635',
						gitBranchLabel0: '#e2e8f0',
						gitBranchLabel1: '#e2e8f0',
						gitBranchLabel2: '#e2e8f0',
						gitBranchLabel3: '#e2e8f0',
						gitBranchLabel4: '#e2e8f0',
						gitBranchLabel5: '#e2e8f0',
						gitBranchLabel6: '#e2e8f0',
						gitBranchLabel7: '#e2e8f0',
						gitInv0: '#4f46e5',
						commitLabelColor: '#94a3b8',
						commitLabelBackground: '#1e2030',
						commitLabelFontSize: '12px',
						tagLabelColor: '#e2e8f0',
						tagLabelBackground: '#4f46e5',
						tagLabelBorder: '#6366f1',
						tagLabelFontSize: '12px'
					}
				: {
						// Light mode — flowcharts
						primaryColor: '#eef2ff',
						primaryTextColor: '#1e1b4b',
						primaryBorderColor: '#a5b4fc',
						secondaryColor: '#ecfdf5',
						secondaryTextColor: '#064e3b',
						secondaryBorderColor: '#6ee7b7',
						tertiaryColor: '#f8fafc',
						tertiaryTextColor: '#334155',
						tertiaryBorderColor: '#cbd5e1',
						lineColor: '#94a3af',
						textColor: '#1e293b',
						mainBkg: '#f8fafc',
						nodeBorder: '#a5b4fc',
						clusterBkg: '#f8fafc',
						clusterBorder: '#e2e8f0',
						titleColor: '#1e293b',
						edgeLabelBackground: '#ffffff',
						nodeTextColor: '#1e293b',
						// gitGraph
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
						gitBranchLabel3: '#ffffff',
						gitBranchLabel4: '#ffffff',
						gitBranchLabel5: '#ffffff',
						gitBranchLabel6: '#ffffff',
						gitBranchLabel7: '#ffffff',
						gitInv0: '#4f46e5',
						commitLabelColor: '#64748b',
						commitLabelBackground: '#f1f5f9',
						commitLabelFontSize: '12px',
						tagLabelColor: '#ffffff',
						tagLabelBackground: '#6366f1',
						tagLabelBorder: '#4f46e5',
						tagLabelFontSize: '12px'
					},
			gitGraph: {
				mainBranchName: 'main',
				showCommitLabel: true,
				showBranches: true,
				rotateCommitLabel: true,
				mainBranchOrder: 0
			},
			flowchart: {
				curve: 'basis' as const,
				padding: 20,
				htmlLabels: true,
				useMaxWidth: true,
				nodeSpacing: 30,
				rankSpacing: 50
			},
			fontSize: 14,
			fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
		};
	}

	onMount(() => {
		let obs: MutationObserver;

		import('mermaid').then((m) => {
			m.default.initialize(getMermaidConfig(isDark()));
			mermaidModule = m;

			const mql = window.matchMedia('(prefers-color-scheme: dark)');
			mql.addEventListener('change', () => {
				m.default.initialize(getMermaidConfig(isDark()));
				renderCount++;
			});

			// Watch for class changes on root (theme toggle)
			obs = new MutationObserver(() => {
				m.default.initialize(getMermaidConfig(isDark()));
				renderCount++;
			});
			obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		});

		return () => obs?.disconnect();
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
				container.innerHTML = `<p style="color: var(--color-text-muted); font-size: 12px;">Diagram loading...</p>`;
			});
	});
</script>

<div
	class="mermaid-container flex items-center justify-center overflow-x-auto py-6"
	bind:this={container}
></div>
