import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

export async function resolveCommitOid(engine: GitEngine, ref: string): Promise<string> {
	const { fs, dir } = engine;

	if (/^[0-9a-f]{7,40}$/i.test(ref)) {
		const log = await git.log({ fs, dir, depth: 100 });
		const match = log.find((e) => e.oid.startsWith(ref.toLowerCase()));
		if (match) return match.oid;
	}

	if (ref === 'HEAD') {
		return engine.resolveHead('HEAD');
	}

	try {
		return await git.resolveRef({ fs, dir, ref: `refs/heads/${ref}` });
	} catch {
		return git.resolveRef({ fs, dir, ref });
	}
}

export async function readFileAtCommit(
	engine: GitEngine,
	commitOid: string,
	filepath: string
): Promise<string | null> {
	const { fs, dir } = engine;

	try {
		const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath });
		return new TextDecoder().decode(blob);
	} catch {
		// Fall back to walking the commit tree when filepath lookup fails.
	}

	let found: string | null = null;

	await git.walk({
		fs,
		dir,
		trees: [git.TREE({ ref: commitOid })],
		map: async (path, [entry]) => {
			if (!entry || path !== filepath) return;
			const type = await entry.type();
			if (type !== 'blob') return;
			const oid = await entry.oid();
			const { blob } = await git.readBlob({ fs, dir, oid });
			found = new TextDecoder().decode(blob);
		}
	});

	return found;
}

/** Read a file's content as staged in the index, or null if absent. */
export async function readIndexFile(engine: GitEngine, filepath: string): Promise<string | null> {
	const { fs, dir } = engine;
	// The STAGE walker exposes oids but not content, so collect the oid
	// first and read the blob separately.
	const results = (await git.walk({
		fs,
		dir,
		trees: [git.STAGE()],
		map: async (path, [entry]) => {
			if (path !== filepath || !entry) return undefined;
			if ((await entry.type()) !== 'blob') return undefined;
			return entry.oid();
		}
	})) as (string | undefined)[];
	const oid = results.find((value) => value !== undefined);
	if (!oid) return null;
	const { blob } = await git.readBlob({ fs, dir, oid });
	return new TextDecoder().decode(blob);
}

export async function listFilesAtCommit(engine: GitEngine, commitOid: string): Promise<string[]> {
	const { fs, dir } = engine;

	try {
		return await git.listFiles({ fs, dir, ref: commitOid });
	} catch {
		const files: string[] = [];

		await git.walk({
			fs,
			dir,
			trees: [git.TREE({ ref: commitOid })],
			map: async (path, [entry]) => {
				if (!entry) return;
				const type = await entry.type();
				if (type === 'blob') files.push(path);
			}
		});

		return files;
	}
}
