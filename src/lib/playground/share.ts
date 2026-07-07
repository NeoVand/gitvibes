/**
 * Shareable playground states: the scenario id plus the command history,
 * serialized into a URL fragment. Replaying the commands on a fresh seed
 * reproduces the exact repo state — no backend, no size worries for the
 * command counts a human produces.
 */
export interface SharedSession {
	scenarioId: string;
	commands: string[];
}

const PARAM = 'pg';

export function encodeShared(session: SharedSession): string {
	const json = JSON.stringify({ s: session.scenarioId, c: session.commands });
	// base64url so the fragment survives copy-paste everywhere
	const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function shareUrl(session: SharedSession): string {
	return `${location.origin}${location.pathname}?playground#${PARAM}=${encodeShared(session)}`;
}

export function decodeSharedFromHash(hash: string): SharedSession | null {
	const match = hash.match(new RegExp(`${PARAM}=([A-Za-z0-9_-]+)`));
	if (!match) return null;
	try {
		const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
		const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
		const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { s?: string; c?: string[] };
		if (typeof parsed.s !== 'string' || !Array.isArray(parsed.c)) return null;
		// Guard against absurd payloads — this replays commands one by one
		const commands = parsed.c.filter((x) => typeof x === 'string').slice(0, 500);
		return { scenarioId: parsed.s, commands };
	} catch {
		return null;
	}
}
