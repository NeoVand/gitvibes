import { describe, expect, it } from 'vitest';
import { tokenizeCodeBlock, tokenizeGitCommand } from './git-syntax';

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
