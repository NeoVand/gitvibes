import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	// CI runners are slow enough that parallel workers make the
	// playground's timing-sensitive tests flaky
	workers: process.env.CI ? 1 : undefined
});
