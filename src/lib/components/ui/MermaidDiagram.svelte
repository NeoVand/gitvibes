<script lang="ts">
	import { onMount } from 'svelte';

	let { definition, id = 'mermaid' }: { definition: string; id?: string } = $props();

	let container: HTMLDivElement;
	let mermaidModule: typeof import('mermaid') | null = $state(null);
	let renderCount = $state(0);
	let isVisible = $state(false);

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
						// sequenceDiagram
						actorBkg: '#1e2030',
						actorTextColor: '#cbd5e1',
						actorBorder: '#334155',
						actorLineColor: '#334155',
						noteBkgColor: 'transparent',
						noteTextColor: '#64748b',
						noteBorderColor: 'transparent',
						signalColor: '#475569',
						signalTextColor: '#94a3b8',
						activationBkgColor: '#1e2030',
						activationBorderColor: '#475569',
						sequenceNumberColor: '#94a3b8',
					// gitGraph
					git0: '#db2777',
					git1: '#34d399',
					git2: '#818cf8',
					git3: '#fbbf24',
					git4: '#a78bfa',
					git5: '#22d3ee',
					git6: '#a3e635',
					git7: '#fb923c',
					gitBranchLabel0: '#e2e8f0',
					gitBranchLabel1: '#e2e8f0',
					gitBranchLabel2: '#e2e8f0',
					gitBranchLabel3: '#e2e8f0',
					gitBranchLabel4: '#e2e8f0',
					gitBranchLabel5: '#e2e8f0',
					gitBranchLabel6: '#e2e8f0',
					gitBranchLabel7: '#e2e8f0',
					gitInv0: '#db2777',
					commitLabelColor: '#94a3b8',
					commitLabelBackground: '#1e2030',
					commitLabelFontSize: '12px',
					tagLabelColor: '#e2e8f0',
					tagLabelBackground: '#db2777',
					tagLabelBorder: '#f472b6',
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
						// sequenceDiagram
						actorBkg: '#f1f5f9',
						actorTextColor: '#475569',
						actorBorder: '#cbd5e1',
						actorLineColor: '#cbd5e1',
						noteBkgColor: 'transparent',
						noteTextColor: '#94a3b8',
						noteBorderColor: 'transparent',
						signalColor: '#94a3b8',
						signalTextColor: '#64748b',
						activationBkgColor: '#f1f5f9',
						activationBorderColor: '#94a3b8',
						sequenceNumberColor: '#64748b',
					// gitGraph
					git0: '#db2777',
					git1: '#059669',
					git2: '#6366f1',
					git3: '#d97706',
					git4: '#8b5cf6',
					git5: '#06b6d4',
					git6: '#84cc16',
					git7: '#ea580c',
					gitBranchLabel0: '#ffffff',
					gitBranchLabel1: '#ffffff',
					gitBranchLabel2: '#ffffff',
					gitBranchLabel3: '#ffffff',
					gitBranchLabel4: '#ffffff',
					gitBranchLabel5: '#ffffff',
					gitBranchLabel6: '#ffffff',
					gitBranchLabel7: '#ffffff',
					gitInv0: '#be185d',
					commitLabelColor: '#64748b',
					commitLabelBackground: '#f1f5f9',
					commitLabelFontSize: '12px',
					tagLabelColor: '#ffffff',
					tagLabelBackground: '#db2777',
					tagLabelBorder: '#be185d',
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
			sequence: {
				useMaxWidth: true,
				mirrorActors: false,
				messageAlign: 'center' as const,
				actorMargin: 80,
				noteMargin: 8,
				messageFontSize: 12,
				actorFontSize: 13,
				noteFontSize: 10,
				width: 180,
				height: 36
			},
			fontSize: 14,
			fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
		};
	}

	onMount(() => {
		let themeObs: MutationObserver | undefined;

		const viewportObserver = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) isVisible = true;
			},
			{ rootMargin: '100px' }
		);
		viewportObserver.observe(container);

		return () => {
			viewportObserver.disconnect();
			themeObs?.disconnect();
		};
	});

	$effect(() => {
		if (!isVisible) return;

		if (!mermaidModule) {
			import('mermaid').then((m) => {
				m.default.initialize(getMermaidConfig(isDark()));
				mermaidModule = m;

				const mql = window.matchMedia('(prefers-color-scheme: dark)');
				mql.addEventListener('change', () => {
					m.default.initialize(getMermaidConfig(isDark()));
					renderCount++;
				});

				const themeObs = new MutationObserver(() => {
					m.default.initialize(getMermaidConfig(isDark()));
					renderCount++;
				});
				themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
			});
			return;
		}

		if (!container || !definition) return;
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
