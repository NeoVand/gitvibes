/**
 * Small read-only lookups shared by the nine challenge `check()` functions.
 * Mirrors the private helpers in scenarios.ts — duplicated on purpose: the
 * challenge modules are lazy-loaded, and importing scenarios.ts here would
 * drag every lesson seed into the challenge bundle (and create an import
 * cycle through challenges.ts besides).
 */

import git from 'isomorphic-git';
import type { GitEngine } from '../git-engine';
import { readFileAtCommit } from '../tree-utils';

export async function tipOid(engine: GitEngine, branch: string): Promise<string | null> {
	return git
		.resolveRef({ fs: engine.fs, dir: engine.dir, ref: `refs/heads/${branch}` })
		.catch(() => null);
}

export async function tipMessage(engine: GitEngine, branch: string): Promise<string | null> {
	const oid = await tipOid(engine, branch);
	if (!oid) return null;
	const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
	return commit.message.trim();
}

export async function headOid(engine: GitEngine): Promise<string | null> {
	return git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: 'HEAD' }).catch(() => null);
}

export async function headMessage(engine: GitEngine): Promise<string | null> {
	const oid = await headOid(engine);
	if (!oid) return null;
	const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
	return commit.message.trim();
}

export async function headAuthor(
	engine: GitEngine
): Promise<{ name: string; email: string } | null> {
	const oid = await headOid(engine);
	if (!oid) return null;
	const { commit } = await git.readCommit({ fs: engine.fs, dir: engine.dir, oid });
	return { name: commit.author.name, email: commit.author.email };
}

export async function fileAtHead(engine: GitEngine, filepath: string): Promise<string | null> {
	const oid = await headOid(engine);
	if (!oid) return null;
	return readFileAtCommit(engine, oid, filepath);
}

export async function fileAtTip(
	engine: GitEngine,
	branch: string,
	filepath: string
): Promise<string | null> {
	const oid = await tipOid(engine, branch);
	if (!oid) return null;
	return readFileAtCommit(engine, oid, filepath);
}

/** Is `prefix` the start of any commit subject reachable from `ref`? */
export async function logContains(
	engine: GitEngine,
	ref: string,
	prefix: string
): Promise<boolean> {
	const log = await git.log({ fs: engine.fs, dir: engine.dir, ref, depth: 50 }).catch(() => []);
	return log.some((e) => e.commit.message.trim().startsWith(prefix));
}

/** Commit count reachable from `ref`, capped at `max`. */
export async function logDepth(engine: GitEngine, ref: string, max = 50): Promise<number> {
	const log = await git.log({ fs: engine.fs, dir: engine.dir, ref, depth: max }).catch(() => []);
	return log.length;
}

/**
 * The commit an ANNOTATED tag points at, or null if the tag is missing or
 * lightweight. Release checks want exactly this distinction: a lightweight
 * tag resolves straight to a commit and returns null here.
 */
export async function annotatedTagTarget(engine: GitEngine, tag: string): Promise<string | null> {
	const tagOid = await git
		.resolveRef({ fs: engine.fs, dir: engine.dir, ref: `refs/tags/${tag}` })
		.catch(() => null);
	if (!tagOid) return null;
	const tagObject = await git
		.readTag({ fs: engine.fs, dir: engine.dir, oid: tagOid })
		.catch(() => null);
	if (!tagObject) return null;
	return engine.peelTag(tagOid);
}

/** True if any index entry is staged (differs from HEAD). */
export async function anythingStaged(engine: GitEngine): Promise<boolean> {
	const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
	return matrix.some(([, , , stage]) => stage === 2 || stage === 3);
}

export { git };
