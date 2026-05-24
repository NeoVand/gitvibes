import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	define: {
		global: 'globalThis'
	},
	resolve: {
		alias: {
			buffer: 'buffer'
		}
	},
	optimizeDeps: {
		include: ['isomorphic-git', '@isomorphic-git/lightning-fs', 'mermaid', 'buffer']
	}
});
