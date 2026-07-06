import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';
import { applyHunks, diffHunks, formatHunk, type Hunk } from './diff';
import { readIndexFile } from './tree-utils';

// Interactive `git add -p` at real hunk granularity: the diff runs between
// the index and the working tree, the user picks hunks, and the chosen
// hunks are applied to the index content and staged as a new blob — the
// working tree is never touched.

interface PatchFile {
	filepath: string;
	/** Content currently in the index ('' for a brand-new file) */
	baseContent: string;
	hunks: Hunk[];
	chosen: Hunk[];
}

export interface PatchSession {
	files: PatchFile[];
	fileIndex: number;
	hunkIndex: number;
}

export async function startPatchSession(engine: GitEngine, targetFile?: string): Promise<string> {
	const { fs, dir } = engine;
	const matrix = await git.statusMatrix({ fs, dir });
	const files: PatchFile[] = [];

	// Compare contents rather than trusting the status matrix: stat-based
	// change detection has second granularity and misses same-length edits
	// made in the same second as the last add.
	for (const [filepath, , workdir] of matrix) {
		if (targetFile && filepath !== targetFile) continue;
		if (workdir === 0) continue;

		const workContent = await engine.readFile(filepath);
		if (workContent === null) continue;
		const baseContent = (await readIndexFile(engine, filepath)) ?? '';
		if (workContent === baseContent) continue;
		const hunks = diffHunks(baseContent, workContent);
		if (hunks.length === 0) continue;
		files.push({ filepath, baseContent, hunks, chosen: [] });
	}

	if (files.length === 0) {
		return targetFile
			? `No unstaged changes in ${targetFile}`
			: 'No unstaged changes to stage interactively.';
	}

	engine.patchSession = { files, fileIndex: 0, hunkIndex: 0 };
	return formatPatchPrompt(engine);
}

function currentFile(session: PatchSession): PatchFile {
	return session.files[session.fileIndex];
}

function totalHunksLabel(session: PatchSession): string {
	const file = currentFile(session);
	return `(${session.hunkIndex + 1}/${file.hunks.length})`;
}

export function formatPatchPrompt(engine: GitEngine): string {
	const session = engine.patchSession;
	if (!session) return 'Done staging selected changes.';

	const file = currentFile(session);
	const hunk = file.hunks[session.hunkIndex];
	return [
		`diff --git a/${file.filepath} b/${file.filepath}`,
		formatHunk(hunk),
		`${totalHunksLabel(session)} Stage this hunk [y,n,q,a,d,?]?`
	].join('\n');
}

/** Stage the chosen hunks of a file by writing the resulting blob to the index. */
async function stageChosen(engine: GitEngine, file: PatchFile): Promise<void> {
	if (file.chosen.length === 0) return;
	const { fs, dir } = engine;
	const newContent = applyHunks(file.baseContent, file.chosen);
	const oid = await git.writeBlob({
		fs,
		dir,
		blob: new TextEncoder().encode(newContent)
	});
	await git.updateIndex({ fs, dir, filepath: file.filepath, oid, add: true });
}

/** Move to the next hunk, staging and advancing across files as needed. */
async function advance(engine: GitEngine, session: PatchSession): Promise<string | null> {
	const file = currentFile(session);
	session.hunkIndex++;
	if (session.hunkIndex < file.hunks.length) return null;

	await stageChosen(engine, file);
	const staged = file.chosen.length;
	session.fileIndex++;
	session.hunkIndex = 0;

	const note =
		staged > 0
			? `Staged ${staged} hunk${staged === 1 ? '' : 's'} in ${file.filepath}.`
			: `Skipped ${file.filepath}.`;

	if (session.fileIndex >= session.files.length) {
		engine.patchSession = null;
		return `${note}\nDone staging selected changes. Run git status to review.`;
	}
	return note;
}

export async function handlePatchAnswer(engine: GitEngine, answer: string): Promise<string> {
	const session = engine.patchSession;
	if (!session) return 'No patch session active. Run git add -p first.';

	const choice = answer.trim().toLowerCase();
	const file = currentFile(session);
	const hunk = file.hunks[session.hunkIndex];

	if (choice === '?') {
		return [
			'y - stage this hunk',
			'n - do not stage this hunk',
			'a - stage this hunk and all later hunks in the file',
			'd - do not stage this hunk or any later hunks in the file',
			'q - quit; do not stage this hunk or any remaining ones',
			'',
			formatPatchPrompt(engine)
		].join('\n');
	}

	if (choice === 'q' || choice === 'quit') {
		// Real git quits without staging the undecided hunks, but keeps
		// what was already staged in completed files.
		engine.patchSession = null;
		return 'Patch session quit.';
	}

	let note: string | null = null;

	if (choice === 'y' || choice === 'yes') {
		file.chosen.push(hunk);
		note = await advance(engine, session);
	} else if (choice === 'n' || choice === 'no') {
		note = await advance(engine, session);
	} else if (choice === 'a') {
		file.chosen.push(...file.hunks.slice(session.hunkIndex));
		session.hunkIndex = file.hunks.length - 1;
		note = await advance(engine, session);
	} else if (choice === 'd') {
		session.hunkIndex = file.hunks.length - 1;
		note = await advance(engine, session);
	} else {
		return `Unknown response '${answer}'. Use y, n, a, d, q, or ?.\n${formatPatchPrompt(engine)}`;
	}

	if (!engine.patchSession) return note ?? 'Done staging selected changes.';
	return note ? `${note}\n${formatPatchPrompt(engine)}` : formatPatchPrompt(engine);
}
