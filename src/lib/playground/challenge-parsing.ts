/**
 * Pure parsing helpers shared by challenges.ts and the nine per-part challenge
 * files.
 *
 * They live here rather than in challenges.ts because the part files import
 * them at RUNTIME while challenges.ts imports the part files — a cycle, which
 * ES modules resolve by leaving the later binding in its temporal dead zone
 * (a `ReferenceError: cannot access before initialization` and a blank page).
 * A leaf module both sides can depend on breaks the cycle for good; nothing
 * here may import from scenarios.ts or challenges.ts.
 */

/**
 * Split a command line into simple commands on unquoted | && || ; — the
 * definition of an "element". Quotes are respected, so a commit message
 * containing `;` or `|` stays inside its own segment. A trailing `#` comment
 * is dropped.
 */
export function splitSegments(line: string): string[] {
	const out: string[] = [];
	let cur = '';
	let quote: '' | "'" | '"' = '';
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quote) {
			cur += ch;
			if (ch === quote) quote = '';
			continue;
		}
		if (ch === "'" || ch === '"') {
			quote = ch;
			cur += ch;
			continue;
		}
		if (ch === '#' && (cur === '' || /\s$/.test(cur))) break;
		if (ch === '&' && line[i + 1] === '&') {
			out.push(cur);
			cur = '';
			i++;
			continue;
		}
		if (ch === '|' && line[i + 1] === '|') {
			out.push(cur);
			cur = '';
			i++;
			continue;
		}
		if (ch === '|' || ch === ';') {
			out.push(cur);
			cur = '';
			continue;
		}
		cur += ch;
	}
	out.push(cur);
	return out.map((s) => s.trim()).filter(Boolean);
}

/** Global git flags that consume the token AFTER them (`git -C repo status`). */
const GIT_GLOBALS_WITH_VALUE = new Set(['-C', '-c']);

/** Global git flags that stand alone or carry their value inline. */
function isStandaloneGitGlobal(token: string): boolean {
	return (
		token === '--no-pager' ||
		token === '--paginate' ||
		token.startsWith('--git-dir=') ||
		token.startsWith('--work-tree=')
	);
}

/**
 * The tokens of a segment from its command word onward, with `VAR=value`
 * prefixes skipped and — for git — the global flags that precede the
 * subcommand skipped too. So `git -C repo commit -m "done"` yields
 * `['commit', '-m', '"done"']` and `PAGER=cat cat notes.txt` yields
 * `['cat', 'notes.txt']`.
 */
export function commandTokensOf(segment: string): string[] {
	const tokens = segment.split(/\s+/).filter(Boolean);
	let i = 0;
	while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
	const head = stripQuotes(tokens[i] ?? '');
	if (head !== 'git') return tokens.slice(i);
	i++;
	while (i < tokens.length) {
		const token = tokens[i];
		if (GIT_GLOBALS_WITH_VALUE.has(token)) {
			i += 2;
			continue;
		}
		if (isStandaloneGitGlobal(token)) {
			i++;
			continue;
		}
		break;
	}
	// A bare `git` (or `git --no-pager`) has no subcommand — report `git`
	// itself, which no free list contains. Counting the unknown is the safe
	// direction.
	if (i >= tokens.length) return ['git'];
	return tokens.slice(i);
}

/**
 * The word a command line should be judged by. For git this is the SUBCOMMAND
 * — `git commit -m "x"` is a `commit`, not a `git` — because everything that
 * keys on command words (the recon-is-free list, pool dedup, the cheat-sheet
 * focus filter) needs `git status` and `git reset` to be different words.
 * Non-git commands (`echo`, `cat`, `ls`) are their own word.
 */
export function commandWordOf(segment: string): string {
	return stripQuotes(commandTokensOf(segment)[0] ?? '');
}

function stripQuotes(token: string): string {
	return token.replace(/^['"]/, '').replace(/['"]$/, '');
}
