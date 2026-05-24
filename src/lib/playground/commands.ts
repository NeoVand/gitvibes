import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

export interface CommandResult {
	output: string;
	error?: boolean;
}

const AUTHOR = { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' };

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

async function isMergeInProgress(engine: GitEngine): Promise<boolean> {
	try {
		await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'MERGE_HEAD' });
		return true;
	} catch {
		return false;
	}
}

async function formatStatus(engine: GitEngine): Promise<string> {
	const { fs, dir } = engine;
	const branch = (await git.currentBranch({ fs, dir })) ?? 'HEAD';
	const matrix = await git.statusMatrix({ fs, dir });
	const merging = await isMergeInProgress(engine);

	const lines: string[] = [`On branch ${branch}`];
	if (merging) {
		lines.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '');
	}

	const unstaged: string[] = [];
	const staged: string[] = [];
	const untracked: string[] = [];
	const unmerged: string[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		if (stage === 3 || (merging && head === 1 && workdir === 2 && stage === 1)) {
			unmerged.push(filepath);
		} else if (head === 0 && workdir === 2 && stage === 0) {
			untracked.push(filepath);
		} else if (head === 1 && workdir === 2 && stage === 1) {
			unstaged.push(filepath);
		} else if (stage === 2 && (workdir === 2 || workdir === 1)) {
			staged.push(filepath);
		}
	}

	if (unmerged.length > 0) {
		lines.push('Unmerged paths:', '  (use "git add <file>..." to mark resolution)');
		for (const f of unmerged) lines.push(`\tboth modified:   ${f}`);
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

	if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && unmerged.length === 0) {
		lines.push('nothing to commit, working tree clean');
	}

	return lines.join('\n');
}

async function formatLog(engine: GitEngine, oneline: boolean, all: boolean): Promise<string> {
	const { fs, dir } = engine;
	const branches = all
		? await git.listBranches({ fs, dir })
		: [(await git.currentBranch({ fs, dir })) ?? 'main'];
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

async function addAll(engine: GitEngine): Promise<void> {
	const files = await engine.listWorkingFiles();
	for (const file of files) {
		await git.add({ fs: engine.fs, dir: engine.dir, filepath: file });
	}
}

async function resolveHead(engine: GitEngine, rev: string): Promise<string> {
	return engine.resolveHead(rev);
}

async function runRebase(engine: GitEngine, ontoBranch: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = await git.currentBranch({ fs, dir });
	if (!current) return { output: 'fatal: not on a branch', error: true };

	const currentOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${current}` });
	const ontoOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${ontoBranch}` });
	const mergeBases = await git.findMergeBase({ fs, dir, oids: [currentOid, ontoOid] });
	const base = Array.isArray(mergeBases) ? mergeBases[0] : mergeBases;
	if (!base) return { output: 'fatal: merge base not found', error: true };

	const log = await git.log({ fs, dir, ref: current, depth: 100 });
	const toReplay = [];
	for (const entry of [...log].reverse()) {
		if (entry.oid === base) break;
		toReplay.push(entry);
	}

	await git.checkout({ fs, dir, ref: ontoBranch });
	await git.deleteBranch({ fs, dir, ref: current });
	await git.branch({ fs, dir, ref: current, checkout: true });

	for (const entry of toReplay) {
		try {
			await git.cherryPick({ fs, dir, oid: entry.oid, committer: AUTHOR });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				output: `error: could not apply ${shortOid(entry.oid)}... ${entry.commit.message.split('\n')[0]}\n${message}`,
				error: true
			};
		}
	}

	return { output: `Successfully rebased and updated refs/heads/${current}.` };
}

async function runMerge(engine: GitEngine, branch: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = (await git.currentBranch({ fs, dir })) ?? 'HEAD';

	try {
		const result = await git.merge({
			fs,
			dir,
			ours: current,
			theirs: branch,
			author: AUTHOR
		});

		if (result.alreadyMerged) {
			return { output: 'Already up to date.' };
		}
		if (result.fastForward) {
			return { output: 'Fast-forward merge.' };
		}
		return { output: `Merge made by the 'ort' strategy.` };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (/conflict/i.test(message)) {
			return {
				output: `Auto-merging files\nCONFLICT (content): Merge conflict\nAutomatic merge failed; fix conflicts and then commit the result.`,
				error: true
			};
		}
		return { output: `error: ${message}`, error: true };
	}
}

async function runStash(engine: GitEngine, args: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const joined = args.trim();

	if (joined === 'list') {
		const list = (await git.stash({ fs, dir, op: 'list' })) as unknown;
		if (!list || (Array.isArray(list) && list.length === 0)) {
			return { output: '' };
		}
		if (typeof list === 'string') {
			return { output: list };
		}
		const lines = (list as Array<{ message?: string } | string>).map((entry, i) => {
			if (typeof entry === 'string') return `stash@{${i}}: ${entry}`;
			return `stash@{${i}}: ${entry.message ?? 'WIP'}`;
		});
		return { output: lines.join('\n') };
	}

	if (joined.startsWith('push')) {
		const msgMatch = joined.match(/-m\s+("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s-]+)/);
		let message = 'WIP';
		if (msgMatch) {
			const raw = msgMatch[1];
			message =
				(raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
					? raw.slice(1, -1)
					: raw;
		}
		await git.stash({ fs, dir, op: 'push', message });
		return { output: `Saved working directory and index state\n  On ${(await git.currentBranch({ fs, dir })) ?? 'HEAD'}: ${message}` };
	}

	if (joined === 'pop') {
		await git.stash({ fs, dir, op: 'pop' });
		return { output: 'Dropped refs/stash@{0} (stash applied)' };
	}

	if (joined === 'apply') {
		await git.stash({ fs, dir, op: 'apply' });
		return { output: '' };
	}

	return { output: `Unknown stash subcommand. Try: push, pop, list, apply`, error: true };
}

export async function runGitCommand(engine: GitEngine, rawInput: string): Promise<CommandResult> {
	const input = rawInput.trim();
	if (!input) return { output: '' };

	if (input === 'clear') return { output: '__CLEAR__' };

	// Shell-style file write for conflict resolution practice
	const shellWrite = input.match(/^(?:echo|printf)\s+(.+?)\s*>\s*(.+)$/);
	if (shellWrite) {
		const raw = shellWrite[1].trim();
		const filepath = shellWrite[2].trim();
		const content = raw.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
		await engine.writeFile(filepath, content.endsWith('\n') ? content : `${content}\n`);
		return { output: '' };
	}

	if (input === 'help') {
		return {
			output: `Supported commands:
  git status
  git add <file> | git add .
  git commit -m "message" | git commit --amend [--no-edit] [-m "msg"]
  git log [--oneline] [--all]
  git branch [-a]
  git switch <branch> | git switch -c <branch>
  git checkout <branch> | git checkout -b <branch>
  git restore <file> | git restore --staged <file>
  git reset --soft HEAD~1 | git reset --mixed HEAD~1 | git reset --hard HEAD~N
  git merge <branch>
  git rebase <branch>
  git stash push -m "msg" | git stash pop | git stash list
  git diff
  echo "content" > file.txt  (resolve conflicts)

Other: clear, help`
		};
	}

	// Allow chained commands with &&
	const segments = input.includes('&&') ? input.split('&&').map((s) => s.trim()) : [input];
	const outputs: string[] = [];
	for (const segment of segments) {
		const result = await runSingleCommand(engine, segment);
		if (result.output === '__CLEAR__') return result;
		if (result.output) outputs.push(result.output);
		if (result.error) return { output: outputs.join('\n'), error: true };
	}
	return { output: outputs.join('\n') };
}

async function runSingleCommand(engine: GitEngine, input: string): Promise<CommandResult> {
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
					await addAll(engine);
					return { output: '' };
				}
				for (const filepath of rest) {
					await git.add({ fs: engine.fs, dir: engine.dir, filepath });
				}
				return { output: '' };
			}

			case 'commit': {
				const isAmend = rest.includes('--amend');
				const message = parseQuotedMessage(args);
				const merging = await isMergeInProgress(engine);

				if (isAmend) {
					const oid = await git.commit({
						fs: engine.fs,
						dir: engine.dir,
						message: message ?? undefined,
						author: AUTHOR,
						amend: true
					});
					const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
					return { output: `[${branch} ${shortOid(oid)}] ${message ?? 'amended commit'}` };
				}

				if (merging && !message) {
					const oid = await git.commit({ fs: engine.fs, dir: engine.dir, message: 'Merge commit', author: AUTHOR });
					const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
					return { output: `[${branch} ${shortOid(oid)}] Merge commit` };
				}

				if (!message) {
					return { output: 'error: switch `m` requires a value', error: true };
				}

				const oid = await git.commit({
					fs: engine.fs,
					dir: engine.dir,
					message,
					author: AUTHOR
				});
				const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
				return { output: `[${branch} ${shortOid(oid)}] ${message}` };
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
				if (!name) return { output: 'fatal: missing branch name', error: true };

				if (create) {
					await git.branch({ fs: engine.fs, dir: engine.dir, ref: name });
				}
				await git.checkout({ fs: engine.fs, dir: engine.dir, ref: name });
				return {
					output: create ? `Switched to a new branch '${name}'` : `Switched to branch '${name}'`
				};
			}

			case 'restore': {
				const staged = rest.includes('--staged');
				const filepath = rest.filter((a) => !a.startsWith('-')).join(' ');
				if (!filepath) return { output: 'fatal: you must specify path(s) to restore', error: true };

				if (staged) {
					await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath });
					return { output: '' };
				}

				await git.checkout({ fs: engine.fs, dir: engine.dir, filepaths: [filepath], force: true });
				return { output: '' };
			}

			case 'reset': {
				const hard = rest.includes('--hard');
				const soft = rest.includes('--soft');
				const mixed = rest.includes('--mixed') || (!hard && !soft);
				const rev = rest.find((r) => !r.startsWith('-')) ?? 'HEAD~1';
				const oid = await resolveHead(engine, rev);

				await git.writeRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD', value: oid });

				if (hard) {
					await git.checkout({ fs: engine.fs, dir: engine.dir, ref: oid, force: true });
				} else if (mixed) {
					const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
					for (const [filepath, , , stage] of matrix) {
						if (stage === 2 || stage === 3) {
							await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath });
						}
					}
				}

				return { output: '' };
			}

			case 'merge':
				return runMerge(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? '');

			case 'rebase':
				return runRebase(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? 'main');

			case 'stash':
				return runStash(engine, rest.join(' '));

			case 'diff': {
				const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
				const changed = matrix.filter(([, head, workdir]) => head !== workdir);
				if (changed.length === 0) return { output: '' };
				return { output: changed.map(([filepath]) => `modified: ${filepath}`).join('\n') };
			}

			default:
				return {
					output: `git: '${sub}' is not supported in the playground yet. Type 'help' for available commands.`,
					error: true
				};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { output: `error: ${message}`, error: true };
	}
}
