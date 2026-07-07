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
	// Accepts -m and clustered short flags ending in m (git commit -am "msg")
	const match = input.match(/(?:^|\s)-[a-zA-Z]*m\s+("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s-][^\s]*)/);
	if (!match) return null;
	const raw = match[1];
	if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
		return raw.slice(1, -1);
	}
	return raw;
}

/**
 * Split args on whitespace, stripping quotes from tokens that are fully
 * wrapped in them — so `git switch -c "fix/bug"` doesn't create a branch
 * with literal quote characters in its name.
 */
function tokenize(args: string): string[] {
	return args
		.split(/\s+/)
		.filter(Boolean)
		.map((t) =>
			t.length >= 2 &&
			((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
				? t.slice(1, -1)
				: t
		);
}

/** Stage every tracked modification and deletion (git add -u / commit -a). */
async function stageTracked(engine: GitEngine): Promise<void> {
	const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
	for (const [filepath, head, workdir] of matrix) {
		if (head === 1 && workdir === 2) {
			await git.add({ fs: engine.fs, dir: engine.dir, filepath });
		} else if (head === 1 && workdir === 0) {
			await git.remove({ fs: engine.fs, dir: engine.dir, filepath });
		}
	}
}

function shortOid(oid: string): string {
	return oid.slice(0, 7);
}

/**
 * isomorphic-git has no MERGE_HEAD; the engine carries conflicted-merge
 * state itself. A merge is "in progress" exactly while that state is set.
 */
function isMergeInProgress(engine: GitEngine): boolean {
	return engine.mergeState !== null;
}

async function formatStatus(engine: GitEngine): Promise<string> {
	const { fs, dir } = engine;
	const branch = await git.currentBranch({ fs, dir });
	const matrix = await git.statusMatrix({ fs, dir });
	const merging = isMergeInProgress(engine);

	const lines: string[] = [];
	if (branch) {
		lines.push(`On branch ${branch}`);
	} else {
		const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
		lines.push(`HEAD detached at ${headOid ? shortOid(headOid) : '(unknown)'}`);
	}
	const upstream = branch ? engine.remote.getUpstream(branch) : undefined;
	if (branch && upstream) {
		const localOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
		// Status reports against the remote-tracking ref (what the last
		// fetch/push saw), not the true remote — just like real git.
		const remoteOid = await resolveRemoteBranch(engine, DEFAULT_REMOTE, upstream);
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
	limit?: number,
	startRef?: string
): Promise<string> {
	const { fs, dir } = engine;
	const current = await git.currentBranch({ fs, dir });
	// The log only knows what the local repo knows: local branches plus the
	// remote-tracking refs written by fetch/push — never the true remote.
	const trackingBranches = await git
		.listBranches({ fs, dir, remote: DEFAULT_REMOTE })
		.catch(() => [] as string[]);

	const branchSet = new Set<string>();
	if (startRef) {
		branchSet.add(startRef);
	} else if (all) {
		for (const b of await git.listBranches({ fs, dir })) branchSet.add(b);
		for (const b of trackingBranches) branchSet.add(`origin/${b}`);
		if (!current) branchSet.add('HEAD');
	} else {
		branchSet.add(current ?? 'HEAD');
	}

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
	if (!current) {
		const headOid = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
		if (headOid) decorate(headOid, 'HEAD', true);
	}
	for (const b of trackingBranches) {
		const oid = await resolveRemoteBranch(engine, DEFAULT_REMOTE, b);
		if (oid) decorate(oid, `origin/${b}`);
	}
	for (const t of await git.listTags({ fs, dir }).catch(() => [])) {
		// resolveRevision peels annotated tags to the commit they point at,
		// so the decoration lands on a commit the log will actually show.
		const oid = await engine.resolveRevision(t).catch(() => null);
		if (oid) decorate(oid, `tag: ${t}`);
	}

	const seen = new Set<string>();
	const entries: { oid: string; message: string; author: string; timestamp: number }[] = [];

	for (const branch of branchSet) {
		let ref = branch;
		if (branch.startsWith('origin/')) {
			const trackingOid = await resolveRemoteBranch(engine, DEFAULT_REMOTE, branch.slice(7));
			if (!trackingOid) continue;
			ref = trackingOid;
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

/** Post-order removal of directories left empty after git clean -d. */
async function removeEmptyDirs(engine: GitEngine, current?: string): Promise<boolean> {
	const dir = current ?? engine.dir;
	const entries = (await engine.fs.promises.readdir(dir).catch(() => [])) as string[];
	let empty = true;
	for (const entry of entries) {
		if (dir === engine.dir && entry === '.git') {
			empty = false;
			continue;
		}
		const full = `${dir}/${entry}`;
		const stat = await engine.fs.promises.stat(full).catch(() => null);
		if (stat?.isDirectory()) {
			const childEmpty = await removeEmptyDirs(engine, full);
			if (childEmpty) {
				await engine.fs.promises.rmdir(full).catch(() => {});
			} else {
				empty = false;
			}
		} else {
			empty = false;
		}
	}
	return current !== undefined && empty;
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

	// Resolve what we're merging. For origin/x this reads the remote-TRACKING
	// ref (what the last fetch saw) — never the true remote, and never by
	// creating a local branch literally named "origin/x" (which made a second
	// merge explode with AlreadyExistsError).
	let theirsOid: string | null;
	if (branch.startsWith('origin/')) {
		theirsOid = await resolveRemoteBranch(engine, DEFAULT_REMOTE, branch.slice(7));
		if (!theirsOid) {
			return {
				output: `merge: ${branch} - not something we can merge\nhint: run git fetch first to download the remote branches`,
				error: true
			};
		}
	} else {
		theirsOid = await git.resolveRef({ fs, dir, ref: `refs/heads/${branch}` }).catch(() => null);
		if (!theirsOid) {
			return { output: `merge: ${branch} - not something we can merge`, error: true };
		}
	}

	const origHead = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	try {
		const result = await git.merge({
			fs,
			dir,
			ours: current,
			theirs: branch,
			author: AUTHOR,
			abortOnConflict: false
		});
		engine.mergeState = null;
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
			engine.mergeState = { origHead, theirsOid, theirsLabel: branch };
			const filepaths =
				err && typeof err === 'object' && 'data' in err
					? ((err as { data?: { filepaths?: string[] } }).data?.filepaths ?? [])
					: [];
			await engine.relabelConflictMarkers(filepaths, current);
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

	/** stash@{2} → 2; bare subcommands → 0 */
	const parseRefIdx = (rest: string): number | null => {
		const trimmed = rest.trim();
		if (!trimmed) return 0;
		const match = trimmed.match(/^stash@\{(\d+)\}$/);
		return match ? Number(match[1]) : null;
	};

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

	// Bare `git stash` == `git stash push`
	if (joined === '' || joined.startsWith('push') || joined === '-u' || joined === '-m') {
		const msgMatch = joined.match(/-m\s+("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s-]+)/);
		let message = 'WIP';
		if (msgMatch) {
			const raw = msgMatch[1];
			message =
				(raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
					? raw.slice(1, -1)
					: raw;
		}
		try {
			await git.stash({ fs, dir, op: 'push', message });
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (/nothing to stash|clean/i.test(msg)) {
				return { output: 'No local changes to save' };
			}
			throw err;
		}
		return {
			output: `Saved working directory and index state\n  On ${(await git.currentBranch({ fs, dir })) ?? 'HEAD'}: ${message}`
		};
	}

	const applyLike = joined.match(/^(pop|apply|drop)\s*(.*)$/);
	if (applyLike) {
		const op = applyLike[1] as 'pop' | 'apply' | 'drop';
		const refIdx = parseRefIdx(applyLike[2]);
		if (refIdx === null) {
			return {
				output: `error: '${applyLike[2].trim()}' is not a stash reference — use stash@{n}`,
				error: true
			};
		}
		// isomorphic-git silently no-ops past the end of the stash list;
		// real git errors, and the error is the teachable part.
		const existing = (await git.stash({ fs, dir, op: 'list' }).catch(() => [])) as unknown;
		const count = Array.isArray(existing)
			? existing.length
			: typeof existing === 'string' && existing.trim()
				? existing.trim().split('\n').length
				: 0;
		if (refIdx >= count) {
			return { output: `error: stash@{${refIdx}} is not a valid reference`, error: true };
		}
		try {
			await git.stash({ fs, dir, op, refIdx });
		} catch {
			return { output: `error: stash@{${refIdx}} is not a valid reference`, error: true };
		}
		if (op === 'pop') return { output: `Dropped refs/stash@{${refIdx}} (stash applied)` };
		if (op === 'drop') return { output: `Dropped refs/stash@{${refIdx}}` };
		return { output: '' };
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

async function runFetch(
	engine: GitEngine,
	remote = DEFAULT_REMOTE,
	prune = false
): Promise<CommandResult> {
	const lines: string[] = [];
	for (const [branch, oid] of engine.remote.branches) {
		const oldOid = await resolveRemoteBranch(engine, remote, branch);
		// Renew the lease even when nothing changed — fetching is what
		// force-with-lease measures against.
		engine.remote.recordFetched(branch, oid);
		if (oldOid === oid) continue;
		await writeRemoteTrackingRef(engine, remote, branch, oid);
		const oldShort = oldOid ? shortOid(oldOid) : null;
		lines.push(
			oldShort
				? `   ${oldShort}..${shortOid(oid)}  ${branch}       -> ${remote}/${branch}`
				: ` * [new branch]      ${branch}       -> ${remote}/${branch}`
		);
	}
	if (prune) {
		const tracking = await git
			.listBranches({ fs: engine.fs, dir: engine.dir, remote })
			.catch(() => [] as string[]);
		for (const b of tracking) {
			if (b === 'HEAD' || engine.remote.branches.has(b)) continue;
			await git
				.deleteRef({ fs: engine.fs, dir: engine.dir, ref: `refs/remotes/${remote}/${b}` })
				.catch(() => {});
			lines.push(` - [deleted]         (none)     -> ${remote}/${b}`);
		}
	}
	if (lines.length === 0) {
		// Real fetch prints nothing when there's nothing new
		return { output: '' };
	}
	return { output: [`From ${DEFAULT_REMOTE_URL}`, ...lines].join('\n') };
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

	// git push --tags: push every local tag (and nothing else)
	if (argList.includes('--tags')) {
		const tags = await git.listTags({ fs, dir });
		const lines: string[] = [];
		for (const t of tags) {
			if (engine.remote.tags.get(t)) continue;
			const tagOid = await git.resolveRef({ fs, dir, ref: `refs/tags/${t}` });
			engine.remote.tags.set(t, tagOid);
			lines.push(` * [new tag]         ${t} -> ${t}`);
		}
		if (lines.length === 0) return { output: 'Everything up-to-date' };
		return { output: [`To ${DEFAULT_REMOTE_URL}`, ...lines].join('\n') };
	}

	// git push origin v1.2.0: a tag ref, not a branch
	const localTags = await git.listTags({ fs, dir });
	if (parts[1] && localTags.includes(parts[1])) {
		const t = parts[1];
		if (engine.remote.tags.get(t)) return { output: 'Everything up-to-date' };
		const tagOid = await git.resolveRef({ fs, dir, ref: `refs/tags/${t}` });
		engine.remote.tags.set(t, tagOid);
		return { output: `To ${DEFAULT_REMOTE_URL}\n * [new tag]         ${t} -> ${t}` };
	}

	const branch = parts[1] ?? (await git.currentBranch({ fs, dir }));

	if (!branch) return { output: 'fatal: no branch checked out', error: true };

	const oid = await git
		.resolveRef({ fs, dir, ref: `refs/heads/${branch}` })
		.catch(() => null as string | null);
	if (!oid) {
		return {
			output: `error: src refspec ${branch} does not match any\nerror: failed to push some refs to '${DEFAULT_REMOTE_URL}'`,
			error: true
		};
	}
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
	if (setUpstream) engine.remote.setUpstream(branch, branch);

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
	let oid: string;
	try {
		oid = await engine.resolveRevision(ref);
	} catch {
		// Fall back to the branch-scoped short-hash lookup
		oid = await resolveCommitOid(engine, ref);
	}
	const { commit } = await git.readCommit({ fs, dir, oid });
	const parentOid = commit.parent[0];
	if (!parentOid) return { output: 'fatal: cannot revert a root commit', error: true };

	const parentFiles = await listFilesAtCommit(engine, parentOid);
	const commitFiles = await listFilesAtCommit(engine, oid);
	const touched = new Set([...commitFiles, ...parentFiles]);

	// Real git refuses to overwrite local modifications; so do we.
	const matrix = await git.statusMatrix({ fs, dir });
	const dirty = matrix
		.filter(([filepath, head, workdir, stage]) => {
			if (!touched.has(filepath)) return false;
			return !(head === 1 && workdir === 1 && stage === 1);
		})
		.map(([filepath]) => filepath);
	if (dirty.length > 0) {
		return {
			output: `error: your local changes to the following files would be overwritten by revert:\n${dirty.map((f) => `\t${f}`).join('\n')}\nhint: commit or stash your changes first.`,
			error: true
		};
	}

	// Real git three-way-merges the inverse patch; the playground just writes
	// the parent's content back. If the file changed again in a LATER commit,
	// that would silently destroy the later change — refuse honestly instead.
	for (const file of touched) {
		const inCommit = commitFiles.includes(file);
		const atCommit = inCommit ? await readFileAtCommit(engine, oid, file) : null;
		const atHead = await readHeadFile(engine, file);
		if (atCommit !== atHead) {
			return {
				output: `error: could not revert ${shortOid(oid)} — '${file}' has changed in a later commit.\nhint: in real Git this becomes a merge conflict to resolve by hand; the playground\nhint: can only revert commits whose files haven't changed since. Try reverting the\nhint: most recent commit that touched the file.`,
				error: true
			};
		}
	}

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
	if (!engine.mergeState) {
		return { output: 'fatal: There is no merge to abort (MERGE_HEAD missing).', error: true };
	}
	const target = engine.mergeState.origHead;
	const branch = await git.currentBranch({ fs, dir });
	if (branch) {
		await moveBranchTo(engine, branch, target);
	}
	engine.mergeState = null;
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

/**
 * Diff two revisions, or a revision against the working tree (to === null).
 */
async function formatDiffBetween(
	engine: GitEngine,
	from: string,
	to: string | null
): Promise<string> {
	const fromOid = await engine.resolveRevision(from);
	const toOid = to === null ? null : await engine.resolveRevision(to);

	const fromFiles = await listFilesAtCommit(engine, fromOid);
	const toFiles =
		toOid === null ? await engine.listWorkingFiles() : await listFilesAtCommit(engine, toOid);
	const allFiles = [...new Set([...fromFiles, ...toFiles])].sort();

	const lines: string[] = [];
	for (const filepath of allFiles) {
		const before = await readFileAtCommit(engine, fromOid, filepath);
		const after =
			toOid === null
				? await engine.readFile(filepath)
				: await readFileAtCommit(engine, toOid, filepath);
		if (before === after) continue;
		lines.push(...fileDiffBlock(filepath, before, after));
	}
	return lines.join('\n');
}

/** Collapse a unified diff into --stat form: per-file counts + a summary. */
function statify(diffText: string): string {
	if (!diffText.trim()) return '';
	const perFile: { file: string; add: number; del: number }[] = [];
	let current: { file: string; add: number; del: number } | null = null;
	for (const line of diffText.split('\n')) {
		const header = line.match(/^diff --git a\/(.+) b\//);
		if (header) {
			current = { file: header[1], add: 0, del: 0 };
			perFile.push(current);
			continue;
		}
		if (!current) continue;
		if (line.startsWith('+') && !line.startsWith('+++')) current.add++;
		else if (line.startsWith('-') && !line.startsWith('---')) current.del++;
	}
	const width = Math.max(...perFile.map((f) => f.file.length));
	const lines = perFile.map(
		(f) =>
			` ${f.file.padEnd(width)} | ${f.add + f.del} ${'+'.repeat(Math.min(f.add, 20))}${'-'.repeat(Math.min(f.del, 20))}`
	);
	const totalAdd = perFile.reduce((n, f) => n + f.add, 0);
	const totalDel = perFile.reduce((n, f) => n + f.del, 0);
	lines.push(
		` ${perFile.length} file${perFile.length === 1 ? '' : 's'} changed, ${totalAdd} insertion${totalAdd === 1 ? '' : 's'}(+), ${totalDel} deletion${totalDel === 1 ? '' : 's'}(-)`
	);
	return lines.join('\n');
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
	const [sub, ...rest] = tokenize(args);

	try {
		switch (sub) {
			case 'help':
				return { output: PLAYGROUND_COMMANDS_HELP };
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
				if (rest.includes('-A') || rest.includes('--all')) {
					await addAll(engine);
					return { output: '' };
				}
				if (rest.includes('-u') || rest.includes('--update')) {
					// Stage tracked modifications and deletions; untracked files
					// are exactly what -u leaves alone.
					await stageTracked(engine);
					return { output: '' };
				}
				const pathspecs = rest.filter((a) => !a.startsWith('-'));
				if (pathspecs.length === 0) {
					return {
						output: "Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?",
						error: true
					};
				}
				if (pathspecs.length === 1 && pathspecs[0] === '.') {
					await addAll(engine);
					return { output: '' };
				}
				for (const pathspec of pathspecs) {
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
				// Clustered short flags containing 'a' (-a, -am) stage tracked changes
				const stageAll = rest.some((t) => /^-[a-z]*a[a-z]*$/.test(t));
				const message = parseQuotedMessage(args);
				const mergeState = engine.mergeState;

				if (stageAll) await stageTracked(engine);

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

				if (mergeState) {
					// Block until every conflict has been staged, with real git's
					// wording instead of a raw UnmergedPathsError.
					const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
					const unresolved = matrix
						.filter(([, , , stage]) => stage === 3)
						.map(([filepath]) => filepath);
					if (unresolved.length > 0) {
						return {
							output: `error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add <file>'\nhint: to mark resolution and make a commit.\nUnmerged paths:\n${unresolved.map((f) => `\t${f}`).join('\n')}`,
							error: true
						};
					}
					// A resolved merge commit has TWO parents — that's what makes
					// it a merge in the history and the graph.
					const ourHead = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
					const mergeMessage = message ?? `Merge ${mergeState.theirsLabel}`;
					const oid = await git.commit({
						fs: engine.fs,
						dir: engine.dir,
						message: mergeMessage,
						author: AUTHOR,
						parent: [ourHead, mergeState.theirsOid]
					});
					engine.mergeState = null;
					engine.recordReflog(oid, `commit (merge): ${mergeMessage.split('\n')[0]}`);
					const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? 'main';
					return { output: `[${branch} ${shortOid(oid)}] ${mergeMessage.split('\n')[0]}` };
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
				if (rest.includes('-p') || rest.includes('--patch')) {
					return {
						output:
							"git log -p isn't supported in the playground — use git show <commit> to see one commit's diff.",
						error: true
					};
				}
				const authorFlag = rest.find((a) => a.startsWith('--author'));
				if (authorFlag) {
					return {
						output: "git log --author isn't supported in the playground yet.",
						error: true
					};
				}
				if (rest.includes('--graph')) {
					return {
						output:
							"git log --graph isn't supported in the terminal — but the commit graph panel beside it is live and updates after every command.",
						error: true
					};
				}
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
				// git log <ref>: start the walk from that ref instead of HEAD
				const positional = rest.filter(
					(a, i) => !a.startsWith('-') && !(nFlagIdx >= 0 && i === nFlagIdx + 1)
				);
				let startRef: string | undefined;
				if (positional.length > 0) {
					try {
						startRef = await engine.resolveRevision(positional[0]);
					} catch {
						return {
							output: `fatal: ambiguous argument '${positional[0]}': unknown revision`,
							error: true
						};
					}
				}
				const raw = await formatLog(engine, oneline, all, limit, startRef);
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
						? (
								await git
									.listBranches({ fs: engine.fs, dir: engine.dir, remote: DEFAULT_REMOTE })
									.catch(() => [] as string[])
							)
								.filter((b) => b !== 'HEAD')
								.map((b) => `  remotes/origin/${b}`)
						: [];
					return { output: [...localLines, ...remoteLines].join('\n') || 'No branches yet' };
				}
				// git branch <name> [<start-point>]
				const names = rest.filter((a) => !a.startsWith('-'));
				const newName = names[0];
				const startPoint = names[1];
				if (!newName) return { output: 'fatal: branch name required', error: true };
				const object = startPoint ? await engine.resolveRevision(startPoint) : undefined;
				await git.branch({ fs: engine.fs, dir: engine.dir, ref: newName, object });
				return { output: '' };
			}

			case 'switch':
			case 'checkout': {
				const dashDash = rest.indexOf('--');
				if (sub === 'checkout' && dashDash >= 0) {
					const rev = dashDash > 0 ? rest[dashDash - 1] : null;
					const files = rest.slice(dashDash + 1);
					if (files.length === 0) {
						return { output: 'fatal: you must specify path(s) after --', error: true };
					}
					if (!rev) {
						// git checkout -- <file>: restore the working tree from the
						// INDEX (not HEAD), leaving the index untouched.
						for (const filepath of files) {
							const content = await readIndexFile(engine, filepath);
							if (content === null) {
								return {
									output: `error: pathspec '${filepath}' did not match any file(s) known to git`,
									error: true
								};
							}
							await engine.writeFile(filepath, content);
						}
						return { output: '' };
					}
					// git checkout <rev> -- <file>: restore file + index from <rev>
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

				const currentBefore = await git.currentBranch({ fs: engine.fs, dir: engine.dir });

				// git switch - / git checkout -: back to the previous branch
				if (rest.length === 1 && rest[0] === '-') {
					if (!engine.previousBranch) {
						return { output: 'fatal: no previous branch to switch to', error: true };
					}
					const target = engine.previousBranch;
					await git.checkout({ fs: engine.fs, dir: engine.dir, ref: target });
					engine.previousBranch = currentBefore ?? null;
					const tip = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' });
					engine.recordReflog(tip, `checkout: moving to ${target}`);
					return { output: `Switched to branch '${target}'` };
				}

				const create = rest.includes('-c') || rest.includes('-b');
				const positional = rest.filter((a) => !a.startsWith('-'));
				const name = positional[0];
				if (!name) return { output: 'fatal: missing branch name', error: true };
				if (create) {
					// git switch -c <name> [<start-point>]
					const startPoint = positional[1];
					const object = startPoint ? await engine.resolveRevision(startPoint) : undefined;
					await git.branch({ fs: engine.fs, dir: engine.dir, ref: name, object });
				}
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
					engine.previousBranch = currentBefore ?? engine.previousBranch;
					engine.recordReflog(oid, `checkout: moving to ${name}`);
					return {
						output: `Note: switching to '${name}'.\n\nYou are in 'detached HEAD' state. You can look around and experiment,\nbut any commits you make here belong to no branch. To keep work made\nhere, create a branch: git switch -c <new-branch-name>`
					};
				}
				await git.checkout({ fs: engine.fs, dir: engine.dir, ref: name });
				if (currentBefore && currentBefore !== name) engine.previousBranch = currentBefore;
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
					if (filepath === '.') {
						// isomorphic-git's resetIndex has no pathspec support, so
						// walk the matrix and unstage everything individually.
						const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
						for (const [f, head, , stage] of matrix) {
							if (stage === 2 || stage === 3 || (head === 1 && stage === 0)) {
								await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath: f });
							}
						}
						return { output: '' };
					}
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
				const positional = rest.filter((r) => !r.startsWith('-'));

				// Disambiguate `git reset HEAD~1` from `git reset <file>` and
				// `git reset HEAD <file>`: the first positional is a revision iff
				// it resolves as one and isn't an existing path.
				let rev = 'HEAD';
				let files: string[] = [];
				if (positional.length > 0) {
					const first = positional[0];
					const isExistingPath = (await engine.readFile(first)) !== null;
					let resolved = false;
					if (!isExistingPath) {
						try {
							await engine.resolveRevision(first);
							resolved = true;
						} catch {
							resolved = false;
						}
					}
					if (resolved) {
						rev = first;
						files = positional.slice(1);
					} else {
						files = positional;
					}
				}

				if (files.length > 0) {
					if (hard || soft) {
						return { output: 'fatal: Cannot do hard/soft reset with paths.', error: true };
					}
					// git reset [HEAD] <file>: unstage just those paths
					for (const pathspec of files) {
						const matches = await expandPathspec(engine, pathspec);
						const targets = matches.length > 0 ? matches : [pathspec];
						for (const filepath of targets) {
							await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath });
						}
					}
					return { output: '' };
				}

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
					// checkout diffs target-tree vs INDEX, so when the ref didn't
					// move (git reset --hard with no rev) it does nothing — restore
					// modified tracked files by hand and unstage staged new ones.
					const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
					for (const [filepath, head, workdir, stage] of matrix) {
						if (head === 1 && (workdir !== 1 || stage !== 1)) {
							const content = await readFileAtCommit(engine, oid, filepath);
							if (content !== null) {
								await engine.writeFile(filepath, content);
								await git.add({ fs: engine.fs, dir: engine.dir, filepath });
							}
						} else if (head === 0 && (stage === 2 || stage === 3)) {
							await git.resetIndex({ fs: engine.fs, dir: engine.dir, filepath });
						}
					}
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
				if (rest.includes('--abort')) return await runMergeAbort(engine);
				return await runMerge(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? '');
			}

			case 'rebase': {
				if (rest.includes('-i') || rest.includes('--interactive')) {
					return {
						output:
							"Interactive rebase isn't supported in the playground yet.\nIn real Git, git rebase -i opens a todo list where you can reorder, squash,\nreword, or drop commits. Here, try git reset --soft HEAD~n to re-do recent\ncommits, or git commit --amend to fix the latest one.",
						error: true
					};
				}
				if (rest.includes('--abort')) return await runReplayAbort(engine, 'rebase');
				if (rest.includes('--continue')) return await runReplayContinue(engine, 'rebase');
				return await runRebase(engine, rest.filter((a) => !a.startsWith('-')).pop() ?? 'main');
			}

			case 'cherry-pick': {
				if (rest.includes('--abort')) return await runReplayAbort(engine, 'cherry-pick');
				if (rest.includes('--continue')) return await runReplayContinue(engine, 'cherry-pick');
				const rev = rest.filter((a) => !a.startsWith('-')).pop();
				if (!rev) return { output: 'fatal: you must name a commit to cherry-pick', error: true };
				if (rev.includes('..')) {
					return {
						output:
							"Commit ranges aren't supported in the playground — cherry-pick commits one\nat a time. (Real Git accepts a..b, which EXCLUDES a itself; use a^..b to\ninclude it — a classic gotcha.)",
						error: true
					};
				}
				return await runCherryPick(engine, rev);
			}

			case 'stash':
				return await runStash(engine, rest.join(' '));

			case 'fetch': {
				const prune = rest.includes('--prune') || rest.includes('-p');
				const remote = rest.filter((a) => !a.startsWith('-'))[0] ?? DEFAULT_REMOTE;
				return await runFetch(engine, remote, prune);
			}

			case 'pull':
				return await runPull(engine, rest.join(' '));

			case 'push':
				return await runPush(engine, rest.join(' '));

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
				return await runRevert(engine, ref);
			}

			case 'diff': {
				const staged = rest.includes('--staged') || rest.includes('--cached');
				const stat = rest.includes('--stat');
				const positional = rest.filter((a) => !a.startsWith('-'));

				let raw: string;
				if (positional.length === 1 && positional[0].includes('..')) {
					// git diff a..b (also tolerates a...b as an approximation)
					const [from, to] = positional[0].split(/\.{2,3}/);
					raw = await formatDiffBetween(engine, from, to || 'HEAD');
				} else if (positional.length === 2) {
					raw = await formatDiffBetween(engine, positional[0], positional[1]);
				} else if (positional.length === 1) {
					// git diff <rev>: that commit vs the working tree
					raw = await formatDiffBetween(engine, positional[0], null);
				} else {
					raw = await formatDiff(engine, staged);
				}
				if (stat) {
					return { output: esc(statify(raw)), colored: true };
				}
				return { output: colorizeDiff(raw), colored: true };
			}

			case 'show': {
				const rev = rest.filter((a) => !a.startsWith('-')).pop() ?? 'HEAD';
				return await runShow(engine, rev);
			}

			case 'reflog': {
				if (engine.reflog.length === 0) return { output: 'No reflog entries yet.' };
				const lines = engine.reflog.map(
					(entry, i) => `${shortOid(entry.oid)} HEAD@{${i}}: ${entry.message}`
				);
				return { output: colorizeLog(lines.join('\n')), colored: true };
			}

			case 'tag':
				return await runTag(engine, rest.join(' '));

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
				const flagChars = new Set(
					rest.filter((t) => /^-[a-z]+$/.test(t)).flatMap((t) => t.slice(1).split(''))
				);
				const dryRun = flagChars.has('n');
				const force = flagChars.has('f');
				const removeDirs = flagChars.has('d');
				if (!force && !dryRun) {
					return {
						output:
							'fatal: clean.requireForce is true and neither -f nor -n given; refusing to clean\nhint: preview with git clean -n, delete with git clean -f (add -d for directories)',
						error: true
					};
				}
				const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
				const removed: string[] = [];
				for (const [filepath, head, workdir, stage] of matrix) {
					if (head === 0 && workdir === 2 && stage === 0) {
						if (dryRun) {
							removed.push(`Would remove ${filepath}`);
						} else {
							await engine.fs.promises.unlink(`${engine.dir}/${filepath}`);
							removed.push(`Removing ${filepath}`);
						}
					}
				}
				if (!dryRun && removeDirs) {
					await removeEmptyDirs(engine);
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
