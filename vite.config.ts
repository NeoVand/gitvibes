import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	// Preview harness assigns a port via PORT; Vite doesn't read it natively
	server: {
		port: Number(process.env.PORT) || 5173
	},
	preview: {
		port: Number(process.env.PORT) || 4173
	},
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
