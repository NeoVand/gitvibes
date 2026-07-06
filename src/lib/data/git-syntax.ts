export type GitTokenType =
	| 'git'
	| 'subcommand'
	| 'command'
	| 'flag'
	| 'string'
	| 'placeholder'
	| 'hash'
	| 'arg'
	| 'comment'
	| 'conflict'
	| 'text'
	| 'space';

export interface GitToken {
	text: string;
	type: GitTokenType;
}

/** Plain lowercase word, e.g. `stash`, `cherry-pick` */
const SUBCOMMAND_WORD = /^[a-z][a-z-]*$/;

/** Executable name, e.g. `brew`, `winget`, `xcode-select` */
const COMMAND_WORD = /^[a-z][a-z0-9._-]*$/i;

/** `<file>`, `<branch1>..<branch2>`, `stash@{n}`, `HEAD~1`, `HEAD` */
const PLACEHOLDER = /<[^>]+>|@\{|^HEAD([~^]|$)/;

/** Abbreviated or full commit hash, e.g. `a1b2c3d` */
const COMMIT_HASH = /^[0-9a-f]{7,40}$/;

/** Merge conflict markers: `<<<<<<< HEAD`, `=======`, `>>>>>>> origin/main` */
const CONFLICT_MARKER = /^(<{7}|={7}|>{7})(\s|$)/;

/**
 * Second words that continue a multi-word git subcommand (`git stash pop`).
 * Words after unlisted subcommands are treated as arguments (`git switch main`).
 */
const SUBCOMMAND_CONTINUATIONS: Record<string, string[]> = {
	stash: ['push', 'pop', 'apply', 'list', 'show', 'drop', 'clear', 'branch'],
	bisect: ['start', 'good', 'bad', 'reset', 'run', 'skip'],
	remote: ['add', 'remove', 'rename', 'show', 'prune', 'set-url', 'get-url'],
	worktree: ['add', 'list', 'remove', 'prune', 'move', 'lock', 'unlock'],
	submodule: ['add', 'init', 'update', 'status', 'foreach', 'sync']
};

function classifyValue(value: string): GitTokenType {
	if (value.startsWith('"') || value.startsWith("'")) return 'string';
	if (PLACEHOLDER.test(value)) return 'placeholder';
	if (COMMIT_HASH.test(value)) return 'hash';
	return 'arg';
}

/**
 * Split a command into words and whitespace runs. Quoted segments stay
 * attached to their word, so `"Your Name"` and `--author="A B"` are
 * single parts even though they contain spaces.
 */
function splitParts(command: string): string[] {
	const parts: string[] = [];
	let i = 0;
	while (i < command.length) {
		let j = i;
		if (/\s/.test(command[i])) {
			while (j < command.length && /\s/.test(command[j])) j++;
		} else {
			let quote: string | null = null;
			while (j < command.length && (quote !== null || !/\s/.test(command[j]))) {
				const ch = command[j];
				if (quote !== null) {
					if (ch === quote) quote = null;
				} else if (ch === '"' || ch === "'") {
					quote = ch;
				}
				j++;
			}
		}
		parts.push(command.slice(i, j));
		i = j;
	}
	return parts;
}

/** Index of the first unquoted `#` that starts a comment, or -1. */
function findCommentStart(line: string): number {
	let quote: string | null = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quote !== null) {
			if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
			return i;
		}
	}
	return -1;
}

/**
 * Split a single shell command into typed tokens for syntax highlighting.
 * Concatenating every token's text reproduces the original string exactly,
 * so wrapping tokens in elements never changes the rendered text.
 */
export function tokenizeGitCommand(command: string): GitToken[] {
	const tokens: GitToken[] = [];
	let expectCommand = true; // next word is the executable (`sudo` re-arms this)
	let afterGit = false; // next word is a git subcommand
	let afterCommand = false; // next word may be a generic subcommand (`apt install`)
	let gitSubcommand: string | null = null; // for multi-word runs like `stash pop`

	for (const part of splitParts(command)) {
		if (!part) continue;

		if (/^\s+$/.test(part)) {
			tokens.push({ text: part, type: 'space' });
			continue;
		}

		if (expectCommand) {
			expectCommand = false;
			if (part === 'git') {
				tokens.push({ text: part, type: 'git' });
				afterGit = true;
				continue;
			}
			if (part === 'sudo') {
				tokens.push({ text: part, type: 'command' });
				expectCommand = true;
				continue;
			}
			if (COMMAND_WORD.test(part)) {
				tokens.push({ text: part, type: 'command' });
				afterCommand = true;
				continue;
			}
		}

		if (part.startsWith('-')) {
			afterGit = afterCommand = false;
			gitSubcommand = null;
			const eq = part.indexOf('=');
			if (eq !== -1 && eq < part.length - 1) {
				// `--author="<name>"` → flag + value
				tokens.push({ text: part.slice(0, eq + 1), type: 'flag' });
				tokens.push({ text: part.slice(eq + 1), type: classifyValue(part.slice(eq + 1)) });
			} else {
				tokens.push({ text: part, type: 'flag' });
			}
			continue;
		}

		if (SUBCOMMAND_WORD.test(part)) {
			if (afterGit) {
				tokens.push({ text: part, type: 'subcommand' });
				afterGit = false;
				gitSubcommand = part;
				continue;
			}
			if (gitSubcommand !== null && SUBCOMMAND_CONTINUATIONS[gitSubcommand]?.includes(part)) {
				tokens.push({ text: part, type: 'subcommand' });
				gitSubcommand = null;
				continue;
			}
			if (afterCommand) {
				tokens.push({ text: part, type: 'subcommand' });
				afterCommand = false;
				continue;
			}
		}

		afterGit = afterCommand = false;
		gitSubcommand = null;
		tokens.push({ text: part, type: classifyValue(part) });
	}

	return tokens;
}

/**
 * Tokenize one line of a .gitignore file. Unlike shell, `#` only starts a
 * comment at the beginning of the line (mid-pattern it is literal), lines
 * are patterns rather than commands, and a leading `!` re-includes.
 */
function tokenizeGitignoreLine(line: string): GitToken[] {
	if (!line) return [];
	const trimmed = line.trimStart();
	if (trimmed.startsWith('#')) {
		return [{ text: line, type: 'comment' }];
	}

	const tokens: GitToken[] = [];
	const leading = line.length - trimmed.length;
	if (leading > 0) tokens.push({ text: line.slice(0, leading), type: 'space' });

	let pattern = trimmed;
	if (pattern.startsWith('!')) {
		tokens.push({ text: '!', type: 'flag' });
		pattern = pattern.slice(1);
	}
	// Wildcards and character classes stand out; literal path text stays plain.
	for (const segment of pattern.split(/(\*+|\?|\[[^\]]*\])/)) {
		if (!segment) continue;
		const isWildcard = /^(\*+|\?|\[[^\]]*\])$/.test(segment);
		tokens.push({ text: segment, type: isWildcard ? 'hash' : 'text' });
	}
	return tokens;
}

export type CodeBlockMode = 'shell' | 'plain' | 'gitignore';

/**
 * Tokenize one line of a code block. In `shell` mode the code portion is
 * highlighted as a command; in `gitignore` mode lines are ignore patterns;
 * in `plain` mode only conflict markers and `#` comments are highlighted
 * and the rest is left as-is.
 */
function tokenizeLine(line: string, mode: CodeBlockMode): GitToken[] {
	if (mode === 'gitignore') {
		return tokenizeGitignoreLine(line);
	}

	if (CONFLICT_MARKER.test(line)) {
		return [{ text: line, type: 'conflict' }];
	}

	const commentStart = findCommentStart(line);
	const code = commentStart === -1 ? line : line.slice(0, commentStart);
	const tokens: GitToken[] = [];

	if (code) {
		if (mode === 'shell') {
			tokens.push(...tokenizeGitCommand(code));
		} else {
			tokens.push({ text: code, type: 'text' });
		}
	}
	if (commentStart !== -1) {
		tokens.push({ text: line.slice(commentStart), type: 'comment' });
	}
	return tokens;
}

/**
 * Tokenize a multi-line code block into one token list per line (lines do
 * not include their trailing `\n`). Joining each line's concatenated token
 * text with `\n` reproduces the original block exactly.
 */
export function tokenizeCodeBlock(code: string, mode: CodeBlockMode = 'shell'): GitToken[][] {
	return code.split('\n').map((line) => tokenizeLine(line, mode));
}
