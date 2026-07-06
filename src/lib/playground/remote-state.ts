import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

export const DEFAULT_REMOTE = 'origin';
export const DEFAULT_REMOTE_URL = 'https://github.com/your-org/project.git';

export interface RemoteBranchRef {
	branch: string;
	oid: string;
}

/** Simulated remote — stores branch tips that fetch/push read and write. */
export class RemoteState {
	readonly url = DEFAULT_REMOTE_URL;
	branches = new Map<string, string>();
	upstream: string | null = null;

	setBranch(branch: string, oid: string) {
		this.branches.set(branch, oid);
	}

	getBranch(branch: string): string | undefined {
		return this.branches.get(branch);
	}

	clear() {
		this.branches.clear();
		this.upstream = null;
	}
}

export async function captureLocalBranch(engine: GitEngine, branch: string): Promise<string> {
	const oid = await git.resolveRef({ fs: engine.fs, dir: engine.dir, ref: `refs/heads/${branch}` });
	return oid;
}

export async function writeRemoteTrackingRef(
	engine: GitEngine,
	remote: string,
	branch: string,
	oid: string
): Promise<void> {
	await git.writeRef({
		fs: engine.fs,
		dir: engine.dir,
		ref: `refs/remotes/${remote}/${branch}`,
		value: oid,
		force: true
	});
}

export async function resolveRemoteBranch(
	engine: GitEngine,
	remote: string,
	branch: string
): Promise<string | null> {
	try {
		return await git.resolveRef({
			fs: engine.fs,
			dir: engine.dir,
			ref: `refs/remotes/${remote}/${branch}`
		});
	} catch {
		return null;
	}
}

export function parseRemoteBranch(
	spec: string,
	defaultRemote = DEFAULT_REMOTE
): { remote: string; branch: string } {
	if (spec.includes('/')) {
		const [remote, ...rest] = spec.split('/');
		return { remote, branch: rest.join('/') };
	}
	return { remote: defaultRemote, branch: spec };
}
