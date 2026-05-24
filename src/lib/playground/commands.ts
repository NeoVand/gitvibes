import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

export interface CommandResult {
	output: string;
	error?: boolean;
}

function parseQuotedMessage(input: string): string | null {
	const match = input.match(/-m\s+("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s-][^\s]*)/);
	if (!match) return null;
	const raw = match[1];
	if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
		return raw.slice(1, -1);
	}
	return raw;
}

function shortOid(oid: string): string {
	return oid.slice(0, 7);
}

async function formatStatus(engine: GitEngine): Promise<string> {
	const { fs, dir } = engine;
	const branch = (await git.currentBranch({ fs, dir })) ?? 'HEAD';
	const matrix = await git.statusMatrix({ fs, dir });

	const lines: string[] = [`On branch ${branch}`];

	const unstaged: string[] = [];
	const staged: string[] = [];
	const untracked: string[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		if (head === 0 && workdir === 2 && stage === 0) {
			untracked.push(filepath);
		} else if (head === 1 && workdir === 2 && stage === 1) {
			unstaged.push(filepath);
		} else if (stage === 2 && workdir === 2) {
			staged.push(filepath);
		} else if (head === 0 && workdir === 2 && stage === 2) {
			staged.push(filepath);
		} else if (head === 1 && workdir === 2 && stage === 2) {
			staged.push(filepath);
		} else if (head === 1 && workdir === 1 && stage === 2) {
			staged.push(filepath);
		}
	}

	if (staged.length > 0) {
		lines.push('Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)');
		for (const f of staged) lines.push(`\tmodified:   ${f}`);
	}

	if (unstaged.length > 0) {
		lines.push('Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)');
		for (const f of unstaged) lines.push(`\tmodified:   ${f}`);
	}

	if (untracked.length > 0) {
		lines.push('Untracked files:', '  (use "git add <file>..." to include in what will be committed)');
		for (const f of untracked) lines.push(`\t${f}`);
	}

	if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
		lines.push('nothing to commit, working tree clean');
	}

	return lines.join('\n');
}

async function formatLog(engine: GitEngine, oneline: boolean, all: boolean): Promise<string> {
	const { fs, dir } = engine;
	const branches = all ? await git.listBranches({ fs, dir }) : [(await git.currentBranch({ fs, dir })) ?? 'main'];
	const current = (await git.currentBranch({ fs, dir })) ?? 'main';
	const seen = new Set<string>();
	const lines: string[] = [];

	for (const branch of branches) {
		const log = await git.log({ fs, dir, ref: branch, depth: 50 });
		for (const entry of log) {
			if (seen.has(entry.oid)) continue;
			seen.add(entry.oid);

			const headMarker = branch === current ? `(HEAD -> ${branch})` : `(${branch})`;
			if (oneline) {
				lines.push(`${shortOid(entry.oid)} ${headMarker} ${entry.commit.message.split('\n')[0]}`);
			} else {
				lines.push(`commit ${entry.oid}`);
				lines.push(`Author: ${entry.commit.author.name} <${entry.commit.author.email}>`);
				lines.push('');
				lines.push(`    ${entry.commit.message}`);
				lines.push('');
			}
		}
	}

	return lines.join('\n') || 'Your branch does not have any commits yet.';
}

export async function runGitCommand(engine: GitEngine, rawInput: string): Promise<CommandResult> {
	const input = rawInput.trim();
	if (!input) return { output: '' };

	if (input === 'clear') return { output: '__CLEAR__' };
	if (input === 'help') {
		return {
			output: `Supported commands:
  git status
  git add <file> | git add .
  git commit -m "message"
  git log [--oneline] [--all]
  git branch [-a]
  git switch <branch> | git switch -c <branch>
  git checkout <branch> | git checkout -b <branch>
  git restore <file>
  git reset --soft HEAD~1
  git diff (staged vs unstaged summary)

Other: clear, help`
		};
	}

	if (!input.startsWith('git ')) {
		return { output: `gitvibes: command not found: ${input.split(' ')[0]}`, error: true };
	}

	const args = input.slice(4).trim();
	const [sub, ...rest] = args.split(/\s+/);

	try {
		switch (sub) {
			case 'status':
				return { output: await formatStatus(engine) };

			case 'add': {
				const target = rest.join(' ').trim();
				if (!target) return { output: 'Nothing specified, nothing added.', error: true };
				if (target === '.' || target === '-A' || target === '--all') {
					const files = await engine.listWorkingFiles();
					for (const file of files) {
						await git.add({ fs: engine.fs, dir: engine.dir, filepath: file });
					}
					return { output: '' };
				}
				const paths = rest;
				for (const filepath of paths) {
					await git.add({ fs: engine.fs, dir: engine.dir, filepath });
				}
				return { output: '' };
			}

			case 'commit': {
				const message = parseQuotedMessage(args);
				if (!message) {
					return { output: 'error: switch `m` requires a value', error: true };
				}
				const oid = await git.commit({
					fs: engine.fs,
					dir: engine.dir,
					message,
					author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
				});
				const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
				const stats = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
				const changed = stats.filter(([, , , stage]) => stage === 0).length;
				return {
					output: `[${branch} ${shortOid(oid)}] ${message}\n ${changed} files changed`
				};
			}

			case 'log': {
				const oneline = rest.includes('--oneline');
				const all = rest.includes('--all');
				return { output: await formatLog(engine, oneline, all) };
			}

			case 'branch': {
				const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
				const current = await git.currentBranch({ fs: engine.fs, dir: engine.dir });
				if (rest.length === 0 || rest.includes('-a')) {
					return {
						output: branches.map((b) => `${b === current ? '* ' : '  '}${b}`).join('\n') || 'No branches yet'
					};
				}
				const name = rest[rest.length - 1];
				await git.branch({ fs: engine.fs, dir: engine.dir, ref: name });
				return { output: '' };
			}

			case 'switch':
			case 'checkout': {
				const create = rest.includes('-c') || rest.includes('-b');
				const name = rest.filter((a) => !a.startsWith('-')).pop();
				if (!name) return { output: `fatal: missing branch name`, error: true };

				if (create) {
					await git.branch({ fs: engine.fs, dir: engine.dir, ref: name });
				}
				await git.checkout({ fs: engine.fs, dir: engine.dir, ref: name });
				return {
					output: create ? `Switched to a new branch '${name}'` : `Switched to branch '${name}'`
				};
			}

			case 'restore': {
				const filepath = rest.filter((a) => !a.startsWith('-')).join(' ');
				if (!filepath) return { output: 'fatal: you must specify path(s) to restore', error: true };
				await git.checkout({ fs: engine.fs, dir: engine.dir, filepaths: [filepath], force: true });
				return { output: '' };
			}

			case 'reset': {
				if (rest.join(' ') === '--soft HEAD~1') {
					const log = await git.log({ fs: engine.fs, dir: engine.dir, depth: 2 });
					if (log.length < 2) {
						return { output: 'fatal: ambiguous argument HEAD~1: unknown revision', error: true };
					}
					await git.writeRef({
						fs: engine.fs,
						dir: engine.dir,
						ref: 'HEAD',
						value: log[1].oid
					});
					return { output: '' };
				}
				return { output: `Unsupported reset: ${rest.join(' ')}`, error: true };
			}

			case 'diff': {
				const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
				const changed = matrix.filter(([, head, workdir]) => head !== workdir);
				if (changed.length === 0) return { output: '' };
				const lines = changed.map(([filepath]) => `modified: ${filepath}`);
				return { output: lines.join('\n') };
			}

			default:
				return { output: `git: '${sub}' is not supported in the playground yet. Type 'help' for available commands.`, error: true };
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { output: `error: ${message}`, error: true };
	}
}
