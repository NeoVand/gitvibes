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
		include: ['isomorphic-git', '@isomorphic-git/lightning-fs', 'mermaid', 'buffer'],
		// transformers.js loads ONNX/WASM backends dynamically inside the model
		// worker; pre-bundling rewrites those asset URLs and breaks the worker.
		exclude: ['@huggingface/transformers']
	},
	// The model worker (src/lib/ai/local/worker.ts) uses dynamic imports via
	// transformers.js — only the ES worker format supports code-splitting.
	worker: {
		format: 'es'
	}
});
