/**
 * Lexical retrieval over the committed course index — plain TF-IDF with a
 * title boost, no dependencies, fully deterministic. Good enough to route
 * "what does chmod 755 mean" to section 5.2 without ever loading a model.
 */
import courseIndex from './course-index.json';

export interface CourseChunk {
	id: string;
	part: number;
	title: string;
	text: string;
}

export interface RetrievalHit {
	id: string;
	title: string;
	score: number;
	snippet: string;
}

const chunks = courseIndex as CourseChunk[];

/** Question filler that would otherwise drown the real signal. */
const STOPWORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'be',
	'can',
	'do',
	'does',
	'for',
	'how',
	'i',
	'in',
	'is',
	'it',
	'mean',
	'my',
	'of',
	'on',
	'or',
	'the',
	'this',
	'to',
	'use',
	'what',
	'when',
	'where',
	'which',
	'why',
	'with',
	'you',
	'your'
]);

/** Keeps shell-ish tokens intact: `chmod`, `755`, `rf` (from -rf), `$path`. */
function tokenize(text: string): string[] {
	return text.toLowerCase().match(/[a-z0-9$~][a-z0-9$~.+_-]*/g) ?? [];
}

interface ChunkStats {
	chunk: CourseChunk;
	tf: Map<string, number>;
	titleTokens: Set<string>;
	length: number;
}

// Corpus statistics, computed once at module load (the index is small).
const stats: ChunkStats[] = chunks.map((chunk) => {
	const tf = new Map<string, number>();
	for (const token of tokenize(chunk.text)) {
		tf.set(token, (tf.get(token) ?? 0) + 1);
	}
	return { chunk, tf, titleTokens: new Set(tokenize(chunk.title)), length: chunk.text.length };
});

const df = new Map<string, number>();
for (const { tf } of stats) {
	for (const token of tf.keys()) {
		df.set(token, (df.get(token) ?? 0) + 1);
	}
}

function idf(token: string): number {
	return Math.log(1 + stats.length / (1 + (df.get(token) ?? 0)));
}

/** ~160 chars of chunk text centered on the first hit of the rarest token. */
function makeSnippet(chunk: CourseChunk, queryTokens: string[]): string {
	const lower = chunk.text.toLowerCase();
	let best = -1;
	let bestIdf = 0;
	for (const token of queryTokens) {
		const at = lower.indexOf(token);
		if (at >= 0 && idf(token) > bestIdf) {
			best = at;
			bestIdf = idf(token);
		}
	}
	if (best < 0) best = 0;
	// Snap to the start of the sentence containing the hit.
	const sentenceStart = Math.max(
		chunk.text.lastIndexOf('. ', best),
		chunk.text.lastIndexOf('! ', best),
		chunk.text.lastIndexOf('? ', best)
	);
	const from = sentenceStart >= 0 ? sentenceStart + 2 : 0;
	let snippet = chunk.text.slice(from, from + 220).trim();
	// End at a sentence boundary when one lands in the window.
	const lastStop = Math.max(
		snippet.lastIndexOf('. '),
		snippet.indexOf('.') === snippet.length - 1 ? snippet.length - 1 : -1
	);
	if (snippet.length >= 200 && lastStop > 80) {
		snippet = snippet.slice(0, lastStop + 1);
	} else if (chunk.text.length > from + 220) {
		snippet = `${snippet}…`;
	}
	return snippet;
}

/**
 * Top-k chunks for a query, deduplicated by section id (best chunk wins,
 * with a small bonus when several chunks of the same section match — a
 * section that talks about the topic repeatedly is a stronger answer).
 */
export function retrieve(query: string, k = 3): RetrievalHit[] {
	const queryTokens = [...new Set(tokenize(query))].filter((t) => !STOPWORDS.has(t));
	if (queryTokens.length === 0) return [];

	const byId = new Map<string, { hit: RetrievalHit; extra: number }>();

	for (const { chunk, tf, titleTokens } of stats) {
		let score = 0;
		for (const token of queryTokens) {
			const count = tf.get(token) ?? 0;
			const weight = idf(token);
			if (count > 0) score += (1 + Math.log(count)) * weight;
			if (titleTokens.has(token)) score += 2.5 * weight;
		}
		if (score <= 0) continue;

		const existing = byId.get(chunk.id);
		if (!existing) {
			byId.set(chunk.id, {
				hit: { id: chunk.id, title: chunk.title, score, snippet: makeSnippet(chunk, queryTokens) },
				extra: 0
			});
		} else if (score > existing.hit.score) {
			existing.extra += existing.hit.score * 0.15;
			existing.hit.score = score;
			existing.hit.snippet = makeSnippet(chunk, queryTokens);
		} else {
			existing.extra += score * 0.15;
		}
	}

	return [...byId.values()]
		.map(({ hit, extra }) => ({
			...hit,
			// Lessons outrank the cheat sheet reference card: cheat chunks are
			// dense keyword lists, so on near-ties the citable section should
			// win. A cheat hit still tops the list when it is the real answer
			// (panic-button questions like "how do I quit vim").
			score: (hit.score + extra) * (hit.id.startsWith('cheat-') ? 0.85 : 1)
		}))
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
		.slice(0, k);
}

/** Panel helper: pretty title for a cited id ("5.2 chmod"), or null. */
export function titleForId(id: string): string | null {
	return chunks.find((c) => c.id === id)?.title ?? null;
}

/**
 * The raw course chunks belonging to one section id, in index order — for
 * grounding prompts about the spot the learner is reading (as opposed to
 * `retrieve`, which searches the whole course by query).
 */
export function sectionChunks(id: string, k = 3): CourseChunk[] {
	return chunks.filter((c) => c.id === id).slice(0, k);
}
