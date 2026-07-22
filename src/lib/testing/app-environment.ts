/**
 * Stand-in for SvelteKit's `$app/environment` under vitest, which runs without
 * the SvelteKit plugin and so has no module graph to resolve it from.
 *
 * `browser: false` is the honest value here: these are node-side unit tests
 * with no localStorage, and it is what makes stores that persist on write
 * exercise their in-memory path instead of reaching for a global that does not
 * exist.
 */
export const browser = false;
export const dev = true;
export const building = false;
export const version = 'test';
