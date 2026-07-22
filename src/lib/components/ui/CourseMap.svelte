<script lang="ts">
	import { ChevronRight, Map } from 'lucide-svelte';
	import { courseGraph, type CourseNode } from '$lib/data/course-map';
	import { courseEntry } from '$lib/data/sidebar-nav';

	/**
	 * The course as a map instead of a list: what each part gives you, and what
	 * it leans on. Nodes link straight to their part, so this doubles as a
	 * table of contents for people who would rather navigate by goal than by
	 * running order.
	 */

	let open = $state(false);

	const TRACKS = [
		{
			key: 'core' as const,
			title: 'The path',
			blurb: 'Read these in order — each one assumes the last.'
		},
		{
			key: 'power' as const,
			title: 'The power moves',
			blurb: 'Independent of each other. Take any of them once you have its prerequisites.'
		},
		{
			key: 'mastery' as const,
			title: 'Going further',
			blurb: 'Automation, habits and closing the loop. Rewarding, never required.'
		}
	];

	function inTrack(key: CourseNode['track']) {
		return courseGraph.filter((n) => n.track === key);
	}
</script>

<div class="map-wrap" style="border-color: var(--color-border);">
	<button
		type="button"
		class="map-toggle"
		onclick={() => (open = !open)}
		aria-expanded={open}
		style="color: var(--color-text);"
	>
		<Map size={16} style="color: var(--color-primary); flex-shrink: 0;" />
		<span class="map-toggle-text">
			<strong>How this course fits together</strong>
			<span style="color: var(--color-text-muted);">
				— what each part gives you, and what it needs first
			</span>
		</span>
		<ChevronRight
			size={16}
			class="map-chevron {open ? 'is-open' : ''}"
			style="color: var(--color-text-muted); flex-shrink: 0;"
		/>
	</button>

	{#if open}
		<div class="map-body">
			<p class="map-intro" style="color: var(--color-text-secondary);">
				Git isn't really a list of commands — it's a handful of ideas that keep recombining. This is
				the shape of that: follow <strong style="color: var(--color-text);">the path</strong>
				straight down, then take the power moves in whatever order your work demands.
			</p>

			{#each TRACKS as track (track.key)}
				<div class="track">
					<div class="track-head">
						<h4 class="track-title" style="color: var(--color-text);">{track.title}</h4>
						<p class="track-blurb" style="color: var(--color-text-muted);">{track.blurb}</p>
					</div>

					<ol class="track-nodes">
						{#each inTrack(track.key) as node (node.id)}
							{@const entry = courseEntry(node.id)}
							{@const Icon = entry?.icon}
							<li class="node" style="background: var(--color-bg-secondary);">
								<a class="node-link" href="#{node.id}" style="color: var(--color-text);">
									{#if Icon}
										<Icon size={15} style="color: var(--color-primary); flex-shrink: 0;" />
									{/if}
									<span class="node-name">{entry?.label ?? node.id}</span>
								</a>
								<p class="node-gives" style="color: var(--color-text-secondary);">{node.gives}</p>
								{#if node.needs.length}
									<p class="node-needs">
										<span class="needs-label" style="color: var(--color-text-muted);">needs</span>
										{#each node.needs as need (need)}
											<a
												class="need-chip"
												href="#{need}"
												style="color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);"
												>{courseEntry(need)?.label ?? need}</a
											>
										{/each}
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			{/each}

			<p class="map-foot" style="color: var(--color-text-muted);">
				In a hurry? The shortest route to undoing anything an agent does to your repo is the path
				down to
				<a href="#part-4" style="color: var(--color-primary);"
					>{courseEntry('part-4')?.label ?? 'the undo part'}</a
				> — everything after it makes you faster, not safer.
			</p>
		</div>
	{/if}
</div>

<style>
	.map-wrap {
		border: 1px solid;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.map-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.85rem 1.15rem;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font-size: 13px;
		line-height: 1.5;
	}

	.map-toggle:hover {
		background: color-mix(in srgb, var(--color-primary) 5%, transparent);
	}

	.map-toggle-text {
		flex: 1;
	}

	.map-toggle :global(.map-chevron) {
		transition: transform 0.18s ease;
	}

	.map-toggle :global(.map-chevron.is-open) {
		transform: rotate(90deg);
	}

	.map-body {
		padding: 0.25rem 1.15rem 1.15rem;
	}

	.map-intro,
	.map-foot {
		font-size: 13px;
		line-height: 1.65;
	}

	.map-intro {
		margin-bottom: 1.1rem;
	}

	.map-foot {
		margin-top: 1rem;
		font-size: 12.5px;
	}

	.track {
		margin-bottom: 1.1rem;
	}

	.track-head {
		margin-bottom: 0.5rem;
	}

	.track-title {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.track-blurb {
		font-size: 12px;
		line-height: 1.5;
	}

	/* Auto-fitting columns keep the map readable from phone to desktop
	   without a fixed-size diagram that would need horizontal scrolling. */
	.track-nodes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.node {
		border-radius: 0.45rem;
		padding: 0.6rem 0.75rem;
	}

	.node-link {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 13px;
		font-weight: 600;
	}

	.node-link:hover .node-name {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.node-gives {
		font-size: 12px;
		line-height: 1.45;
		margin-top: 0.2rem;
	}

	/* Several part names contain commas ("Copy, Move, Delete"), so a plain
	   separated list is ambiguous — each prerequisite gets its own outline. */
	.node-needs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.4rem;
	}

	.needs-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.need-chip {
		font-size: 11px;
		line-height: 1.3;
		padding: 0.1rem 0.4rem;
		border: 1px solid;
		border-radius: 999px;
		white-space: nowrap;
	}

	.need-chip:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}
</style>
