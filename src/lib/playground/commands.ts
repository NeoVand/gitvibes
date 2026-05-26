import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';
import { handlePatchAnswer, startPatchSession } from './patch-mode';
import {
	DEFAULT_REMOTE,
	DEFAULT_REMOTE_URL,
	resolveRemoteBranch,
	writeRemoteTrackingRef
} from './remote-state';
import { PLAYGROUND_COMMANDS_HELP } from './scenarios';
import { listFilesAtCommit, readFileAtCommit, resolveCommitOid } from './tree-utils';

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
	if (engine.remote.upstream) {
		const localOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
		const remoteOid = engine.remote.getBranch(engine.remote.upstream);
		if (localOid && remoteOid) {
			if (localOid === remoteOid) lines.push(`Your branch is up to date with 'origin/${engine.remote.upstream}'.`);
			else lines.push(`Your branch and 'origin/${engine.remote.upstream}' have diverged.`);
		}
	}
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
	const branchSet = new Set<string>();
	if (all) {
		for (const b of await git.listBranches({ fs, dir })) branchSet.add(b);
		for (const ref of engine.remote.branches.keys()) branchSet.add(`origin/${ref}`);
	} else {
		branchSet.add((await git.currentBranch({ fs, dir })) ?? 'main');
	}

	const current = (await git.currentBranch({ fs, dir })) ?? 'main';
	const seen = new Set<string>();
	const lines: string[] = [];

	for (const branch of branchSet) {
		let ref = branch;
		if (branch.startsWith('origin/')) {
			const remoteOid = engine.remote.getBranch(branch.slice('origin/'.length));
			if (!remoteOid) continue;
			ref = remoteOid;
		}
		const log = await git.log({ fs, dir, ref, depth: 50 }).catch(() => []);
		for (const entry of log) {
			if (seen.has(entry.oid)) continue;
			seen.add(entry.oid);
			const headMarker = branch === current || branch === `origin/${current}` ? `(HEAD -> ${branch})` : `(${branch})`;
			if (oneline) {
				lines.push(`${shortOid(entry.oid)} ${headMarker} ${entry.commit.message.split('\n')[0]}`);
			} else {
				lines.push(`commit ${entry.oid}`, `Author: ${entry.commit.author.name}`, '', `    ${entry.commit.message}`, '');
			}
		}
	}

	return lines.join('\n') || 'Your branch does not have any commits yet.';
}

async function addAll(engine: GitEngine): Promise<void> {
	for (const file of await engine.listWorkingFiles()) {
		await git.add({ fs: engine.fs, dir: engine.dir, filepath: file });
	}
}

async function runRebase(engine: GitEngine, ontoBranch: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = await git.currentBranch({ fs, dir });
	if (!current) return { output: 'fatal: not on a branch', error: true };

	const currentOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${current}` });
	const ontoOid = ontoBranch.startsWith('origin/')
		? engine.remote.getBranch(ontoBranch.slice('origin/'.length)) ??
			(await resolveRemoteBranch(engine, DEFAULT_REMOTE, ontoBranch.slice('origin/'.length)))
		: await git.resolveRef({ fs, dir, ref: `refs/heads/${ontoBranch}` }).catch(() => null);

	if (!ontoOid) return { output: `fatal: invalid upstream '${ontoBranch}'`, error: true };

	const mergeBases = await git.findMergeBase({ fs, dir, oids: [currentOid, ontoOid] });
	const base = Array.isArray(mergeBases) ? mergeBases[0] : mergeBases;
	if (!base) return { output: 'fatal: merge base not found', error: true };

	const log = await git.log({ fs, dir, ref: current, depth: 100 });
	const toReplay = [];
	for (const entry of [...log].reverse()) {
		if (entry.oid === base) break;
		toReplay.push(entry);
	}

	await git.checkout({ fs, dir, ref: ontoOid });
	await git.deleteBranch({ fs, dir, ref: current });
	await git.branch({ fs, dir, ref: current, checkout: true });

	for (const entry of toReplay) {
		try {
			await git.cherryPick({ fs, dir, oid: entry.oid, committer: AUTHOR });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return { output: `error: could not apply ${shortOid(entry.oid)}...\n${message}`, error: true };
		}
	}

	return { output: `Successfully rebased and updated refs/heads/${current}.` };
}

async function runMerge(engine: GitEngine, branch: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = (await git.currentBranch({ fs, dir })) ?? 'HEAD';
	let theirs = branch;

	if (branch.startsWith('origin/')) {
		const remoteBranch = branch.slice('origin/'.length);
		const remoteOid = engine.remote.getBranch(remoteBranch);
		if (!remoteOid) return { output: `fatal: couldn't find remote ref ${branch}`, error: true };
		await git.branch({ fs, dir, ref: branch, object: remoteOid });
		theirs = branch;
	}

	try {
		const result = await git.merge({ fs, dir, ours: current, theirs, author: AUTHOR });
		if (result.alreadyMerged) return { output: 'Already up to date.' };
		if (result.fastForward) return { output: 'Fast-forward merge.' };
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
		if (!list || (Array.isArray(list) && list.length === 0)) return { output: '' };
		if (typeof list === 'string') return { output: list };
		const lines = (list as Array<{ message?: string } | string>).map((entry, i) =>
			typeof entry === 'string' ? `stash@{${i}}: ${entry}` : `stash@{${i}}: ${entry.message ?? 'WIP'}`
		);
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
		return {
			output: `Saved working directory and index state\n  On ${(await git.currentBranch({ fs, dir })) ?? 'HEAD'}: ${message}`
		};
	}

	if (joined === 'pop') {
		await git.stash({ fs, dir, op: 'pop' });
		return { output: 'Dropped refs/stash@{0} (stash applied)' };
	}
	if (joined === 'apply') {
		await git.stash({ fs, dir, op: 'apply' });
		return { output: '' };
	}
	return { output: 'Unknown stash subcommand. Try: push, pop, list, apply', error: true };
}

async function runFetch(engine: GitEngine, remote = DEFAULT_REMOTE): Promise<CommandResult> {
	const lines: string[] = [`From ${DEFAULT_REMOTE_URL}`];
	for (const [branch, oid] of engine.remote.branches) {
		const oldOid = await resolveRemoteBranch(engine, remote, branch);
		await writeRemoteTrackingRef(engine, remote, branch, oid);
		const oldShort = oldOid ? shortOid(oldOid) : '0000000';
		lines.push(`   ${oldShort}..${shortOid(oid)}  ${branch}       -> ${remote}/${branch}`);
	}
	if (engine.remote.branches.size === 0) {
		return { output: 'Everything up-to-date' };
	}
	return { output: lines.join('\n') };
}

async function runPush(engine: GitEngine, args: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const setUpstream = args.includes('-u');
	const isForce = args.includes('--force') || args.includes('-f');
	const isForceWithLease = args.includes('--force-with-lease');
	const parts = args.split(/\s+/).filter((p) => !p.startsWith('-'));
	const remote = parts[0] ?? DEFAULT_REMOTE;
	let branch = parts[1] ?? (await git.currentBranch({ fs, dir }));

	if (!branch) return { output: 'fatal: no branch checked out', error: true };

	const oid = await git.resolveRef({ fs, dir, ref: `refs/heads/${branch}` });
	const existingRemoteOid = engine.remote.getBranch(branch);

	if (existingRemoteOid && !isForce && !isForceWithLease) {
		const localLog = await git.log({ fs, dir, ref: branch, depth: 50 });
		const localOids = new Set(localLog.map((e) => e.oid));
		if (!localOids.has(existingRemoteOid)) {
			return {
				output: `To ${DEFAULT_REMOTE_URL}\n ! [rejected]        ${branch} -> ${branch} (non-fast-forward)\nerror: failed to push some refs\nhint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. Use --force or --force-with-lease to override.`,
				error: true
			};
		}
	}

	engine.remote.setBranch(branch, oid);
	await writeRemoteTrackingRef(engine, remote, branch, oid);
	if (setUpstream) engine.remote.upstream = branch;

	const forceLabel = isForceWithLease ? ' (force-with-lease)' : isForce ? ' (forced update)' : '';
	const isNew = !existingRemoteOid;
	return {
		output: `To ${DEFAULT_REMOTE_URL}
${isNew ? ` * [new branch]      ${branch} -> ${branch}` : ` + ${existingRemoteOid ? shortOid(existingRemoteOid) : '0000000'}...${shortOid(oid)}  ${branch} -> ${branch}${forceLabel}`}${setUpstream ? `\nBranch '${branch}' set up to track '${remote}/${branch}'.` : ''}`
	};
}

async function runPull(engine: GitEngine, args: string): Promise<CommandResult> {
	const parts = args.split(/\s+/);
	const remote = parts[0] ?? DEFAULT_REMOTE;
	const branch = parts[1] ?? 'main';
	const fetchResult = await runFetch(engine, remote);
	const mergeResult = await runMerge(engine, `${remote}/${branch}`);
	const output = [fetchResult.output, mergeResult.output].filter(Boolean).join('\n');
	return { output, error: mergeResult.error };
}

async function runRevert(engine: GitEngine, ref: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const oid = await resolveCommitOid(engine, ref);
	const { commit } = await git.readCommit({ fs, dir, oid });
	const parentOid = commit.parent[0];
	if (!parentOid) return { output: 'fatal: cannot revert a root commit', error: true };

	const parentFiles = await listFilesAtCommit(engine, parentOid);
	const commitFiles = await listFilesAtCommit(engine, oid);

	for (const file of commitFiles) {
		const parentContent = await readFileAtCommit(engine, parentOid, file);
		if (parentContent !== null) {
			await engine.writeFile(file, parentContent);
			await git.add({ fs, dir, filepath: file });
		}
	}

	for (const file of parentFiles) {
		if (!commitFiles.includes(file)) {
			await engine.writeFile(file, (await readFileAtCommit(engine, parentOid, file)) ?? '');
			await git.add({ fs, dir, filepath: file });
		}
	}

	const message = `Revert "${commit.message.split('\n')[0]}"`;
	const newOid = await git.commit({ fs, dir, message, author: AUTHOR });
	const branch = (await git.currentBranch({ fs, dir })) ?? 'HEAD';
	return { output: `[${branch} ${shortOid(newOid)}] ${message}` };
}

async function runCat(engine: GitEngine, filepath: string): Promise<CommandResult> {
	const content = await engine.readFile(filepath);
	if (content === null) return { output: `cat: ${filepath}: No such file or directory`, error: true };
	return { output: content };
}

async function formatDiff(engine: GitEngine, staged: boolean): Promise<string> {
	const { fs, dir } = engine;
	const matrix = await git.statusMatrix({ fs, dir });
	const lines: string[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		const headNum = head as number;
		const workdirNum = workdir as number;
		const stageNum = stage as number;

		if (staged) {
			if (stageNum !== 2) continue;
		} else {
			const isUnstaged = headNum === 1 && workdirNum === 2 && stageNum === 1;
			const isNew = headNum === 0 && workdirNum === 2 && stageNum === 0;
			if (!isUnstaged && !isNew) continue;
		}

		const currentContent = await engine.readFile(filepath);
		let previousContent: string | null = null;

		if (headNum === 1) {
			previousContent = await readFileAtCommit(engine, await git.resolveRef({ fs, dir, ref: 'HEAD' }), filepath);
		}

		if (currentContent === null) continue;

		lines.push(`diff --git a/${filepath} b/${filepath}`);
		if (previousContent === null) {
			lines.push(`new file mode 100644`);
			lines.push(`--- /dev/null`);
			lines.push(`+++ b/${filepath}`);
			const contentLines = currentContent.split('\n');
			for (const line of contentLines) {
				if (line) lines.push(`+${line}`);
			}
		} else {
			lines.push(`--- a/${filepath}`);
			lines.push(`+++ b/${filepath}`);
			const oldLines = previousContent.split('\n');
			const newLines = currentContent.split('\n');
			for (const line of oldLines) {
				if (line && !newLines.includes(line)) lines.push(`-${line}`);
			}
			for (const line of newLines) {
				if (line && !oldLines.includes(line)) lines.push(`+${line}`);
			}
			for (const line of newLines) {
				if (line && oldLines.includes(line)) lines.push(` ${line}`);
			}
		}
		lines.push('');
	}

	return lines.join('\n') || (staged ? 'No staged changes.' : '');
}

export async function runGitCommand(engine: GitEngine, rawInput: string): Promise<CommandResult> {
	const input = rawInput.trim();
	if (!input) return { output: '' };

	if (engine.patchSession) {
		return { output: await handlePatchAnswer(engine, input) };
	}

	if (input === 'clear') return { output: '__CLEAR__' };

	const catMatch = input.match(/^cat\s+(.+)$/);
	if (catMatch) {
		return runCat(engine, catMatch[1].trim());
	}

	const lsMatch = input.match(/^ls\s*(.*)$/);
	if (lsMatch) {
		const files = await engine.listWorkingFiles();
		return { output: files.join('\n') || '(empty directory)' };
	}

	const shellWrite = input.match(/^(?:echo|printf)\s+(.+?)\s*>\s*(.+)$/);
	if (shellWrite) {
		const raw = shellWrite[1].trim();
		const filepath = shellWrite[2].trim();
		const content = raw.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
		await engine.writeFile(filepath, content.endsWith('\n') ? content : `${content}\n`);
		return { output: '' };
	}

	if (input === 'help') return { output: PLAYGROUND_COMMANDS_HELP };

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
				if (rest.includes('-p') || rest.includes('--patch')) {
					const target = rest.filter((a) => !a.startsWith('-')).join(' ') || undefined;
					return { output: await startPatchSession(engine, target || undefined) };
				}
				const target = rest.join(' ').trim();
				if (!target) return { output: 'Nothing specified, nothing added.', error: true };
				if (target === '.' || target === '-A' || target === '--all') {
					await addAll(engine);
					return { output: '' };
				}
				for (const filepath of rest.filter((a) => !a.startsWith('-'))) {
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

				if (!message) return { output: 'error: switch `m` requires a value', error: true };

				const oid = await git.commit({ fs: engine.fs, dir: engine.dir, message, author: AUTHOR });
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

				if (rest.includes('-d') || rest.includes('-D') || rest.includes('--delete')) {
					const branchName = rest.filter((a) => !a.startsWith('-')).pop();
					if (!branchName) return { output: 'fatal: branch name required', error: true };
					if (branchName === current) {
						return { output: `error: Cannot delete branch '${branchName}' checked out at '${engine.dir}'`, error: true };
					}
					if (!branches.includes(branchName)) {
						return { output: `error: branch '${branchName}' not found.`, error: true };
					}
					await git.deleteBranch({ fs: engine.fs, dir: engine.dir, ref: branchName });
					return { output: `Deleted branch ${branchName}.` };
				}

				if (rest.length === 0 || rest.includes('-a')) {
					const remoteLines = [...engine.remote.branches.keys()].map((b) => `  remotes/origin/${b}`);
					return {
						output: [
							...branches.map((b) => `${b === current ? '* ' : '  '}${b}`),
							...remoteLines
						].join('\n') || 'No branches yet'
					};
				}
				await git.branch({ fs: engine.fs, dir: engine.dir, ref: rest[rest.length - 1] });
				return { output: '' };
			}

			case 'switch':
			case 'checkout': {
				const create = rest.includes('-c') || rest.includes('-b');
				const name = rest.filter((a) => !a.startsWith('-')).pop();
				if (!name) return { output: 'fatal: missing branch name', error: true };
				if (create) await git.branch({ fs: engine.fs, dir: engine.dir, ref: name });
				await git.checkout({ fs: engine.fs, dir: engine.dir, ref: name });
				return { output: create ? `Switched to a new branch '${name}'` : `Switched to branch '${name}'` };
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
				const oid = await engine.resolveHead(rev);
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

			case 'fetch':
				return runFetch(engine, rest[0] ?? DEFAULT_REMOTE);

			case 'pull':
				return runPull(engine, rest.join(' '));

			case 'push':
				return runPush(engine, rest.join(' '));

			case 'remote':
				if (rest.includes('-v')) {
					return { output: `origin\t${DEFAULT_REMOTE_URL} (fetch)\norigin\t${DEFAULT_REMOTE_URL} (push)` };
				}
				return { output: '' };

			case 'revert': {
				const ref = rest.filter((a) => !a.startsWith('-')).pop() ?? 'HEAD';
				return runRevert(engine, ref);
			}

			case 'diff': {
				const staged = rest.includes('--staged') || rest.includes('--cached');
				return { output: await formatDiff(engine, staged) };
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
