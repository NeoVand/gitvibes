<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-svelte';
	import Github from '$lib/components/ui/GithubIcon.svelte';
	import { courseEntry } from '$lib/data/sidebar-nav';
	import { SITE_URL } from '$lib/data/part-pages';

	let { data } = $props();

	const Part = $derived(data.component);
	const pageUrl = $derived(`${SITE_URL}/parts/${data.part.slug}`);
	const imageUrl = $derived(data.image ? `${SITE_URL}/images/${data.image}` : null);

	// The sidebar's short display names and icons, so the chrome here names
	// parts exactly the way the course's own navigation does.
	const entry = $derived(courseEntry(data.part.id));
	const prevEntry = $derived(data.prev ? courseEntry(data.prev.id) : null);
	const nextEntry = $derived(data.next ? courseEntry(data.next.id) : null);
	const PartIcon = $derived(entry?.icon);
	const PrevIcon = $derived(prevEntry?.icon);
	const NextIcon = $derived(nextEntry?.icon);

	// The Conclusion's playground button has no side panel here — send it to
	// the full course, which opens the playground on arrival.
	function openPlayground() {
		// The redirect carries a query string, which resolve() route ids can't express
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/')}?playground`);
	}
</script>

<svelte:head>
	<title>{data.part.title} — GitVibes</title>
	<meta name="description" content={data.part.description} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:title" content="{data.part.title} — GitVibes" />
	<meta property="og:description" content={data.part.description} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content={pageUrl} />
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta name="twitter:image" content={imageUrl} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{data.part.title} — GitVibes" />
	<meta name="twitter:description" content={data.part.description} />
</svelte:head>

<!-- The full app header, minus the surfaces that only exist on the course
     page (rail, search, panels): same glass, same 48px, same logo cell, so
     landing here from a shared link feels like landing in the same product. -->
<header class="part-header fixed top-0 right-0 left-0 z-50 flex items-center">
	<div
		class="flex flex-shrink-0 items-center justify-center"
		style="width: var(--sidebar-collapsed-width);"
	>
		<a
			href={resolve('/')}
			class="flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-80"
			aria-label="GitVibes home"
		>
			<img src="{base}/images/logo.webp" alt="" class="h-6 w-6 shrink-0" width="24" height="24" />
		</a>
	</div>

	<a
		href={resolve('/')}
		class="-ml-1.5 text-[15px] font-bold tracking-tight"
		style="color: var(--color-text); font-family: var(--font-heading); letter-spacing: -0.02em;"
	>
		GitVibes
	</a>

	<span class="crumb ml-3 flex min-w-0 items-center gap-1.5 text-[13px]">
		<span style="color: var(--color-text-muted);">/</span>
		{#if PartIcon}
			<PartIcon size={13} style="color: var(--color-primary);" aria-hidden="true" />
		{/if}
		<span class="truncate" style="color: var(--color-text-secondary);">{entry?.label}</span>
	</span>

	<div class="ml-auto flex flex-shrink-0 items-center gap-1 pr-3">
		<a href={resolve('/')} class="course-btn flex h-8 items-center gap-1.5 rounded-lg px-2.5">
			<BookOpen size={16} />
			<span class="course-btn-label text-xs font-semibold">Full course</span>
		</a>
		<a
			href="https://github.com/NeoVand/gitvibes"
			target="_blank"
			rel="noopener noreferrer"
			class="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
			style="color: var(--color-text-muted);"
			aria-label="View on GitHub"
		>
			<Github size={16} />
		</a>
	</div>
</header>

<main class="part-page" style="padding-top: var(--header-height);">
	<Part {...data.part.id === 'part-9' ? { onOpenPlayground: openPlayground } : {}} />

	<!-- Between-parts navigation, in the course's own card language: eyebrow,
	     icon, part name — the same anatomy as a SectionHeader, quoted small. -->
	<nav class="mx-auto max-w-4xl px-6 pt-2 pb-14" aria-label="Between parts">
		<div class="grid gap-3 sm:grid-cols-2">
			{#if data.prev && prevEntry}
				<a
					href={resolve('/parts/[slug]', { slug: data.prev.slug })}
					class="part-nav-card group rounded-lg p-5"
				>
					<span
						class="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase"
						style="color: var(--color-text-muted); font-family: var(--font-heading); letter-spacing: 0.14em;"
					>
						<ArrowLeft size={13} aria-hidden="true" />
						Previous part
					</span>
					<span class="flex items-center gap-2">
						{#if PrevIcon}
							<PrevIcon size={16} style="color: var(--color-primary);" aria-hidden="true" />
						{/if}
						<span
							class="text-[15px] font-semibold"
							style="color: var(--color-text); font-family: var(--font-heading);"
						>
							{prevEntry.label}
						</span>
					</span>
				</a>
			{:else}
				<span aria-hidden="true"></span>
			{/if}
			{#if data.next && nextEntry}
				<a
					href={resolve('/parts/[slug]', { slug: data.next.slug })}
					class="part-nav-card group rounded-lg p-5 sm:text-right"
				>
					<span
						class="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase sm:justify-end"
						style="color: var(--color-text-muted); font-family: var(--font-heading); letter-spacing: 0.14em;"
					>
						Next part
						<ArrowRight size={13} aria-hidden="true" />
					</span>
					<span class="flex items-center gap-2 sm:justify-end">
						{#if NextIcon}
							<NextIcon size={16} style="color: var(--color-primary);" aria-hidden="true" />
						{/if}
						<span
							class="text-[15px] font-semibold"
							style="color: var(--color-text); font-family: var(--font-heading);"
						>
							{nextEntry.label}
						</span>
					</span>
				</a>
			{/if}
		</div>

		<p class="mt-8 text-center text-[13px]" style="color: var(--color-text-secondary);">
			This is one part of a free, interactive nine-part course —
			<a
				href={resolve('/')}
				class="font-medium underline underline-offset-2"
				style="color: var(--color-primary);">read it all, with the in-browser playground</a
			>.
		</p>
	</nav>
</main>

<style>
	.part-header {
		height: var(--header-height);
		background: var(--header-glass);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-border) 80%, transparent);
	}

	.course-btn {
		color: var(--color-primary);
		transition: background 0.15s ease;
	}

	.course-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.part-nav-card {
		display: block;
		background: var(--color-bg-secondary);
		border: 1px solid transparent;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.part-nav-card:hover {
		border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
		background: color-mix(in srgb, var(--color-bg-secondary) 80%, var(--color-primary) 4%);
	}

	.part-page {
		min-height: 100vh;
	}

	/* The crumb is the first thing spent on narrow screens — the wordmark and
	   the actions matter more at 360px. */
	@media (max-width: 560px) {
		.crumb {
			display: none;
		}
	}

	@media (max-width: 420px) {
		.course-btn-label {
			display: none;
		}
	}
</style>
