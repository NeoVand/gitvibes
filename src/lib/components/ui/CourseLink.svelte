<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { courseEntry, partIdOf } from '$lib/data/sidebar-nav';
	import { partPageById } from '$lib/data/part-pages';

	/**
	 * An in-course cross-reference that names its destination.
	 *
	 * Prose used to say "Part 8" — a number the table of contents never shows,
	 * pointing at nothing clickable, and wrong the moment a part is inserted
	 * ahead of it. This renders the part's real name and icon and links to its
	 * anchor, resolving both from the sidebar data, so the reference survives a
	 * rename or a reordering.
	 */
	let {
		to,
		label,
		icon = true
	}: {
		to: string;
		label?: string;
		icon?: boolean;
	} = $props();

	const entry = $derived(courseEntry(to));
	const text = $derived(label ?? entry?.label ?? to);
	const Icon = $derived(entry?.icon);

	// On the full course page every anchor is local, so the link stays a plain
	// hash. On a standalone /parts/<slug> page only this part's own anchors
	// exist in the DOM — references to other parts travel back to the course
	// page, hash intact. Read the ROUTE ID, not the pathname: under prerender
	// the pathname resolves to the built file, not the route.
	const currentSlug = $derived(
		page.route.id === '/parts/[slug]' ? (page.params.slug ?? null) : null
	);
	const ownerSlug = $derived.by(() => {
		const owner = partIdOf(to);
		return owner ? (partPageById(owner)?.slug ?? null) : null;
	});
	const href = $derived(
		currentSlug === null || currentSlug === ownerSlug ? `#${to}` : `${base}/#${to}`
	);
</script>

<!-- The cross-page form is `${base}/#anchor`, which resolve() route ids cannot
     express (they carry no hash) — and the hash IS the destination here. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a {href} class="course-link" title={entry ? `Go to ${entry.label}` : undefined}>
	{#if icon && Icon}
		<Icon size={13} class="course-link-icon" aria-hidden="true" />
	{/if}<span>{text}</span>
</a>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.course-link {
		display: inline-flex;
		align-items: baseline;
		gap: 0.25em;
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-thickness: 1px;
		text-decoration-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
		font-weight: 500;
		transition: text-decoration-color 0.15s ease;
	}

	.course-link:hover {
		text-decoration-color: var(--color-primary);
	}

	/* Nudge the icon onto the text baseline without disturbing line height. */
	.course-link :global(.course-link-icon) {
		align-self: center;
		flex-shrink: 0;
		transform: translateY(0.06em);
	}
</style>
