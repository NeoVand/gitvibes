const THEME_KEY = 'gitvibes-theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export function loadThemePreference(): ThemePreference {
	if (typeof window === 'undefined') return 'system';
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
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
