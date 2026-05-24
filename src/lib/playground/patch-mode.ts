import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

export interface PatchSession {
	files: string[];
	index: number;
}

export async function startPatchSession(engine: GitEngine, targetFile?: string): Promise<string> {
	const { fs, dir } = engine;
	const matrix = await git.statusMatrix({ fs, dir });
	const unstaged: string[] = [];

	for (const [filepath, head, workdir, stage] of matrix) {
		if (targetFile && filepath !== targetFile) continue;
		if (head === 0 && workdir === 2) unstaged.push(filepath);
		else if (head === 1 && workdir === 2 && stage !== 2) unstaged.push(filepath);
	}

	if (unstaged.length === 0) {
		return targetFile ? `No unstaged changes in ${targetFile}` : 'No unstaged changes to stage interactively.';
	}

	engine.patchSession = { files: unstaged, index: 0 };
	return formatPatchPrompt(engine);
}

export function formatPatchPrompt(engine: GitEngine): string {
	const session = engine.patchSession;
	if (!session || session.index >= session.files.length) {
		engine.patchSession = null;
		return 'Done staging selected changes.';
	}

	const file = session.files[session.index];
	return `(${session.index + 1}/${session.files.length}) Stage changes in ${file} [y,n,q,a,?]?`;
}

export async function handlePatchAnswer(engine: GitEngine, answer: string): Promise<string> {
	const session = engine.patchSession;
	if (!session) return 'No patch session active. Run git add -p first.';

	const choice = answer.trim().toLowerCase();

	if (choice === 'q' || choice === 'quit') {
		engine.patchSession = null;
		return 'Patch session quit.';
	}

	if (choice === '?') {
		return `${formatPatchPrompt(engine)}
y - stage this file
n - skip this file
a - stage this and all remaining files
q - quit patch mode`;
	}

	if (choice === 'a') {
		while (session.index < session.files.length) {
			await git.add({ fs: engine.fs, dir: engine.dir, filepath: session.files[session.index] });
			session.index++;
		}
		engine.patchSession = null;
		return 'Staged all remaining changes.';
	}

	const file = session.files[session.index];
	if (choice === 'y' || choice === 'yes') {
		await git.add({ fs: engine.fs, dir: engine.dir, filepath: file });
		session.index++;
	} else if (choice === 'n' || choice === 'no') {
		session.index++;
	} else {
		return `Unknown response '${answer}'. Use y, n, q, a, or ?.\n${formatPatchPrompt(engine)}`;
	}

	if (session.index >= session.files.length) {
		engine.patchSession = null;
		return 'Done staging selected changes.';
	}

	return `Staged ${file}.\n${formatPatchPrompt(engine)}`;
}
