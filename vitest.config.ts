import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		// LightningFS's lock mutex needs an indexedDB global even though the
		// playground stores file content in memory
		setupFiles: ['fake-indexeddb/auto']
	}
});
