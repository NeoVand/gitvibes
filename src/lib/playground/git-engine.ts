import './polyfills';
import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import { RemoteState, writeRemoteTrackingRef, type RemoteBranchRef } from './remote-state';
import type { PatchSession } from './patch-mode';

export interface PlaygroundFile {
	path: string;
	content: string;
}

export interface SeedCommit {
	message: string;
	files?: PlaygroundFile[];
}

export interface BranchSeed {
	name: string;
	from?: string;
	atCommit?: number;
	commits: SeedCommit[];
}

export interface RepoSeed {
	branch?: string;
	commits: SeedCommit[];
	branches?: BranchSeed[];
	workingFiles?: PlaygroundFile[];
	stagedFiles?: string[];
	remote?: RemoteBranchRef[];
}

const AUTHOR = { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' };

// LightningFS eagerly takes a per-name Web Locks mutex in its constructor,
// so two instances sharing a name (e.g. the panel playground re-created on
// scenario switch) can deadlock. Every instance gets a unique backing name;
// the counter disambiguates same-millisecond creations.
let fsInstanceCounter = 0;

function uniqueFsName(base: string): string {
	return `${base}-${Date.now()}-${++fsInstanceCounter}`;
}

// In-memory stand-in for LightningFS's IndexedDB layer. Every scenario is
// reseeded from scratch, so persistence is pure overhead — and IndexedDB
// traffic serializes across the playground instances on the page, making
// scenario loads take many seconds.
class MemoryIdb {
	private files = new Map<number, Uint8Array>();
	private superblock: unknown = null;

	saveSuperblock(superblock: unknown): void {
		this.superblock = superblock;
	}
	loadSuperblock(): unknown {
		return this.superblock;
	}
	readFile(inode: number): Uint8Array | undefined {
		return this.files.get(inode);
	}
	writeFile(inode: number, data: Uint8Array): void {
		this.files.set(inode, data);
	}
	unlink(inode: number): void {
		this.files.delete(inode);
	}
	wipe(): void {
		this.files.clear();
		this.superblock = null;
	}
	close(): void {}
}

type LightningFSOptions = NonNullable<ConstructorParameters<typeof LightningFS>[1]>;

function createMemoryFs(base: string): LightningFS {
	// The published FS.IDB type is out of sync with what the runtime calls
	// (readFile/unlink vs loadFile), hence the cast.
	return new LightningFS(uniqueFsName(base), {
		db: new MemoryIdb()
	} as unknown as LightningFSOptions);
}

export interface ReflogEntry {
	oid: string;
	message: string;
}

export interface ReplayState {
	/** 'rebase' pauses/resumes a whole replay; 'cherry-pick' a single commit */
	kind: 'rebase' | 'cherry-pick';
	branch: string;
	/** Where the branch pointed before the operation started */
	originalOid: string;
	/** The commit currently paused on a conflict */
	current: { oid: string; message: string };
	/** Commits still to replay after the current one */
	remaining: { oid: string; message: string }[];
}

export class GitEngine {
	fs: LightningFS;
	dir = '/repo';
	remote = new RemoteState();
	patchSession: PatchSession | null = null;
	/**
	 * isomorphic-git doesn't maintain reflogs, so the engine records HEAD
	 * movements itself. Newest entry first (index 0 == HEAD@{0}).
	 */
	reflog: ReflogEntry[] = [];
	replayState: ReplayState | null = null;
	/** HEAD before the last merge attempt — what merge --abort returns to */
	mergeOrigHead: string | null = null;
	private initPromise: Promise<void> | null = null;

	constructor(private fsName = 'gitvibes-playground') {
		this.fs = createMemoryFs(this.fsName);
	}

	recordReflog(oid: string, message: string): void {
		this.reflog.unshift({ oid, message });
		if (this.reflog.length > 100) this.reflog.pop();
	}

	async reset(seed?: RepoSeed): Promise<void> {
		this.fs = createMemoryFs(this.fsName);
		this.initPromise = null;
		this.remote.clear();
		this.patchSession = null;
		this.reflog = [];
		this.replayState = null;
		await this.ensureInit();

		if (!seed) return;

		for (const commit of seed.commits) {
			await this.commitFiles(commit.message, commit.files ?? []);
		}

		if (seed.branches) {
			for (const branch of seed.branches) {
				await this.seedBranch(branch);
			}
		}

		if (seed.branch) {
			await git.checkout({ fs: this.fs, dir: this.dir, ref: seed.branch });
		}

		if (seed.workingFiles) {
			for (const file of seed.workingFiles) {
				await this.writeFile(file.path, file.content);
			}
		}

		if (seed.stagedFiles) {
			for (const filepath of seed.stagedFiles) {
				await git.add({ fs: this.fs, dir: this.dir, filepath });
			}
		}

		if (seed.remote) {
			for (const ref of seed.remote) {
				this.remote.setBranch(ref.branch, ref.oid);
				this.remote.recordFetched(ref.branch, ref.oid);
				await writeRemoteTrackingRef(this, 'origin', ref.branch, ref.oid);
			}
		}
	}

	async resetWith(fn: (engine: GitEngine) => Promise<void>): Promise<void> {
		this.fs = createMemoryFs(this.fsName);
		this.initPromise = null;
		this.remote.clear();
		this.patchSession = null;
		this.reflog = [];
		this.replayState = null;
		await this.ensureInit();
		await fn(this);
	}

	async commitFiles(message: string, files: PlaygroundFile[]): Promise<string> {
		for (const file of files) {
			await this.writeFile(file.path, file.content);
			await git.add({ fs: this.fs, dir: this.dir, filepath: file.path });
		}
		const oid = await git.commit({
			fs: this.fs,
			dir: this.dir,
			message,
			author: AUTHOR
		});
		this.recordReflog(oid, `commit: ${message.split('\n')[0]}`);
		return oid;
	}

	async getCommitOid(branch: string, depthFromTip = 0): Promise<string> {
		const log = await git.log({ fs: this.fs, dir: this.dir, ref: branch, depth: depthFromTip + 1 });
		return log[depthFromTip].oid;
	}

	private async seedBranch(branch: BranchSeed): Promise<void> {
		const from = branch.from ?? 'main';
		let baseOid: string | undefined;

		if (branch.atCommit !== undefined) {
			baseOid = await this.getCommitOid(from, branch.atCommit);
		}

		await git.branch({
			fs: this.fs,
			dir: this.dir,
			ref: branch.name,
			object: baseOid,
			checkout: true
		});

		for (const commit of branch.commits) {
			await this.commitFiles(commit.message, commit.files ?? []);
		}
	}

	private async ensureInit(defaultBranch = 'main'): Promise<void> {
		if (!this.initPromise) {
			this.initPromise = (async () => {
				await this.fs.promises.mkdir(this.dir);
				await git.init({ fs: this.fs, dir: this.dir, defaultBranch });
				await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.name', value: AUTHOR.name });
				await git.setConfig({
					fs: this.fs,
					dir: this.dir,
					path: 'user.email',
					value: AUTHOR.email
				});
			})();
		}
		await this.initPromise;
	}

	async writeFile(path: string, content: string): Promise<void> {
		const fullPath = `${this.dir}/${path}`;
		const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
		if (dirPath.length > this.dir.length) {
			await this.ensureDir(dirPath);
		}
		const before = await this.fs.promises.stat(fullPath).catch(() => null);
		await this.fs.promises.writeFile(fullPath, content, 'utf8');
		if (before) {
			// "Racy git": change detection compares size+mtime against the
			// index, and LightningFS stamps millisecond mtimes — a rewrite in
			// the same millisecond with same-length content looks unchanged.
			// Rewrite after a tick so the mtime always moves.
			const after = await this.fs.promises.stat(fullPath).catch(() => null);
			if (after && after.mtimeMs === before.mtimeMs) {
				await new Promise((resolve) => setTimeout(resolve, 2));
				await this.fs.promises.writeFile(fullPath, content, 'utf8');
			}
		}
	}

	private async ensureDir(dirPath: string): Promise<void> {
		const relative = dirPath.slice(this.dir.length + 1);
		if (!relative) return;
		const parts = relative.split('/');
		let current = this.dir;
		for (const part of parts) {
			current = `${current}/${part}`;
			try {
				await this.fs.promises.mkdir(current);
			} catch {
				// directory may already exist
			}
		}
	}

	async readFile(path: string): Promise<string | null> {
		try {
			return await this.fs.promises.readFile(`${this.dir}/${path}`, 'utf8');
		} catch {
			return null;
		}
	}

	async listWorkingFiles(): Promise<string[]> {
		const results: string[] = [];

		async function walk(fs: LightningFS, current: string, prefix: string) {
			const entries = await fs.promises.readdir(current);
			for (const entry of entries) {
				if (entry === '.git') continue;
				const full = `${current}/${entry}`;
				const rel = prefix ? `${prefix}/${entry}` : entry;
				const stat = await fs.promises.stat(full);
				if (stat.isDirectory()) {
					await walk(fs, full, rel);
				} else {
					results.push(rel);
				}
			}
		}

		await walk(this.fs, this.dir, '');
		return results.sort();
	}

	/**
	 * Resolve git revision syntax: HEAD, branch names, full/short oids,
	 * ~n / ^ / ^2 suffix chains, and HEAD@{n} via the engine reflog.
	 */
	async resolveRevision(rev: string): Promise<string> {
		const reflogMatch = rev.match(/^HEAD@\{(\d+)\}$/);
		if (reflogMatch) {
			const entry = this.reflog[Number(reflogMatch[1])];
			if (!entry) throw new Error(`ambiguous argument '${rev}': unknown revision`);
			return entry.oid;
		}

		const match = rev.match(/^(.*?)((?:[~^]\d*)*)$/);
		const baseName = match?.[1] ?? rev;
		const suffixes = match?.[2] ?? '';

		let oid: string;
		if (baseName === 'HEAD' || baseName === '') {
			oid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'HEAD' });
		} else {
			try {
				oid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: baseName });
			} catch {
				try {
					oid = await git.expandOid({ fs: this.fs, dir: this.dir, oid: baseName });
				} catch {
					throw new Error(`ambiguous argument '${rev}': unknown revision`);
				}
			}
		}

		for (const step of suffixes.match(/[~^]\d*/g) ?? []) {
			const op = step[0];
			const count = step.length > 1 ? Number(step.slice(1)) : 1;
			if (op === '~') {
				for (let i = 0; i < count; i++) {
					oid = await this.parentOf(oid, 1, rev);
				}
			} else {
				oid = await this.parentOf(oid, count, rev);
			}
		}
		return oid;
	}

	/** @deprecated kept as the historical name — same as resolveRevision */
	async resolveHead(rev: string): Promise<string> {
		return this.resolveRevision(rev);
	}

	private async parentOf(oid: string, n: number, rev: string): Promise<string> {
		const { commit } = await git.readCommit({ fs: this.fs, dir: this.dir, oid });
		const parent = commit.parent[n - 1];
		if (!parent) throw new Error(`ambiguous argument '${rev}': unknown revision`);
		return parent;
	}
}

export { git };
