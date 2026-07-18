/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Offline support, kept deliberately boring: immutable build assets are
// cache-first (their filenames are content-hashed), everything else is
// network-first with a cache fallback — so a deploy is picked up on the
// next online visit, but the whole tutorial (playground included: it's
// all client-side) keeps working on a plane.

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `gitvibes-${version}`;
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						// Prune ONLY our own versioned caches. Other caches on this
						// origin are not ours to clear — in particular the Agent
						// panel's transformers-cache holds hundreds of MB of model
						// weights that must survive every deploy (and is shared
						// with the sister course on the same origin).
						.filter((key) => key.startsWith('gitvibes-') && key !== CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== location.origin) return;

	// Content-hashed build assets never change: cache-first
	if (build.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => (await cache.match(request)) ?? fetch(request))
		);
		return;
	}

	// Pages and static files: network-first, falling back to cache offline
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(request);
				if (response.ok) cache.put(request, response.clone());
				return response;
			} catch {
				const cached = await cache.match(request);
				if (cached) return cached;
				// Last resort for navigations: the app shell
				if (request.mode === 'navigate') {
					const shell = await cache.match(
						`${url.pathname.startsWith('/gitvibes') ? '/gitvibes' : ''}/`
					);
					if (shell) return shell;
				}
				throw new Error('offline and uncached');
			}
		})()
	);
});
