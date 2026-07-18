/**
 * Contextual suggested questions: the pure half. Incremental parsing of the
 * streamed numbered lines a backend emits, top-up from the static starters,
 * and the grounded prompt the local model receives. No Svelte, no DOM — the
 * reactive state lives in runtime.svelte.ts, the chips in AgentPanel.svelte.
 */
import { retrieve, sectionChunks } from './retrieval';
import type { SuggestContext } from './types';

/** A suggestion round always aims for exactly four chips. */
export const SUGGESTION_COUNT = 4;

/** The hand-written fallbacks (also the whole row when no model is ready). */
export const STATIC_STARTERS = [
	'How do I undo a pushed commit?',
	'Is git reset --hard safe to approve?',
	'What does rebase actually do?'
] as const;

/** Prompt asks for ≤70 chars; the parser tolerates a little overshoot. */
const MAX_SUGGESTION_CHARS = 90;
const MIN_SUGGESTION_CHARS = 8;

/**
 * One streamed line → one usable question, or null. Strips list markers and
 * wrapping quotes, rejects fragments and runaway lines — small local models
 * follow "numbered lines" imperfectly, so the parser is the real contract.
 */
export function normalizeSuggestion(line: string): string | null {
	let s = line.trim();
	s = s.replace(/^(?:[-*•>]|\d+[.):])\s*/, '');
	s = s
		.replace(/^["'“”]+/, '')
		.replace(/["'“”]+$/, '')
		.trim();
	if (s.length < MIN_SUGGESTION_CHARS || s.length > MAX_SUGGESTION_CHARS) return null;
	if (!/[a-zA-Z]/.test(s)) return null;
	return s;
}

/**
 * Incremental line parser over the token stream: push() returns the questions
 * COMPLETED by that chunk (so each chip can materialize the moment its line
 * ends), flush() drains the unterminated tail. Dedupes case-insensitively and
 * stops at SUGGESTION_COUNT.
 */
export class SuggestionLineParser {
	#buf = '';
	#out: string[] = [];
	#seen = new Set<string>();

	push(text: string): string[] {
		this.#buf += text;
		const fresh: string[] = [];
		let nl: number;
		while ((nl = this.#buf.indexOf('\n')) >= 0) {
			const line = this.#buf.slice(0, nl);
			this.#buf = this.#buf.slice(nl + 1);
			this.#take(line, fresh);
		}
		return fresh;
	}

	flush(): string[] {
		const fresh: string[] = [];
		this.#take(this.#buf, fresh);
		this.#buf = '';
		return fresh;
	}

	get questions(): string[] {
		return [...this.#out];
	}

	#take(line: string, fresh: string[]): void {
		if (this.#out.length >= SUGGESTION_COUNT) return;
		const q = normalizeSuggestion(line);
		if (!q) return;
		const key = q.toLowerCase();
		if (this.#seen.has(key)) return;
		this.#seen.add(key);
		this.#out.push(q);
		fresh.push(q);
	}
}

/** Fill a short parse up to `n` questions from the static starters. */
export function topUpSuggestions(
	parsed: string[],
	starters: readonly string[] = STATIC_STARTERS,
	n = SUGGESTION_COUNT
): string[] {
	const out = parsed.slice(0, n);
	const seen = new Set(out.map((q) => q.toLowerCase()));
	for (const starter of starters) {
		if (out.length >= n) break;
		if (seen.has(starter.toLowerCase())) continue;
		seen.add(starter.toLowerCase());
		out.push(starter);
	}
	return out;
}

/** "5.2 chmod — Permissions & Environment" → "chmod" (for terse templates). */
export function suggestionTopic(label: string): string {
	const head = label.split(' — ')[0].trim();
	return head.replace(/^(?:part\s+\d+\s*·\s*|\d+(?:\.\d+)?\s+)/i, '').trim() || head;
}

/** Cap per-excerpt length so three chunks stay a lightweight prompt. */
const MAX_SNIPPET_CHARS = 350;

/**
 * Course excerpts grounding a suggestion round: the section's own chunks when
 * it has any (real sections, parts, hero), else a lexical search by label
 * (playground exercises and scenarios have no chunks of their own).
 */
export function groundingSnippets(spot: { sectionId: string | null; label: string }): string[] {
	const own = spot.sectionId ? sectionChunks(spot.sectionId, 3) : [];
	const texts =
		own.length > 0 ? own.map((c) => c.text) : retrieve(spot.label, 3).map((h) => h.snippet);
	return texts.map((t) => (t.length > MAX_SNIPPET_CHARS ? `${t.slice(0, MAX_SNIPPET_CHARS)}…` : t));
}

/** The no-tools prompt the local model answers with 4 numbered questions. */
export function buildSuggestionPrompt(ctx: SuggestContext): string {
	const excerpts = ctx.snippets.map((s, i) => `${i + 1}) ${s}`).join('\n');
	return [
		'You write suggested questions for a beginner-friendly terminal course.',
		`The learner is currently reading: "${ctx.label}".`,
		'',
		'Course excerpts from that spot:',
		excerpts || '(no excerpts — suggest gentle beginner questions about the terminal)',
		'',
		`Write EXACTLY ${SUGGESTION_COUNT} short questions this learner might ask next.`,
		'Rules:',
		`- one question per line, numbered "1." to "${SUGGESTION_COUNT}."`,
		'- each under 70 characters',
		'- questions a curious beginner would actually ask, grounded in the excerpts',
		'- at most ONE question may invite a live terminal demonstration',
		`- output ONLY the ${SUGGESTION_COUNT} numbered lines, nothing else`
	].join('\n');
}
