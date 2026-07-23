<script lang="ts">
	import { onMount } from 'svelte';

	let { definition, id = 'mermaid' }: { definition: string; id?: string } = $props();

	let container: HTMLDivElement;
	let mermaidModule: typeof import('mermaid') | null = $state(null);
	let renderCount = $state(0);
	let isVisible = $state(false);

	/* The theme watchers live out here, not inside the effect that creates
	   them. They are registered on `document.documentElement` and on a media
	   query — both outlive this component — so the teardown in onMount has to
	   be able to reach them. A previous version declared a `themeObs` in
	   onMount and a second one inside the effect, which shadowed it: the
	   cleanup disconnected a variable that was never assigned, and every
	   diagram scrolled past left an observer behind. */
	let themeObs: MutationObserver | undefined;
	let themeMql: MediaQueryList | undefined;
	let onSchemeChange: (() => void) | undefined;

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
						git1: '#059669',
						git2: '#818cf8',
						git3: '#d97706',
						git4: '#a78bfa',
						git5: '#0891b2',
						git6: '#65a30d',
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
						// Near-opaque, not fully: rotated labels sometimes cross the
						// lane below, and the label text must stay easy to read (a
						// hint of the crossed pill showing through is acceptable).
						// Don't shrink the font — mermaid derives the label's
						// distance from its node from the text width, so smaller
						// text collapses onto the commit dot.
						commitLabelBackground: 'rgba(30, 32, 48, 0.92)',
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
						commitLabelBackground: 'rgba(241, 245, 249, 0.94)',
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
			if (themeMql && onSchemeChange) themeMql.removeEventListener('change', onSchemeChange);
		};
	});

	$effect(() => {
		if (!isVisible) return;

		if (!mermaidModule) {
			import('mermaid').then((m) => {
				m.default.initialize(getMermaidConfig(isDark()));
				mermaidModule = m;

				const reinitialise = () => {
					m.default.initialize(getMermaidConfig(isDark()));
					renderCount++;
				};

				themeMql = window.matchMedia('(prefers-color-scheme: dark)');
				onSchemeChange = reinitialise;
				themeMql.addEventListener('change', onSchemeChange);

				// The class on <html> is what the in-app toggle changes; the media
				// query only covers an OS-level switch while set to `system`.
				themeObs = new MutationObserver(reinitialise);
				themeObs.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['class']
				});
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
				// eslint-disable-next-line svelte/no-dom-manipulating -- dedicated mount point
				container.innerHTML = svg;

				const svgEl = container.querySelector('svg');
				if (svgEl) {
					if (!svgEl.getAttribute('viewBox')) {
						const w = svgEl.getAttribute('width');
						const h = svgEl.getAttribute('height');
						if (w && h) {
							svgEl.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
						}
					}
					svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
					svgEl.removeAttribute('width');
					svgEl.removeAttribute('height');
				}

				for (const circle of container.querySelectorAll('circle')) {
					const r = parseFloat(circle.getAttribute('r') ?? '0');
					if (r > 10) circle.setAttribute('r', '10');
				}

				// gitGraph tag pills (tags, origin/*, HEAD) are pinned so close to
				// their commit that the pill's bottom edge lands on the dot's top
				// edge (~y-9.7 vs y-10 in mermaid v11 geometry). Lift the whole
				// tag — polygon, pin-hole and text — clear of the node.
				for (const el of container.querySelectorAll('.tag-label, .tag-label-bkg, .tag-hole')) {
					const prior = el.getAttribute('transform');
					el.setAttribute('transform', `translate(0, -6)${prior ? ` ${prior}` : ''}`);
				}
			})
			.catch((err) => {
				console.warn('Mermaid render error:', err);
				// eslint-disable-next-line svelte/no-dom-manipulating -- dedicated mount point
				container.innerHTML = `<p style="color: var(--color-text-muted); font-size: 12px;">Diagram loading...</p>`;
			});
	});
</script>

<div
	class="mermaid-container flex items-center justify-center overflow-hidden py-1"
	bind:this={container}
></div>

<style>
	/* Reserve space before the diagram renders so lazy materialization
	   doesn't shift the content below. */
	.mermaid-container:empty {
		min-height: 180px;
	}

	.mermaid-container :global(svg) {
		width: 100%;
		height: auto;
	}

	.mermaid-container :global(.commit-id),
	.mermaid-container :global(.commit-msg) {
		font-size: 11px !important;
	}
</style>
