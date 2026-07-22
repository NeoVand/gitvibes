import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			// Unit tests run without the SvelteKit plugin, so the aliases $lib
			// modules rely on have to be spelled out here. Without them a test can
			// only reach code that happens to import by relative path, which
			// quietly limits what is testable — the progress store, for one.
			$lib: r('./src/lib'),
			'$app/environment': r('./src/lib/testing/app-environment.ts')
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		// LightningFS's lock mutex needs an indexedDB global even though the
		// playground stores file content in memory
		setupFiles: ['fake-indexeddb/auto']
	}
});
