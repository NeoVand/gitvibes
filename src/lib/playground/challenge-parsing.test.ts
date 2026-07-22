import { describe, expect, it } from 'vitest';
import { commandTokensOf, commandWordOf, splitSegments } from './challenge-parsing';

describe('splitSegments', () => {
	it('a plain command is one segment', () => {
		expect(splitSegments('git status')).toEqual(['git status']);
	});

	it('splits on && and ;', () => {
		expect(splitSegments('git add . && git commit -m "x"')).toEqual([
			'git add .',
			'git commit -m "x"'
		]);
		expect(splitSegments('git fetch origin; git merge origin/main')).toEqual([
			'git fetch origin',
			'git merge origin/main'
		]);
	});

	it('splits on | and ||', () => {
		expect(splitSegments('git log | cat')).toEqual(['git log', 'cat']);
		expect(splitSegments('git rebase main || git rebase --abort')).toEqual([
			'git rebase main',
			'git rebase --abort'
		]);
	});

	it('never splits inside quotes — commit messages carry ; | && safely', () => {
		expect(splitSegments('git commit -m "fix: a; b | c && d"')).toEqual([
			'git commit -m "fix: a; b | c && d"'
		]);
		expect(splitSegments("echo 'one|two;three' > notes.txt")).toEqual([
			"echo 'one|two;three' > notes.txt"
		]);
	});

	it('drops a trailing comment, keeps a # inside a word', () => {
		expect(splitSegments('git status # what changed?')).toEqual(['git status']);
		expect(splitSegments('git show HEAD#')).toEqual(['git show HEAD#']);
	});

	it('tolerates blank and whitespace-only input', () => {
		expect(splitSegments('')).toEqual([]);
		expect(splitSegments('   ')).toEqual([]);
	});
});

describe('commandWordOf', () => {
	it('returns the git SUBCOMMAND, not "git"', () => {
		expect(commandWordOf('git status')).toBe('status');
		expect(commandWordOf('git commit -m "feat: two words"')).toBe('commit');
		expect(commandWordOf('git reset --hard HEAD~1')).toBe('reset');
	});

	it('skips git global flags that precede the subcommand', () => {
		expect(commandWordOf('git -C repo status')).toBe('status');
		expect(commandWordOf('git -c user.name=Ada commit -m "x"')).toBe('commit');
		expect(commandWordOf('git --no-pager log')).toBe('log');
		expect(commandWordOf('git --git-dir=.git status')).toBe('status');
	});

	it('a bare git (with or without globals) reports itself, never a free word', () => {
		expect(commandWordOf('git')).toBe('git');
		expect(commandWordOf('git --no-pager')).toBe('git');
	});

	it('non-git commands are their own word', () => {
		expect(commandWordOf('echo "done" > notes.txt')).toBe('echo');
		expect(commandWordOf('cat .env')).toBe('cat');
		expect(commandWordOf('ls')).toBe('ls');
		expect(commandWordOf('run-tests')).toBe('run-tests');
	});

	it('skips VAR=value prefixes', () => {
		expect(commandWordOf('PAGER=cat git log')).toBe('log');
		expect(commandWordOf('DEBUG=1 cat notes.txt')).toBe('cat');
	});

	it('empty input yields the empty word', () => {
		expect(commandWordOf('')).toBe('');
	});
});

describe('commandTokensOf', () => {
	it('hands back the subcommand and its arguments', () => {
		expect(commandTokensOf('git branch -d feature/x')).toEqual(['branch', '-d', 'feature/x']);
		expect(commandTokensOf('git stash list')).toEqual(['stash', 'list']);
		expect(commandTokensOf('git -C repo branch -a')).toEqual(['branch', '-a']);
	});
});
