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
						// Dark mode
						primaryColor: '#312e81',
						primaryTextColor: '#c7d2fe',
						primaryBorderColor: '#4338ca',
						secondaryColor: '#064e3b',
						secondaryTextColor: '#a7f3d0',
						secondaryBorderColor: '#059669',
						tertiaryColor: '#1a1d28',
						tertiaryTextColor: '#9ca3b4',
						tertiaryBorderColor: '#252836',
						lineColor: '#5f6577',
						textColor: '#e8eaf0',
						mainBkg: '#1a1d28',
						nodeBorder: '#4338ca',
						clusterBkg: '#14161f',
						clusterBorder: '#252836',
						titleColor: '#e8eaf0',
						edgeLabelBackground: '#14161f',
						nodeTextColor: '#e8eaf0',
						// gitGraph
						git0: '#818cf8',
						git1: '#34d399',
						git2: '#f87171',
						git3: '#fbbf24',
						git4: '#a78bfa',
						git5: '#f472b6',
						git6: '#22d3ee',
						git7: '#a3e635',
						gitBranchLabel0: '#e8eaf0',
						gitBranchLabel1: '#e8eaf0',
						gitBranchLabel2: '#e8eaf0',
						gitBranchLabel3: '#e8eaf0',
						gitInv0: '#4f46e5',
						commitLabelColor: '#9ca3b4',
						commitLabelBackground: '#1a1d28',
						commitLabelFontSize: '11px',
						tagLabelColor: '#e8eaf0',
						tagLabelBackground: '#4f46e5',
						tagLabelBorder: '#6366f1',
						tagLabelFontSize: '11px'
					}
				: {
						// Light mode
						primaryColor: '#eef2ff',
						primaryTextColor: '#3730a3',
						primaryBorderColor: '#a5b4fc',
						secondaryColor: '#ecfdf5',
						secondaryTextColor: '#065f46',
						secondaryBorderColor: '#6ee7b7',
						tertiaryColor: '#f9fafb',
						tertiaryTextColor: '#4b5563',
						tertiaryBorderColor: '#e5e7eb',
						lineColor: '#9ca3af',
						textColor: '#111827',
						mainBkg: '#f9fafb',
						nodeBorder: '#a5b4fc',
						clusterBkg: '#f9fafb',
						clusterBorder: '#e5e7eb',
						titleColor: '#111827',
						edgeLabelBackground: '#ffffff',
						nodeTextColor: '#111827',
						// gitGraph
						git0: '#4f46e5',
						git1: '#059669',
						git2: '#dc2626',
						git3: '#d97706',
						git4: '#7c3aed',
						git5: '#db2777',
						git6: '#0891b2',
						git7: '#65a30d',
						gitBranchLabel0: '#ffffff',
						gitBranchLabel1: '#ffffff',
						gitBranchLabel2: '#ffffff',
						gitBranchLabel3: '#ffffff',
						gitInv0: '#4f46e5',
						commitLabelColor: '#6b7280',
						commitLabelBackground: '#f3f4f6',
						commitLabelFontSize: '11px',
						tagLabelColor: '#ffffff',
						tagLabelBackground: '#4f46e5',
						tagLabelBorder: '#4338ca',
						tagLabelFontSize: '11px'
					},
			gitGraph: {
				mainBranchName: 'main',
				showCommitLabel: true,
				showBranches: true,
				rotateCommitLabel: false
			},
			flowchart: {
				curve: 'basis' as const,
				padding: 16,
				htmlLabels: true,
				useMaxWidth: true
			},
			fontSize: 13,
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
	class="mermaid-container flex items-center justify-center overflow-hidden py-4"
	bind:this={container}
></div>
