const THEME_KEY = 'gitvibes-theme';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * A visitor who has never chosen gets dark. The section artwork is painted on
 * near-black and the terminal is phosphor-on-dark, so light is the theme this
 * course looks least like itself in — and it stays one click away.
 *
 * 'system' remains a real, storable preference: choosing it means "follow my
 * OS", and only an unset preference resolves to dark.
 */
const DEFAULT_THEME: ThemePreference = 'dark';

export function loadThemePreference(): ThemePreference {
	if (typeof window === 'undefined') return DEFAULT_THEME;
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return DEFAULT_THEME;
}

export function saveThemePreference(theme: ThemePreference) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(THEME_KEY, theme);
}

export function getEffectiveTheme(theme: ThemePreference): 'light' | 'dark' {
	if (theme !== 'system') return theme;
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemePreference) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.classList.remove('light', 'dark');
	if (theme !== 'system') {
		root.classList.add(theme);
	}
}
