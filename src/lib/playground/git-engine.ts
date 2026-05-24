import './polyfills';
import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';

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
}

const AUTHOR = { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' };

export class GitEngine {
	fs: LightningFS;
	dir = '/repo';
	private initPromise: Promise<void> | null = null;

	constructor(private fsName = 'gitvibes-playground') {
		this.fs = new LightningFS(this.fsName);
	}

	async reset(seed?: RepoSeed): Promise<void> {
		this.fs = new LightningFS(`${this.fsName}-${Date.now()}`);
		this.initPromise = null;
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
	}

	async resetWith(fn: (engine: GitEngine) => Promise<void>): Promise<void> {
		this.fs = new LightningFS(`${this.fsName}-${Date.now()}`);
		this.initPromise = null;
		await this.ensureInit();
		await fn(this);
	}

	async commitFiles(message: string, files: PlaygroundFile[]): Promise<string> {
		for (const file of files) {
			await this.writeFile(file.path, file.content);
			await git.add({ fs: this.fs, dir: this.dir, filepath: file.path });
		}
		return git.commit({
			fs: this.fs,
			dir: this.dir,
			message,
			author: AUTHOR
		});
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
				await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.email', value: AUTHOR.email });
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
		await this.fs.promises.writeFile(fullPath, content, 'utf8');
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

	async resolveHead(rev: string): Promise<string> {
		if (rev === 'HEAD') {
			const log = await git.log({ fs: this.fs, dir: this.dir, depth: 1 });
			return log[0]?.oid ?? '';
		}
		const match = rev.match(/^HEAD~(\d+)$/);
		if (match) {
			const n = Number(match[1]);
			const log = await git.log({ fs: this.fs, dir: this.dir, depth: n + 1 });
			if (log.length <= n) throw new Error(`ambiguous argument ${rev}: unknown revision`);
			return log[n].oid;
		}
		return rev;
	}
}

export { git };
