import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import { partPages, partPageBySlug, partImage } from '$lib/data/part-pages';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

/** adapter-static can't crawl into a dynamic route — name every page. */
export const entries: EntryGenerator = () => partPages.map((p) => ({ slug: p.slug }));

// Dynamic imports keep each part page's bundle to its own section component
// instead of shipping all nine — the literal map is what lets Vite code-split
// them.
const components: Record<string, () => Promise<{ default: Component }>> = {
	'part-1': () => import('$lib/components/sections/Part1.svelte'),
	'part-2': () => import('$lib/components/sections/Part2.svelte'),
	'part-3': () => import('$lib/components/sections/Part3.svelte'),
	'part-4': () => import('$lib/components/sections/Part4.svelte'),
	'part-5': () => import('$lib/components/sections/Part5.svelte'),
	'part-6': () => import('$lib/components/sections/Part6.svelte'),
	'part-7': () => import('$lib/components/sections/Part7.svelte'),
	'part-8': () => import('$lib/components/sections/Part8.svelte'),
	'part-9': () => import('$lib/components/sections/Part9.svelte')
};

export const load: PageLoad = async ({ params }) => {
	const part = partPageBySlug(params.slug);
	if (!part) error(404, 'No such part');

	const index = partPages.indexOf(part);
	const { default: component } = await components[part.id]();

	return {
		part,
		component,
		image: partImage(part.id),
		prev: partPages[index - 1] ?? null,
		next: partPages[index + 1] ?? null
	};
};
