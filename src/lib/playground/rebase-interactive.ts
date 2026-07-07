import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

// Interactive rebase as a terminal session, following the add -p pattern:
// the todo list is presented, the learner answers p/s/r/d per commit
// (oldest first), and the plan executes in one shot at the end. Conflicts
// abort the whole rebase — the playground doesn't pause interactive plans.

const AUTHOR = { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' };

export interface RebaseIEntry {
	oid: string;
	message: string;
	action?: 'pick' | 'squash' | 'reword' | 'drop';
	newMessage?: string;
}

export interface RebaseISession {
	branch: string;
	baseOid: string;
	originalOid: string;
	entries: RebaseIEntry[];
	position: number;
	awaitingReword: boolean;
}

function short(oid: string): string {
	return oid.slice(0, 7);
}

function subject(message: string): string {
	return message.split('\n')[0];
}

function question(session: RebaseISession): string {
	const entry = session.entries[session.position];
	return `(${session.position + 1}/${session.entries.length}) ${short(entry.oid)} ${subject(entry.message)} — [p/s/r/d/q]?`;
}

export async function startRebaseISession(
	engine: GitEngine,
	upstream: string
): Promise<{ output: string; error?: boolean }> {
	const { fs, dir } = engine;
	const branch = await git.currentBranch({ fs, dir });
	if (!branch) return { output: 'fatal: not on a branch', error: true };

	let baseOid: string;
	try {
		baseOid = await engine.resolveRevision(upstream);
	} catch {
		return { output: `fatal: invalid upstream '${upstream}'`, error: true };
	}

	const originalOid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	const log = await git.log({ fs, dir, ref: branch, depth: 100 });
	const entries: RebaseIEntry[] = [];
	let foundBase = false;
	for (const e of log) {
		if (e.oid === baseOid) {
			foundBase = true;
			break;
		}
		entries.unshift({ oid: e.oid, message: e.commit.message });
	}
	if (!foundBase) {
		return {
			output: `fatal: invalid upstream '${upstream}' — not an ancestor of HEAD`,
			error: true
		};
	}
	if (entries.length === 0) {
		return { output: `Current branch ${branch} is up to date.` };
	}

	engine.rebaseISession = {
		branch,
		baseOid,
		originalOid,
		entries,
		position: 0,
		awaitingReword: false
	};

	const todo = entries.map((e) => `pick ${short(e.oid)} ${subject(e.message)}`).join('\n');
	return {
		output: [
			todo,
			'',
			`# Interactive rebase of ${entries.length} commit${entries.length === 1 ? '' : 's'} onto ${short(baseOid)}.`,
			'# Answer for each commit, oldest first:',
			'#   p = pick (keep) · s = squash into the previous kept commit',
			'#   r = reword the message · d = drop the commit · q = abort',
			'',
			question(engine.rebaseISession)
		].join('\n')
	};
}

async function executePlan(engine: GitEngine): Promise<{ output: string; error?: boolean }> {
	const session = engine.rebaseISession;
	engine.rebaseISession = null;
	if (!session) return { output: 'fatal: no interactive rebase in progress', error: true };

	const { fs, dir } = engine;
	const { branch, baseOid, originalOid, entries } = session;

	// Rebuild the branch from the base, applying the plan
	await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: baseOid, force: true });
	await git.checkout({ fs, dir, ref: branch, force: true });

	let prevMessage: string | null = null;
	const applied: string[] = [];

	try {
		for (const entry of entries) {
			const action = entry.action ?? 'pick';
			if (action === 'drop') {
				applied.push(`drop   ${short(entry.oid)} ${subject(entry.message)}`);
				continue;
			}

			await git.cherryPick({ fs, dir, oid: entry.oid, committer: AUTHOR });

			if (action === 'squash' && prevMessage !== null) {
				// Fold this commit into the previous one: soft-reset the branch
				// under the pair, then re-commit the combined tree + message.
				const tip = await git.resolveRef({ fs, dir, ref: 'HEAD' });
				const { commit: tipCommit } = await git.readCommit({ fs, dir, oid: tip });
				const prevOid = tipCommit.parent[0];
				const { commit: prevCommit } = await git.readCommit({ fs, dir, oid: prevOid });
				const grandparent = prevCommit.parent[0] ?? baseOid;
				await git.writeRef({
					fs,
					dir,
					ref: `refs/heads/${branch}`,
					value: grandparent,
					force: true
				});
				const combined: string = `${prevMessage}\n\n${entry.message.trim()}`;
				const oid = await git.commit({ fs, dir, message: combined, author: AUTHOR });
				prevMessage = combined;
				engine.recordReflog(oid, `rebase -i (squash): ${subject(entry.message)}`);
				applied.push(`squash ${short(entry.oid)} ${subject(entry.message)}`);
				continue;
			}

			if (action === 'reword' && entry.newMessage) {
				const oid = await git.commit({
					fs,
					dir,
					message: entry.newMessage,
					author: AUTHOR,
					amend: true
				});
				prevMessage = entry.newMessage;
				engine.recordReflog(oid, `rebase -i (reword): ${subject(entry.newMessage)}`);
				applied.push(`reword ${short(entry.oid)} ${subject(entry.newMessage)}`);
				continue;
			}

			// plain pick (or a squash with nothing before it to squash into)
			prevMessage = entry.message;
			const oid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
			engine.recordReflog(oid, `rebase -i (pick): ${subject(entry.message)}`);
			applied.push(`pick   ${short(entry.oid)} ${subject(entry.message)}`);
		}
	} catch {
		// A conflicting replay: put everything back exactly as it was
		await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: originalOid, force: true });
		await git.checkout({ fs, dir, ref: branch, force: true });
		return {
			output:
				'error: a commit did not replay cleanly, so the interactive rebase was aborted\nhint: the playground cannot pause an interactive plan on conflicts (real Git would,\nhint: exactly like section 5.5). Your branch is unchanged.',
			error: true
		};
	}

	const kept = entries.filter((e) => (e.action ?? 'pick') !== 'drop').length;
	const squashes = entries.filter((e) => e.action === 'squash').length;
	const finalCount = Math.max(kept - squashes, 0);
	return {
		output: [
			...applied,
			`Successfully rebased and updated refs/heads/${branch}.`,
			`${entries.length} commit${entries.length === 1 ? '' : 's'} became ${finalCount}.`
		].join('\n')
	};
}

export async function handleRebaseIAnswer(
	engine: GitEngine,
	rawAnswer: string
): Promise<{ output: string; error?: boolean }> {
	const session = engine.rebaseISession;
	if (!session) return { output: 'fatal: no interactive rebase in progress', error: true };

	if (session.awaitingReword) {
		const entry = session.entries[session.position];
		const message = rawAnswer.trim();
		if (!message) {
			return { output: `New message for ${short(entry.oid)} (cannot be empty):` };
		}
		entry.newMessage = message;
		session.awaitingReword = false;
		session.position++;
		if (session.position >= session.entries.length) return executePlan(engine);
		return { output: question(session) };
	}

	const answer = rawAnswer.trim().toLowerCase();
	const entry = session.entries[session.position];

	if (answer === 'q' || answer === 'quit') {
		engine.rebaseISession = null;
		return { output: 'Interactive rebase aborted — nothing changed.' };
	}
	if (answer === '?') {
		return {
			output: [
				'p - pick: keep this commit as-is',
				's - squash: fold this commit into the previous kept one (messages combine)',
				'r - reword: keep the changes, replace the message (asked next)',
				'd - drop: delete this commit and its changes',
				'q - abort the whole interactive rebase',
				'',
				question(session)
			].join('\n')
		};
	}

	if (answer === 'p' || answer === 'pick') {
		entry.action = 'pick';
	} else if (answer === 'd' || answer === 'drop') {
		entry.action = 'drop';
	} else if (answer === 's' || answer === 'squash') {
		const hasPreviousKept = session.entries
			.slice(0, session.position)
			.some((e) => (e.action ?? 'pick') !== 'drop');
		if (!hasPreviousKept) {
			return {
				output: `error: cannot squash ${short(entry.oid)} — there is no previous kept commit to fold it into.\n${question(session)}`,
				error: true
			};
		}
		entry.action = 'squash';
	} else if (answer === 'r' || answer === 'reword') {
		entry.action = 'reword';
		session.awaitingReword = true;
		return { output: `New message for ${short(entry.oid)}:` };
	} else {
		return {
			output: `Unknown response '${rawAnswer}'. Use p, s, r, d, q, or ?.\n${question(session)}`,
			error: true
		};
	}

	session.position++;
	if (session.position >= session.entries.length) return executePlan(engine);
	return { output: question(session) };
}
