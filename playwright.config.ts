import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// vite.config.ts routes PORT through to `vite preview`, so overriding PORT
// here moves the whole e2e stack off a busy 4173 without further changes.
const PORT = Number(process.env.PORT) || 4173;

// A worktree under .claude/ carries its own copy of every spec; without the
// ignore below, a run from the MAIN checkout executes each one twice against
// a single server. But the ignore must not apply when this config itself IS
// the worktree's — matched against absolute paths, '**/.claude/**' swallows
// every spec in a tree whose own root contains /.claude/, which reads as
// "No tests found" from inside the very checkout being tested.
const IS_WORKTREE = fileURLToPath(new URL('.', import.meta.url)).includes('/.claude/');

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: PORT,
		env: { PORT: String(PORT) },
		// The production build alone can take over Playwright's default 60s
		// on a loaded machine; give the build + preview combo real headroom.
		timeout: 180_000
	},
	testMatch: '**/*.e2e.{ts,js}',
	testIgnore: IS_WORKTREE ? [] : '**/.claude/**',
	// CI runners are slow enough that parallel workers make the
	// playground's timing-sensitive tests flaky
	workers: process.env.CI ? 1 : undefined
});
