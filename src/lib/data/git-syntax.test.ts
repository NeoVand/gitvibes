import { describe, expect, it } from 'vitest';
import { tokenizeCodeBlock, tokenizeGitCommand, tokenizeInlineCode } from './git-syntax';

describe('tokenizeGitCommand', () => {
	it('types git subcommands, flags, and placeholders', () => {
		const tokens = tokenizeGitCommand('git commit -m "<message>"');
		expect(tokens.map((t) => t.type)).toEqual([
			'git',
			'space',
			'subcommand',
			'space',
			'flag',
			'space',
			'string'
		]);
	});

	it('round-trips the original text exactly', () => {
		const cmd = 'git push --force-with-lease origin feature/x';
		expect(
			tokenizeGitCommand(cmd)
				.map((t) => t.text)
				.join('')
		).toBe(cmd);
	});
});

describe('shell mode leaves non-command lines plain', () => {
	const STATUS_OUTPUT = [
		'On branch feature/login',
		'Changes to be committed:',
		'  (use "git restore --staged <file>..." to unstage)',
		'        modified:   src/auth.py'
	].join('\n');

	it('git status output is not highlighted as commands', () => {
		const lines = tokenizeCodeBlock(STATUS_OUTPUT, 'shell');
		const types = lines.flat().map((t) => t.type);
		expect(types).not.toContain('command');
		expect(types).not.toContain('subcommand');
		expect(types).not.toContain('git');
	});

	it('file contents like ssh config stay plain', () => {
		const lines = tokenizeCodeBlock('Host *\n  AddKeysToAgent yes\n  UseKeychain yes', 'shell');
		for (const line of lines) {
			expect(line.map((t) => t.type)).toEqual(['text']);
		}
	});

	it('reflog output lines stay plain even though hashes look hashy', () => {
		const lines = tokenizeCodeBlock(
			'git reflog\n\na9f8e21 HEAD@{0}: reset: moving to HEAD~2',
			'shell'
		);
		expect(lines[0].map((t) => t.type)).toContain('git'); // the command line
		expect(lines[2].map((t) => t.type)).toEqual(['text']); // the output line
	});

	it('commit message text is not treated as a command', () => {
		const lines = tokenizeCodeBlock('fix(auth): reject expired tokens', 'shell');
		expect(lines[0].map((t) => t.type)).toEqual(['text']);
	});

	it('commands still highlight, including indented and non-git ones', () => {
		const [indented] = tokenizeCodeBlock('  echo "done" >&2', 'shell');
		expect(indented.map((t) => t.type)).toContain('command');
		const [brew] = tokenizeCodeBlock('brew install git', 'shell');
		expect(brew[0].type).toBe('command');
		const [gitLine] = tokenizeCodeBlock('git switch -c feature/x', 'shell');
		expect(gitLine[0].type).toBe('git');
	});

	it('comments and conflict markers keep their types on any line', () => {
		const lines = tokenizeCodeBlock('# just a note\n<<<<<<< HEAD\nplain words', 'shell');
		expect(lines[0][0].type).toBe('comment');
		expect(lines[1][0].type).toBe('conflict');
		expect(lines[2][0].type).toBe('text');
	});

	it('round-trips mixed command/output blocks exactly', () => {
		const lines = tokenizeCodeBlock(STATUS_OUTPUT, 'shell');
		const rebuilt = lines.map((line) => line.map((t) => t.text).join('')).join('\n');
		expect(rebuilt).toBe(STATUS_OUTPUT);
	});
});

describe('tokenizeInlineCode', () => {
	it('command mentions get the full command tokenizer', () => {
		const tokens = tokenizeInlineCode('git commit -m "msg"');
		expect(tokens[0].type).toBe('git');
		expect(tokens.map((t) => t.type)).toContain('flag');
		const npm = tokenizeInlineCode('npm test');
		expect(npm[0].type).toBe('command');
	});

	it('filenames and refs never masquerade as commands', () => {
		expect(tokenizeInlineCode('.env')).toEqual([{ text: '.env', type: 'arg' }]);
		expect(tokenizeInlineCode('AGENTS.md')).toEqual([{ text: 'AGENTS.md', type: 'arg' }]);
		expect(tokenizeInlineCode('feature/payments')).toEqual([
			{ text: 'feature/payments', type: 'arg' }
		]);
	});

	it('flags, refs, and hashes get their classified colors', () => {
		expect(tokenizeInlineCode('--force-with-lease')).toEqual([
			{ text: '--force-with-lease', type: 'flag' }
		]);
		expect(tokenizeInlineCode('HEAD~1')[0].type).toBe('placeholder');
		expect(tokenizeInlineCode('a1b2c3d')[0].type).toBe('hash');
	});

	it('round-trips exactly', () => {
		for (const s of ['git push -u origin main', 'HEAD@{1}', '.gitignore', 'chore(deps):']) {
			expect(
				tokenizeInlineCode(s)
					.map((t) => t.text)
					.join('')
			).toBe(s);
		}
	});
});

describe('yaml mode', () => {
	const CI_SAMPLE = [
		'name: CI',
		'on:',
		'  pull_request:',
		'    branches: [main]',
		'jobs:',
		'  checks:',
		'    steps:',
		'      - uses: actions/checkout@v4',
		'        with:',
		'          node-version: 22',
		'      - run: npm ci  # exact lockfile versions',
		'  enabled: true',
		'  types: ["minor", "patch"]'
	].join('\n');

	it('keys are typed subcommand, with or without values', () => {
		const lines = tokenizeCodeBlock('name: CI\non:', 'yaml');
		expect(lines[0][0]).toEqual({ text: 'name', type: 'subcommand' });
		expect(lines[1][0]).toEqual({ text: 'on', type: 'subcommand' });
	});

	it('list dashes, numbers, booleans, and quoted strings get their own types', () => {
		const lines = tokenizeCodeBlock(CI_SAMPLE, 'yaml');
		const flat = lines.flat();
		expect(flat).toContainEqual({ text: '-', type: 'flag' });
		expect(flat).toContainEqual({ text: '22', type: 'hash' });
		expect(flat).toContainEqual({ text: 'true', type: 'placeholder' });
		expect(flat).toContainEqual({ text: '"minor"', type: 'string' });
		expect(flat).toContainEqual({ text: '"patch"', type: 'string' });
	});

	it('run values are tokenized as shell commands', () => {
		const [line] = tokenizeCodeBlock('- run: npm run lint', 'yaml');
		expect(line).toContainEqual({ text: 'run', type: 'subcommand' }); // the yaml key
		expect(line).toContainEqual({ text: 'npm', type: 'command' }); // the shell command
	});

	it('comments survive, including trailing ones', () => {
		const lines = tokenizeCodeBlock('# top note\nkey: value  # aside', 'yaml');
		expect(lines[0][0].type).toBe('comment');
		expect(lines[1].at(-1)).toEqual({ text: '# aside', type: 'comment' });
	});

	it('round-trips the sample exactly', () => {
		const lines = tokenizeCodeBlock(CI_SAMPLE, 'yaml');
		const rebuilt = lines.map((line) => line.map((t) => t.text).join('')).join('\n');
		expect(rebuilt).toBe(CI_SAMPLE);
	});
});

describe('gitignore mode', () => {
	const SAMPLE = ['# OS junk', '.DS_Store', 'Thumbs.db', 'node_modules/', '!.env.example'].join(
		'\n'
	);

	it('never types a pattern as a command (Thumbs.db regression)', () => {
		const lines = tokenizeCodeBlock(SAMPLE, 'gitignore');
		const types = lines.flat().map((t) => t.type);
		expect(types).not.toContain('command');
		expect(types).not.toContain('subcommand');
	});

	it('comments, negation, and wildcards get their own types', () => {
		const lines = tokenizeCodeBlock('# deps\n!keep.txt\n*.pyc', 'gitignore');
		expect(lines[0][0].type).toBe('comment');
		expect(lines[1][0]).toEqual({ text: '!', type: 'flag' });
		expect(lines[2].map((t) => [t.text, t.type])).toEqual([
			['*', 'hash'],
			['.pyc', 'text']
		]);
	});

	it('round-trips each line exactly', () => {
		const lines = tokenizeCodeBlock(SAMPLE, 'gitignore');
		const rebuilt = lines.map((line) => line.map((t) => t.text).join('')).join('\n');
		expect(rebuilt).toBe(SAMPLE);
	});
});
