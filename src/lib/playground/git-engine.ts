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

export interface RepoSeed {
	branch?: string;
	commits: SeedCommit[];
	workingFiles?: PlaygroundFile[];
}

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
		await this.ensureInit(seed?.branch ?? 'main');

		if (!seed) return;

		for (const commit of seed.commits) {
			if (commit.files) {
				for (const file of commit.files) {
					await this.writeFile(file.path, file.content);
					await git.add({ fs: this.fs, dir: this.dir, filepath: file.path });
				}
			}
			await git.commit({
				fs: this.fs,
				dir: this.dir,
				message: commit.message,
				author: { name: 'Vibe Coder', email: 'vibe@gitvibes.dev' }
			});
		}

		if (seed.branch && seed.branch !== 'main') {
			await git.branch({ fs: this.fs, dir: this.dir, ref: seed.branch });
			await git.checkout({ fs: this.fs, dir: this.dir, ref: seed.branch });
		}

		if (seed.workingFiles) {
			for (const file of seed.workingFiles) {
				await this.writeFile(file.path, file.content);
			}
		}
	}

	private async ensureInit(defaultBranch = 'main'): Promise<void> {
		if (!this.initPromise) {
			this.initPromise = (async () => {
				await this.fs.promises.mkdir(this.dir);
				await git.init({ fs: this.fs, dir: this.dir, defaultBranch });
				await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.name', value: 'Vibe Coder' });
				await git.setConfig({ fs: this.fs, dir: this.dir, path: 'user.email', value: 'vibe@gitvibes.dev' });
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
}

export { git };
