import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';
import { formatUnifiedDiff } from './diff';
import { handlePatchAnswer, startPatchSession } from './patch-mode';
import {
	DEFAULT_REMOTE,
	DEFAULT_REMOTE_URL,
	resolveRemoteBranch,
	writeRemoteTrackingRef
} from './remote-state';
import { PLAYGROUND_COMMANDS_HELP } from './scenarios';
import { listFilesAtCommit, readFileAtCommit, readIndexFile, resolveCommitOid } from './tree-utils';

export interface CommandResult {
	output: string;
	error?: boolean;
	colored?: boolean;
}

const AUTHOR = { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' };

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function colorizeStatus(raw: string): string {
	return raw
		.split('\n')
		.map((line) => {
			const e = esc(line);
			if (line.startsWith('On branch ')) return `<span style="font-weight:600">${e}</span>`;
			if (line.startsWith('Your branch'))
				return `<span style="color:var(--color-terminal-output);font-style:italic">${e}</span>`;
			if (
				line.startsWith('\t') &&
				(line.includes('modified:') || line.includes('both modified:'))
			) {
				if (
					raw.includes('Changes to be committed') &&
					!raw.split('Changes not staged')[0]?.includes(line)
				) {
					return `<span style="color:var(--color-diff-add)">\t${esc(line.trim())}</span>`;
				}
				return `<span style="color:var(--color-diff-del)">\t${esc(line.trim())}</span>`;
			}
			if (line.startsWith('\t'))
				return `<span style="color:var(--color-diff-del)">\t${esc(line.trim())}</span>`;
			if (line.startsWith('Changes to be committed'))
				return `<span style="color:var(--color-diff-add);font-weight:500">${e}</span>`;
			if (
				line.startsWith('Changes not staged') ||
				line.startsWith('Untracked files') ||
				line.startsWith('Unmerged paths')
			)
				return `<span style="color:var(--color-diff-del);font-weight:500">${e}</span>`;
			if (line.startsWith('nothing to commit'))
				return `<span style="color:var(--color-terminal-prompt)">${e}</span>`;
			return `<span style="color:var(--color-terminal-output)">${e}</span>`;
		})
		.join('\n');
}

function colorizeDiff(raw: string): string {
	return raw
		.split('\n')
		.map((line) => {
			const e = esc(line);
			if (line.startsWith('diff --git'))
				return `<span style="font-weight:600;color:var(--color-terminal-command)">${e}</span>`;
			if (line.startsWith('---'))
				return `<span style="font-weight:600;color:var(--color-diff-del)">${e}</span>`;
			if (line.startsWith('+++'))
				return `<span style="font-weight:600;color:var(--color-diff-add)">${e}</span>`;
			if (line.startsWith('new file'))
				return `<span style="color:var(--color-diff-add)">${e}</span>`;
			if (line.startsWith('+'))
				return `<span style="color:var(--color-diff-add);background:var(--color-diff-add-bg)">${e}</span>`;
			if (line.startsWith('-'))
				return `<span style="color:var(--color-diff-del);background:var(--color-diff-del-bg)">${e}</span>`;
			if (line.startsWith('@@')) return `<span style="color:var(--color-diff-hunk)">${e}</span>`;
			return `<span style="color:var(--color-terminal-output)">${e}</span>`;
		})
		.join('\n');
}

function colorizeLog(raw: string): string {
	return raw
		.split('\n')
		.map((line) => {
			const e = esc(line);
			if (/^[0-9a-f]{7}\s/.test(line)) {
				// One combined replace: wrapping the hash first would inject a
				// style attribute whose parentheses the ref-decoration regex
				// then matches instead of "(HEAD -> main)".
				return e.replace(
					/^([0-9a-f]{7})( \([^)]*\))?/,
					(_, hash: string, deco: string | undefined) =>
						`<span style="color:var(--color-diff-hash)">${hash}</span>` +
						(deco
							? `<span style="color:var(--color-diff-meta);font-weight:500">${deco}</span>`
							: '')
				);
			}
			if (line.startsWith('commit '))
				return `<span style="color:var(--color-diff-hash)">${e}</span>`;
			if (line.startsWith('Author:'))
				return `<span style="color:var(--color-diff-meta)">${e}</span>`;
			return `<span style="color:var(--color-terminal-output)">${e}</span>`;
		})
		.join('\n');
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
		const upstream = engine.remote.upstream;
		const localOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
		const remoteOid = engine.remote.getBranch(upstream);
		if (localOid && remoteOid) {
			if (localOid === remoteOid) {
				lines.push(`Your branch is up to date with 'origin/${upstream}'.`);
			} else {
				const localLog = await git.log({ fs, dir, ref: 'HEAD', depth: 100 }).catch(() => []);
				const remoteLog = await git.log({ fs, dir, ref: remoteOid, depth: 100 }).catch(() => []);
				const localSet = new Set(localLog.map((e) => e.oid));
				const remoteSet = new Set(remoteLog.map((e) => e.oid));
				const ahead = localLog.filter((e) => !remoteSet.has(e.oid)).length;
				const behind = remoteLog.filter((e) => !localSet.has(e.oid)).length;
				const plural = (n: number) => (n === 1 ? 'commit' : 'commits');
				if (ahead > 0 && behind > 0) {
					lines.push(
						`Your branch and 'origin/${upstream}' have diverged,`,
						`and have ${ahead} and ${behind} different ${plural(Math.max(ahead, behind))} each, respectively.`
					);
				} else if (ahead > 0) {
					lines.push(
						`Your branch is ahead of 'origin/${upstream}' by ${ahead} ${plural(ahead)}.`,
						'  (use "git push" to publish your local commits)'
					);
				} else if (behind > 0) {
					lines.push(
						`Your branch is behind 'origin/${upstream}' by ${behind} ${plural(behind)}, and can be fast-forwarded.`,
						'  (use "git pull" to update your local branch)'
					);
				} else {
					lines.push(`Your branch and 'origin/${upstream}' have diverged.`);
				}
			}
		}
	}
	if (merging) {
		lines.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '');
	}

	const unstaged: string[] = [];
	const staged: string[] = [];
	const untracked: string[] = [];
	const unmerged: string[] = [];

	// stage 3 means "index differs from both HEAD and workdir" — a conflict
	// during a merge/replay, but simply a partially-staged file otherwise.
	const conflicted = merging || engine.replayState !== null;
	for (const [filepath, head, workdir, stage] of matrix) {
		if (conflicted && (stage === 3 || (head === 1 && workdir === 2 && stage === 1))) {
			unmerged.push(filepath);
		} else if (head === 0 && workdir === 2 && stage === 0) {
			untracked.push(filepath);
		} else if (head === 1 && workdir === 2 && stage === 1) {
			unstaged.push(`modified:   ${filepath}`);
		} else if (head === 1 && workdir === 0 && stage === 1) {
			unstaged.push(`deleted:    ${filepath}`);
		} else if (head === 1 && stage === 0) {
			// Deletion staged (e.g. git rm / rm --cached); the file may still
			// exist on disk, in which case it shows as untracked too.
			staged.push(`deleted:    ${filepath}`);
			if (workdir === 2) untracked.push(filepath);
		} else if (stage === 2 || stage === 3) {
			staged.push(`${head === 0 ? 'new file:  ' : 'modified:  '} ${filepath}`);
			if (workdir === 2 && stage === 3) unstaged.push(`modified:   ${filepath}`);
		}
	}

	if (unmerged.length > 0) {
		lines.push('Unmerged paths:', '  (use "git add <file>..." to mark resolution)');
		for (const f of unmerged) lines.push(`\tboth modified:   ${f}`);
	}
	if (staged.length > 0) {
		lines.push('Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)');
		for (const f of staged) lines.push(`\t${f}`);
	}
	if (unstaged.length > 0) {
		lines.push(
			'Changes not staged for commit:',
			'  (use "git add <file>..." to update what will be committed)'
		);
		for (const f of unstaged) lines.push(`\t${f}`);
	}
	if (untracked.length > 0) {
		lines.push(
			'Untracked files:',
			'  (use "git add <file>..." to include in what will be committed)'
		);
		for (const f of untracked) lines.push(`\t${f}`);
	}
	if (
		staged.length === 0 &&
		unstaged.length === 0 &&
		untracked.length === 0 &&
		unmerged.length === 0
	) {
		lines.push('nothing to commit, working tree clean');
	}

	return lines.join('\n');
}

async function formatLog(
	engine: GitEngine,
	oneline: boolean,
	all: boolean,
	limit?: number
): Promise<string> {
	const { fs, dir } = engine;
	const branchSet = new Set<string>();
	if (all) {
		for (const b of await git.listBranches({ fs, dir })) branchSet.add(b);
		for (const ref of engine.remote.branches.keys()) branchSet.add(`origin/${ref}`);
	} else {
		branchSet.add((await git.currentBranch({ fs, dir })) ?? 'main');
	}

	const current = (await git.currentBranch({ fs, dir })) ?? 'main';

	// Tip decorations: only the commit a ref points AT gets "(HEAD -> main, tag: v1)"
	const decorations = new Map<string, string[]>();
	const decorate = (oid: string, label: string, front = false) => {
		const list = decorations.get(oid) ?? [];
		if (front) list.unshift(label);
		else list.push(label);
		decorations.set(oid, list);
	};
	for (const b of await git.listBranches({ fs, dir })) {
		const oid = await git.resolveRef({ fs, dir, ref: `refs/heads/${b}` }).catch(() => null);
		if (oid) decorate(oid, b === current ? `HEAD -> ${b}` : b, b === current);
	}
	for (const [b, oid] of engine.remote.branches) decorate(oid, `origin/${b}`);
	for (const t of await git.listTags({ fs, dir }).catch(() => [])) {
		const oid = await engine.resolveRevision(t).catch(() => null);
		if (oid) decorate(oid, `tag: ${t}`);
	}

	const seen = new Set<string>();
	const entries: { oid: string; message: string; author: string; timestamp: number }[] = [];

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
			entries.push({
				oid: entry.oid,
				message: entry.commit.message,
				author: entry.commit.author.name,
				timestamp: entry.commit.committer.timestamp
			});
		}
	}

	entries.sort((a, b) => b.timestamp - a.timestamp);
	const shown = limit !== undefined ? entries.slice(0, limit) : entries;

	const lines: string[] = [];
	for (const entry of shown) {
		const deco = decorations.get(entry.oid);
		const decoText = deco?.length ? ` (${deco.join(', ')})` : '';
		if (oneline) {
			lines.push(`${shortOid(entry.oid)}${decoText} ${entry.message.split('\n')[0]}`);
		} else {
			lines.push(
				`commit ${entry.oid}${decoText}`,
				`Author: ${entry.author}`,
				'',
				`    ${entry.message.trimEnd()}`,
				''
			);
		}
	}

	return lines.join('\n') || 'Your branch does not have any commits yet.';
}

async function addAll(engine: GitEngine): Promise<void> {
	for (const file of await engine.listWorkingFiles()) {
		await git.add({ fs: engine.fs, dir: engine.dir, filepath: file });
	}
}

/** Move the current branch tip and working tree to the given commit. */
async function moveBranchTo(engine: GitEngine, branch: string, oid: string): Promise<void> {
	const { fs, dir } = engine;
	await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: oid, force: true });
	await git.checkout({ fs, dir, ref: branch, force: true });
}

/** Extract the conflicted file list from an isomorphic-git error, if any. */
function conflictFiles(err: unknown): string[] {
	if (err && typeof err === 'object' && 'data' in err) {
		return (err as { data?: { filepaths?: string[] } }).data?.filepaths ?? [];
	}
	return [];
}

/**
 * Replay `remaining` commits onto the current branch tip, pausing in
 * engine.replayState when a commit conflicts. Shared by rebase,
 * cherry-pick, and their --continue paths.
 */
async function replayCommits(
	engine: GitEngine,
	kind: 'rebase' | 'cherry-pick',
	branch: string,
	originalOid: string,
	queue: { oid: string; message: string }[],
	successMessage: string
): Promise<CommandResult> {
	const { fs, dir } = engine;

	for (let i = 0; i < queue.length; i++) {
		const entry = queue[i];
		try {
			// abortOnConflict: false leaves real conflict markers in the
			// working tree and index — the learner needs something to read.
			await git.cherryPick({ fs, dir, oid: entry.oid, committer: AUTHOR, abortOnConflict: false });
			const newTip = await git.resolveRef({ fs, dir, ref: 'HEAD' });
			engine.recordReflog(newTip, `${kind}: ${entry.message.split('\n')[0]}`);
		} catch (err) {
			const files = conflictFiles(err);
			if (files.length === 0) {
				// Not a content conflict — abort back to the starting point
				await moveBranchTo(engine, branch, originalOid);
				const message = err instanceof Error ? err.message : String(err);
				return {
					output: `error: could not apply ${shortOid(entry.oid)} (${entry.message.split('\n')[0]})\n${message}`,
					error: true
				};
			}
			// Leave the conflict markers in place and pause
			engine.replayState = {
				kind,
				branch,
				originalOid,
				current: entry,
				remaining: queue.slice(i + 1)
			};
			const fileLines = files.map((f) => `CONFLICT (content): Merge conflict in ${f}`);
			return {
				output: `${fileLines.join('\n')}\nerror: could not apply ${shortOid(entry.oid)}... ${entry.message.split('\n')[0]}\nhint: Resolve all conflicts manually, mark them as resolved with "git add <file>",\nhint: then run "git ${kind} --continue".\nhint: To give up and go back to the state before "git ${kind}", run "git ${kind} --abort".`,
				error: true
			};
		}
	}

	return { output: successMessage };
}

async function runReplayAbort(engine: GitEngine, kind: 'rebase' | 'cherry-pick') {
	const state = engine.replayState;
	if (!state || state.kind !== kind) {
		return { output: `fatal: no ${kind} in progress`, error: true };
	}
	await moveBranchTo(engine, state.branch, state.originalOid);
	engine.replayState = null;
	engine.recordReflog(state.originalOid, `${kind}: aborted`);
	return {
		output: `${kind === 'rebase' ? 'Rebase' : 'Cherry-pick'} aborted; back to ${shortOid(state.originalOid)}.`
	};
}

async function runReplayContinue(engine: GitEngine, kind: 'rebase' | 'cherry-pick') {
	const { fs, dir } = engine;
	const state = engine.replayState;
	if (!state || state.kind !== kind) {
		return { output: `fatal: no ${kind} in progress`, error: true };
	}

	// All conflicts must be staged before continuing
	const matrix = await git.statusMatrix({ fs, dir });
	const unresolved = matrix.filter(([, head, workdir, stage]) => {
		void head;
		return stage === 3 || (workdir === 2 && stage === 1);
	});
	if (unresolved.length > 0) {
		return {
			output: `error: unresolved changes remain — stage your fixes first\nhint: fix the files, then "git add <file>" each one and re-run --continue`,
			error: true
		};
	}

	const oid = await git.commit({ fs, dir, message: state.current.message, author: AUTHOR });
	engine.recordReflog(oid, `${kind}: ${state.current.message.split('\n')[0]}`);

	const { branch, originalOid, remaining } = state;
	engine.replayState = null;
	const successMessage =
		kind === 'rebase'
			? `Successfully rebased and updated refs/heads/${branch}.`
			: `[${branch} ${shortOid(oid)}] ${state.current.message.split('\n')[0]}`;
	if (remaining.length === 0) return { output: successMessage };
	return replayCommits(engine, kind, branch, originalOid, remaining, successMessage);
}

async function runRebase(engine: GitEngine, ontoBranch: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = await git.currentBranch({ fs, dir });
	if (!current) return { output: 'fatal: not on a branch', error: true };

	const currentOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${current}` });
	const ontoOid = ontoBranch.startsWith('origin/')
		? (engine.remote.getBranch(ontoBranch.slice('origin/'.length)) ??
			(await resolveRemoteBranch(engine, DEFAULT_REMOTE, ontoBranch.slice('origin/'.length))))
		: await git.resolveRef({ fs, dir, ref: `refs/heads/${ontoBranch}` }).catch(() => null);

	if (!ontoOid) return { output: `fatal: invalid upstream '${ontoBranch}'`, error: true };

	const mergeBases = await git.findMergeBase({ fs, dir, oids: [currentOid, ontoOid] });
	const base = Array.isArray(mergeBases) ? mergeBases[0] : mergeBases;
	if (!base) return { output: 'fatal: merge base not found', error: true };
	if (base === ontoOid) return { output: 'Current branch is up to date.' };

	const log = await git.log({ fs, dir, ref: current, depth: 100 });
	const toReplay: { oid: string; message: string }[] = [];
	for (const entry of log) {
		if (entry.oid === base) break;
		toReplay.unshift({ oid: entry.oid, message: entry.commit.message });
	}

	await moveBranchTo(engine, current, ontoOid);
	engine.recordReflog(ontoOid, `rebase: checkout ${ontoBranch}`);

	return replayCommits(
		engine,
		'rebase',
		current,
		currentOid,
		toReplay,
		`Successfully rebased and updated refs/heads/${current}.`
	);
}

async function runCherryPick(engine: GitEngine, rev: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const current = await git.currentBranch({ fs, dir });
	if (!current) return { output: 'fatal: not on a branch', error: true };

	const originalOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	let oid: string;
	try {
		oid = await engine.resolveRevision(rev);
	} catch (err) {
		return { output: `fatal: ${err instanceof Error ? err.message : String(err)}`, error: true };
	}
	const { commit } = await git.readCommit({ fs, dir, oid });
	const summary = commit.message.split('\n')[0];

	const result = await replayCommits(
		engine,
		'cherry-pick',
		current,
		originalOid,
		[{ oid, message: commit.message }],
		''
	);
	if (result.error) return result;
	const newTip = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	return { output: `[${current} ${shortOid(newTip)}] ${summary}` };
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

	engine.mergeOrigHead = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
	try {
		const result = await git.merge({
			fs,
			dir,
			ours: current,
			theirs,
			author: AUTHOR,
			abortOnConflict: false
		});
		if (result.oid) {
			engine.recordReflog(
				result.oid,
				`merge ${branch}: ${result.fastForward ? 'fast-forward' : 'merge'}`
			);
		}
		if (result.alreadyMerged) return { output: 'Already up to date.' };
		if (result.fastForward) return { output: 'Fast-forward merge.' };
		return { output: `Merge made by the 'ort' strategy.` };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (/conflict/i.test(message)) {
			// isomorphic-git's MergeConflictError carries the conflicted paths
			const filepaths =
				err && typeof err === 'object' && 'data' in err
					? ((err as { data?: { filepaths?: string[] } }).data?.filepaths ?? [])
					: [];
			const perFile = filepaths.map(
				(f) => `Auto-merging ${f}\nCONFLICT (content): Merge conflict in ${f}`
			);
			return {
				output: `${perFile.join('\n') || 'CONFLICT (content): Merge conflict'}\nAutomatic merge failed; fix conflicts and then commit the result.`,
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
			typeof entry === 'string'
				? `stash@{${i}}: ${entry}`
				: `stash@{${i}}: ${entry.message ?? 'WIP'}`
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
	if (joined === 'drop' || joined.startsWith('drop ')) {
		await git.stash({ fs, dir, op: 'drop' });
		return { output: 'Dropped refs/stash@{0}' };
	}
	if (joined === 'clear') {
		await git.stash({ fs, dir, op: 'clear' });
		return { output: '' };
	}
	return {
		output: 'Unknown stash subcommand. Try: push, pop, apply, list, drop, clear',
		error: true
	};
}

async function runFetch(engine: GitEngine, remote = DEFAULT_REMOTE): Promise<CommandResult> {
	const lines: string[] = [`From ${DEFAULT_REMOTE_URL}`];
	for (const [branch, oid] of engine.remote.branches) {
		const oldOid = await resolveRemoteBranch(engine, remote, branch);
		await writeRemoteTrackingRef(engine, remote, branch, oid);
		engine.remote.recordFetched(branch, oid);
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
	const argList = args.split(/\s+/).filter(Boolean);
	const setUpstream = argList.includes('-u') || argList.includes('--set-upstream');
	// Exact matches only: '--force-with-lease' must NOT count as '--force'
	const isForce = argList.includes('--force') || argList.includes('-f');
	const isForceWithLease = argList.some(
		(a) => a === '--force-with-lease' || a.startsWith('--force-with-lease=')
	);
	const parts = argList.filter((p) => !p.startsWith('-'));
	const remote = parts[0] ?? DEFAULT_REMOTE;
	const branch = parts[1] ?? (await git.currentBranch({ fs, dir }));

	if (!branch) return { output: 'fatal: no branch checked out', error: true };

	const oid = await git.resolveRef({ fs, dir, ref: `refs/heads/${branch}` });
	const existingRemoteOid = engine.remote.getBranch(branch);

	if (existingRemoteOid && !isForce && !isForceWithLease) {
		const localLog = await git.log({ fs, dir, ref: branch, depth: 50 });
		const localOids = new Set(localLog.map((e) => e.oid));
		if (!localOids.has(existingRemoteOid)) {
			return {
				output: `To ${DEFAULT_REMOTE_URL}\n ! [rejected]        ${branch} -> ${branch} (non-fast-forward)\nerror: failed to push some refs\nhint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. Use --force-with-lease after reviewing the remote changes.`,
				error: true
			};
		}
	}

	if (existingRemoteOid && isForceWithLease && !isForce) {
		// The lease: only force if the remote still points where we last saw
		// it (via fetch or our own push). If someone else pushed since, refuse.
		const lastSeen = engine.remote.getFetched(branch);
		if (lastSeen !== existingRemoteOid) {
			return {
				output: `To ${DEFAULT_REMOTE_URL}\n ! [rejected]        ${branch} -> ${branch} (stale info)\nerror: failed to push some refs\nhint: The remote branch moved since you last fetched — someone else pushed.\nhint: Run git fetch, review their commits, then decide whether to force.`,
				error: true
			};
		}
	}

	engine.remote.setBranch(branch, oid);
	await writeRemoteTrackingRef(engine, remote, branch, oid);
	engine.remote.recordFetched(branch, oid);
	if (setUpstream) engine.remote.upstream = branch;

	const forceLabel = isForceWithLease ? ' (force-with-lease)' : isForce ? ' (forced update)' : '';
	const isNew = !existingRemoteOid;
	return {
		output: `To ${DEFAULT_REMOTE_URL}
${isNew ? ` * [new branch]      ${branch} -> ${branch}` : ` + ${existingRemoteOid ? shortOid(existingRemoteOid) : '0000000'}...${shortOid(oid)}  ${branch} -> ${branch}${forceLabel}`}${setUpstream ? `\nBranch '${branch}' set up to track '${remote}/${branch}'.` : ''}`
	};
}

async function runPull(engine: GitEngine, args: string): Promise<CommandResult> {
	const useRebase = args.includes('--rebase');
	const parts = args.split(/\s+/).filter((p) => p && !p.startsWith('-'));
	const remote = parts[0] ?? DEFAULT_REMOTE;
	const branch =
		parts[1] ?? (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
	const fetchResult = await runFetch(engine, remote);
	const integrate = useRebase
		? await runRebase(engine, `${remote}/${branch}`)
		: await runMerge(engine, `${remote}/${branch}`);
	const output = [fetchResult.output, integrate.output].filter(Boolean).join('\n');
	return { output, error: integrate.error };
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
		} else {
			// The reverted commit introduced this file, so reverting removes it
			try {
				await fs.promises.unlink(`${dir}/${file}`);
			} catch {
				// already absent from the working tree
			}
			await git.remove({ fs, dir, filepath: file });
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
	engine.recordReflog(newOid, `revert: ${commit.message.split('\n')[0]}`);
	const branch = (await git.currentBranch({ fs, dir })) ?? 'HEAD';
	return { output: `[${branch} ${shortOid(newOid)}] ${message}` };
}

/** Expand a pathspec against the working tree: literal paths, * and ? globs, dir/ prefixes. */
async function expandPathspec(engine: GitEngine, pathspec: string): Promise<string[]> {
	const files = await engine.listWorkingFiles();
	if (files.includes(pathspec)) return [pathspec];
	// Directory prefix
	const dirMatches = files.filter((f) => f.startsWith(`${pathspec.replace(/\/$/, '')}/`));
	if (dirMatches.length > 0) return dirMatches;
	if (!/[*?]/.test(pathspec)) return [];
	const regex = new RegExp(
		`^${pathspec
			.split('*')
			.map((part) =>
				part
					.split('?')
					.map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
					.join('.')
			)
			.join('[^/]*')}$`
	);
	return files.filter((f) => regex.test(f));
}

async function runShow(engine: GitEngine, rev: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	let oid: string;
	try {
		oid = await engine.resolveRevision(rev);
	} catch (err) {
		return { output: `fatal: ${err instanceof Error ? err.message : String(err)}`, error: true };
	}
	const { commit } = await git.readCommit({ fs, dir, oid });
	const lines = [
		`commit ${oid}`,
		`Author: ${commit.author.name} <${commit.author.email}>`,
		'',
		...commit.message
			.trimEnd()
			.split('\n')
			.map((l) => `    ${l}`),
		''
	];

	const parentOid = commit.parent[0];
	const filesNow = await listFilesAtCommit(engine, oid);
	const filesBefore = parentOid ? await listFilesAtCommit(engine, parentOid) : [];
	const allFiles = [...new Set([...filesBefore, ...filesNow])].sort();
	for (const filepath of allFiles) {
		const before = parentOid ? await readFileAtCommit(engine, parentOid, filepath) : null;
		const after = await readFileAtCommit(engine, oid, filepath);
		if (before === after) continue;
		lines.push(...fileDiffBlock(filepath, before, after));
	}

	return { output: colorizeDiff(lines.join('\n')), colored: true };
}

async function runTag(engine: GitEngine, restJoined: string): Promise<CommandResult> {
	const { fs, dir } = engine;
	const rest = restJoined.split(/\s+/).filter(Boolean);

	if (rest.includes('-d') || rest.includes('--delete')) {
		const name = rest.filter((a) => !a.startsWith('-')).pop();
		if (!name) return { output: 'fatal: tag name required', error: true };
		const tags = await git.listTags({ fs, dir });
		if (!tags.includes(name)) return { output: `error: tag '${name}' not found.`, error: true };
		const oid = await git.resolveRef({ fs, dir, ref: `refs/tags/${name}` });
		await git.deleteTag({ fs, dir, ref: name });
		return { output: `Deleted tag '${name}' (was ${shortOid(oid)})` };
	}

	// Strip the -m "message" span before reading positional args
	const withoutMessage = restJoined.replace(/-m\s+("[^"]*"|'[^']*'|\S+)/, ' ');
	const positional = withoutMessage.split(/\s+/).filter((a) => a && !a.startsWith('-'));
	if (positional.length === 0) {
		const tags = await git.listTags({ fs, dir });
		return { output: tags.join('\n') || '' };
	}

	const name = positional[0];
	const rev = positional[1] ?? 'HEAD';
	let oid: string;
	try {
		oid = await engine.resolveRevision(rev);
	} catch (err) {
		return { output: `fatal: ${err instanceof Error ? err.message : String(err)}`, error: true };
	}

	const annotatedMessage = rest.includes('-a') ? parseQuotedMessage(restJoined) : null;
	if (annotatedMessage) {
		await git.annotatedTag({
			fs,
			dir,
			ref: name,
			object: oid,
			message: annotatedMessage,
			tagger: AUTHOR
		});
	} else {
		await git.tag({ fs, dir, ref: name, object: oid });
	}
	return { output: '' };
}

async function runMergeAbort(engine: GitEngine): Promise<CommandResult> {
	const { fs, dir } = engine;
	const merging = await isMergeInProgress(engine);
	if (!merging && !engine.mergeOrigHead) {
		return { output: 'fatal: There is no merge to abort (MERGE_HEAD missing).', error: true };
	}
	const target = engine.mergeOrigHead ?? (await git.resolveRef({ fs, dir, ref: 'HEAD' }));
	const branch = await git.currentBranch({ fs, dir });
	if (branch) {
		await moveBranchTo(engine, branch, target);
	}
	try {
		await engine.fs.promises.unlink(`${dir}/.git/MERGE_HEAD`);
	} catch {
		// merge may have already been resolved or the ref cleaned up
	}
	engine.mergeOrigHead = null;
	engine.recordReflog(target, 'merge: aborted');
	return { output: 'Merge aborted; working tree restored.' };
}

async function runCat(engine: GitEngine, filepath: string): Promise<CommandResult> {
	const content = await engine.readFile(filepath);
	if (content === null)
		return { output: `cat: ${filepath}: No such file or directory`, error: true };
	return { output: content };
}

async function readHeadFile(engine: GitEngine, filepath: string): Promise<string | null> {
	const { fs, dir } = engine;
	const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
	if (!headOid) return null;
	return readFileAtCommit(engine, headOid, filepath);
}

function fileDiffBlock(filepath: string, oldContent: string | null, newContent: string | null) {
	const lines: string[] = [`diff --git a/${filepath} b/${filepath}`];
	if (oldContent === null) {
		lines.push('new file mode 100644', '--- /dev/null', `+++ b/${filepath}`);
	} else if (newContent === null) {
		lines.push('deleted file mode 100644', `--- a/${filepath}`, '+++ /dev/null');
	} else {
		lines.push(`--- a/${filepath}`, `+++ b/${filepath}`);
	}
	const body = formatUnifiedDiff(oldContent ?? '', newContent ?? '');
	if (body) lines.push(body);
	lines.push('');
	return lines;
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
			// HEAD vs index: anything whose index entry differs from HEAD
			const indexDiffers = stageNum === 2 || stageNum === 3 || (headNum === 1 && stageNum === 0);
			if (!indexDiffers) continue;
			const oldContent = headNum === 1 ? await readHeadFile(engine, filepath) : null;
			const newContent = stageNum === 0 ? null : await readIndexFile(engine, filepath);
			if (oldContent === newContent) continue;
			lines.push(...fileDiffBlock(filepath, oldContent, newContent));
		} else {
			// Index vs working tree: anything whose workdir differs from the index
			const workdirDiffers =
				(workdirNum === 2 && stageNum !== 2) ||
				(workdirNum === 0 && stageNum !== 0) ||
				stageNum === 3;
			if (!workdirDiffers) continue;
			const baseContent =
				stageNum === 0
					? null
					: stageNum === 1
						? await readHeadFile(engine, filepath)
						: await readIndexFile(engine, filepath);
			const newContent = workdirNum === 0 ? null : await engine.readFile(filepath);
			if (baseContent === newContent) continue;
			lines.push(...fileDiffBlock(filepath, baseContent, newContent));
		}
	}

	return lines.join('\n') || (staged ? 'No staged changes.' : '');
}

export async function runGitCommand(engine: GitEngine, rawInput: string): Promise<CommandResult> {
	const input = rawInput.trim();
	if (!input) return { output: '' };

	if (engine.patchSession) {
		return { output: colorizeDiff(await handlePatchAnswer(engine, input)), colored: true };
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
	let hasColored = false;
	for (const segment of segments) {
		const result = await runSingleCommand(engine, segment);
		if (result.output === '__CLEAR__') return result;
		if (result.output) outputs.push(result.output);
		if (result.colored) hasColored = true;
		if (result.error) return { output: outputs.join('\n'), error: true };
	}
	return { output: outputs.join('\n'), colored: hasColored };
}

async function runSingleCommand(engine: GitEngine, input: string): Promise<CommandResult> {
	if (!input.startsWith('git ')) {
		return { output: `gitvibes: command not found: ${input.split(' ')[0]}`, error: true };
	}

	const args = input.slice(4).trim();
	const [sub, ...rest] = args.split(/\s+/);

	try {
		switch (sub) {
			case 'status': {
				const raw = await formatStatus(engine);
				return { output: colorizeStatus(raw), colored: true };
			}

			case 'add': {
				if (rest.includes('-p') || rest.includes('--patch')) {
					const target = rest.filter((a) => !a.startsWith('-')).join(' ') || undefined;
					return {
						output: colorizeDiff(await startPatchSession(engine, target || undefined)),
						colored: true
					};
				}
				const target = rest.join(' ').trim();
				if (!target) return { output: 'Nothing specified, nothing added.', error: true };
				if (target === '.' || target === '-A' || target === '--all') {
					await addAll(engine);
					return { output: '' };
				}
				for (const pathspec of rest.filter((a) => !a.startsWith('-'))) {
					const matches = await expandPathspec(engine, pathspec);
					if (matches.length === 0) {
						return {
							output: `fatal: pathspec '${pathspec}' did not match any files`,
							error: true
						};
					}
					for (const filepath of matches) {
						await git.add({ fs: engine.fs, dir: engine.dir, filepath });
					}
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
					// Without -m, isomorphic-git reuses the previous message —
					// echo what actually got committed.
					const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
					const summary = commit.message.split('\n')[0];
					engine.recordReflog(oid, `commit (amend): ${summary}`);
					const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
					return { output: `[${branch} ${shortOid(oid)}] ${summary}` };
				}

				if (merging && !message) {
					const oid = await git.commit({
						fs: engine.fs,
						dir: engine.dir,
						message: 'Merge commit',
						author: AUTHOR
					});
					engine.recordReflog(oid, 'commit (merge): Merge commit');
					const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
					return { output: `[${branch} ${shortOid(oid)}] Merge commit` };
				}

				if (!message) {
					return {
						output:
							'error: no commit message given\nhint: the playground has no editor — pass one with git commit -m "your message"',
						error: true
					};
				}

				const oid = await git.commit({ fs: engine.fs, dir: engine.dir, message, author: AUTHOR });
				engine.recordReflog(oid, `commit: ${message.split('\n')[0]}`);
				const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
				return { output: `[${branch} ${shortOid(oid)}] ${message}` };
			}

			case 'log': {
				const oneline = rest.includes('--oneline');
				const all = rest.includes('--all');
				const nFlagIdx = rest.indexOf('-n');
				const dashN = rest.find((a) => /^-\d+$/.test(a));
				const limit =
					nFlagIdx >= 0 && rest[nFlagIdx + 1]
						? Number(rest[nFlagIdx + 1])
						: dashN
							? Number(dashN.slice(1))
							: undefined;
				const raw = await formatLog(engine, oneline, all, limit);
				return { output: colorizeLog(raw), colored: true };
			}

			case 'branch': {
				const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
				const current = await git.currentBranch({ fs: engine.fs, dir: engine.dir });

				if (rest.includes('-d') || rest.includes('-D') || rest.includes('--delete')) {
					const branchName = rest.filter((a) => !a.startsWith('-')).pop();
					if (!branchName) return { output: 'fatal: branch name required', error: true };
					if (branchName === current) {
						return {
							output: `error: Cannot delete branch '${branchName}' checked out at '${engine.dir}'`,
							error: true
						};
					}
					if (!branches.includes(branchName)) {
						return { output: `error: branch '${branchName}' not found.`, error: true };
					}
					await git.deleteBranch({ fs: engine.fs, dir: engine.dir, ref: branchName });
					return { output: `Deleted branch ${branchName}.` };
				}

				if (rest.includes('-m') || rest.includes('--move')) {
					const names = rest.filter((a) => !a.startsWith('-'));
					const oldName = names.length === 2 ? names[0] : current;
					const newName = names[names.length - 1];
					if (!oldName || !newName) {
						return { output: 'fatal: branch rename requires a new name', error: true };
					}
					await git.renameBranch({
						fs: engine.fs,
						dir: engine.dir,
						oldref: oldName,
						ref: newName,
						checkout: oldName === current
					});
					return { output: '' };
				}

				if (rest.length === 0 || rest.includes('-a') || rest.includes('-v')) {
					const verbose = rest.includes('-v');
					const localLines = await Promise.all(
						branches.map(async (b) => {
							const marker = b === current ? '* ' : '  ';
							if (!verbose) return `${marker}${b}`;
							const oid = await git.resolveRef({
								fs: engine.fs,
								dir: engine.dir,
								ref: `refs/heads/${b}`
							});
							const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
							return `${marker}${b} ${shortOid(oid)} ${commit.message.split('\n')[0]}`;
						})
					);
					const remoteLines = rest.includes('-a')
						? [...engine.remote.branches.keys()].map((b) => `  remotes/origin/${b}`)
						: [];
					return { output: [...localLines, ...remoteLines].join('\n') || 'No branches yet' };
				}
				await git.branch({ fs: engine.fs, dir: engine.dir, ref: rest[rest.length - 1] });
				return { output: '' };
			}

			case 'switch':
			case 'checkout': {
				// git checkout <rev> -- <file>: restore a file without moving HEAD
				const dashDash = rest.indexOf('--');
				if (sub === 'checkout' && dashDash > 0) {
					const rev = rest[dashDash - 1];
					const files = rest.slice(dashDash + 1);
					if (files.length === 0) {
						return { output: 'fatal: you must specify path(s) after --', error: true };
					}
					const oid = await engine.resolveRevision(rev);
					for (const filepath of files) {
						const content = await readFileAtCommit(engine, oid, filepath);
						if (content === null) {
							return {
								output: `error: pathspec '${filepath}' did not match any file(s) known to git at ${rev}`,
								error: true
							};
						}
						await engine.writeFile(filepath, content);
						await git.add({ fs: engine.fs, dir: engine.dir, filepath });
					}
					return { output: `Updated ${files.length} path(s) from ${rev}` };
				}

				const create = rest.includes('-c') || rest.includes('-b');
				const name = rest.filter((a) => !a.startsWith('-')).pop();
				if (!name) return { output: 'fatal: missing branch name', error: true };
				if (create) await git.branch({ fs: engine.fs, dir: engine.dir, ref: name });
				const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
				if (!create && !branches.includes(name)) {
					// Checking out a commit directly: detached HEAD
					let oid: string;
					try {
						oid = await engine.resolveRevision(name);
					} catch {
						return {
							output: `error: pathspec '${name}' did not match any file(s) known to git`,
							error: true
						};
					}
					await git.checkout({ fs: engine.fs, dir: engine.dir, ref: oid });
					engine.recordReflog(oid, `checkout: moving to ${name}`);
					return {
						output: `Note: switching to '${name}'.\n\nYou are in 'detached HEAD' state. You can look around and experiment,\nbut any commits you make here belong to no branch. To keep work made\nhere, create a branch: git switch -c <new-branch-name>`
					};
				}
				await git.checkout({ fs: engine.fs, dir: engine.dir, ref: name });
				const tip = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
				engine.recordReflog(tip, `checkout: moving to ${name}`);
				return {
					output: create ? `Switched to a new branch '${name}'` : `Switched to branch '${name}'`
				};
			}

			case 'restore': {
				const staged = rest.includes('--staged');
				const sourceIdx = rest.findIndex((a) => a === '--source');
				const source =
					sourceIdx >= 0
						? rest[sourceIdx + 1]
						: (rest.find((a) => a.startsWith('--source='))?.split('=')[1] ?? null);
				const filepath = rest
					.filter((a, i) => !a.startsWith('-') && (sourceIdx < 0 || i !== sourceIdx + 1))
					.join(' ');
				if (!filepath) return { output: 'fatal: you must specify path(s) to restore', error: true };
				if (source) {
					const oid = await engine.resolveRevision(source);
					const content = await readFileAtCommit(engine, oid, filepath);
					if (content === null) {
						return {
							output: `error: pathspec '${filepath}' did not match any file(s) at ${source}`,
							error: true
						};
					}
					await engine.writeFile(filepath, content);
					return { output: '' };
				}
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
				// Move the current branch ref, not HEAD itself — writing an oid
				// into HEAD would silently detach it and later commits would no
				// longer advance the branch.
				const branch = await git.currentBranch({ fs: engine.fs, dir: engine.dir });
				await git.writeRef({
					fs: engine.fs,
					dir: engine.dir,
					ref: branch ? `refs/heads/${branch}` : 'HEAD',
					value: oid,
					force: true
				});
				if (hard) {
					await git.checkout({
						fs: engine.fs,
						dir: engine.dir,
						ref: branch ?? oid,
						force: true
					});
				} else if (mixed) {
					const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
					for (const [filepath, , , stage] of matrix) {
						if (stage === 2 || stage === 3) {
							await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath });
						}
					}
				}
				engine.recordReflog(
					oid,
					`reset: moving to ${rev}${hard ? ' (--hard)' : soft ? ' (--soft)' : ''}`
				);
				return { output: '' };
			}

			case 'merge': {
				if (rest.includes('--abort')) return runMergeAbort(engine);
				return runMerge(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? '');
			}

			case 'rebase': {
				if (rest.includes('--abort')) return runReplayAbort(engine, 'rebase');
				if (rest.includes('--continue')) return runReplayContinue(engine, 'rebase');
				return runRebase(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? 'main');
			}

			case 'cherry-pick': {
				if (rest.includes('--abort')) return runReplayAbort(engine, 'cherry-pick');
				if (rest.includes('--continue')) return runReplayContinue(engine, 'cherry-pick');
				const rev = rest.filter((a) => !a.startsWith('-')).pop();
				if (!rev) return { output: 'fatal: you must name a commit to cherry-pick', error: true };
				return runCherryPick(engine, rev);
			}

			case 'stash':
				return runStash(engine, rest.join(' '));

			case 'fetch':
				return runFetch(engine, rest[0] ?? DEFAULT_REMOTE);

			case 'pull':
				return runPull(engine, rest.join(' '));

			case 'push':
				return runPush(engine, rest.join(' '));

			case 'remote':
				if (rest.includes('-v') || rest.length === 0) {
					return {
						output: `origin\t${DEFAULT_REMOTE_URL} (fetch)\norigin\t${DEFAULT_REMOTE_URL} (push)`
					};
				}
				return {
					output: `error: the playground has a single fixed remote ('origin') — git remote ${rest[0]} is not supported`,
					error: true
				};

			case 'revert': {
				const ref = rest.filter((a) => !a.startsWith('-')).pop() ?? 'HEAD';
				return runRevert(engine, ref);
			}

			case 'diff': {
				const staged = rest.includes('--staged') || rest.includes('--cached');
				const raw = await formatDiff(engine, staged);
				return { output: colorizeDiff(raw), colored: true };
			}

			case 'show': {
				const rev = rest.filter((a) => !a.startsWith('-')).pop() ?? 'HEAD';
				return runShow(engine, rev);
			}

			case 'reflog': {
				if (engine.reflog.length === 0) return { output: 'No reflog entries yet.' };
				const lines = engine.reflog.map(
					(entry, i) => `${shortOid(entry.oid)} HEAD@{${i}}: ${entry.message}`
				);
				return { output: colorizeLog(lines.join('\n')), colored: true };
			}

			case 'tag':
				return runTag(engine, rest.join(' '));

			case 'rm': {
				const cached = rest.includes('--cached');
				const files = rest.filter((a) => !a.startsWith('-'));
				if (files.length === 0) return { output: 'fatal: no pathspec given', error: true };
				for (const filepath of files) {
					const exists = (await engine.readFile(filepath)) !== null;
					if (!exists) {
						return {
							output: `fatal: pathspec '${filepath}' did not match any files`,
							error: true
						};
					}
					await git.remove({ fs: engine.fs, dir: engine.dir, filepath });
					if (!cached) {
						await engine.fs.promises.unlink(`${engine.dir}/${filepath}`);
					}
				}
				return { output: files.map((f) => `rm '${f}'`).join('\n') };
			}

			case 'clean': {
				if (!rest.includes('-f') && !rest.includes('-fd') && !rest.includes('-df')) {
					return {
						output: 'fatal: clean.requireForce is true and neither -f given; refusing to clean',
						error: true
					};
				}
				const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
				const removed: string[] = [];
				for (const [filepath, head, workdir, stage] of matrix) {
					if (head === 0 && workdir === 2 && stage === 0) {
						await engine.fs.promises.unlink(`${engine.dir}/${filepath}`);
						removed.push(`Removing ${filepath}`);
					}
				}
				return { output: removed.join('\n') || 'Nothing to clean' };
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
