// Line-based diff with unified-format output, used by `git diff` and the
// hunk-level `git add -p` flow. Files in the playground are small, so a
// classic LCS table is plenty fast.

export interface DiffLine {
	type: 'context' | 'add' | 'del';
	text: string;
}

export interface Hunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: DiffLine[];
}

function splitLines(text: string): { lines: string[]; trailingNewline: boolean } {
	if (text === '') return { lines: [], trailingNewline: true };
	const trailingNewline = text.endsWith('\n');
	const lines = text.split('\n');
	if (trailingNewline) lines.pop();
	return { lines, trailingNewline };
}

/** Raw edit script: one entry per old/new line, in order. */
function editScript(oldLines: string[], newLines: string[]): DiffLine[] {
	const n = oldLines.length;
	const m = newLines.length;
	// lcs[i][j] = length of LCS of oldLines[i..] and newLines[j..]
	const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i][j] =
				oldLines[i] === newLines[j]
					? lcs[i + 1][j + 1] + 1
					: Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}

	const script: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (oldLines[i] === newLines[j]) {
			script.push({ type: 'context', text: oldLines[i] });
			i++;
			j++;
		} else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
			script.push({ type: 'del', text: oldLines[i] });
			i++;
		} else {
			script.push({ type: 'add', text: newLines[j] });
			j++;
		}
	}
	while (i < n) script.push({ type: 'del', text: oldLines[i++] });
	while (j < m) script.push({ type: 'add', text: newLines[j++] });
	return script;
}

/** Group an edit script into hunks with `context` lines of surrounding context. */
export function diffHunks(oldText: string, newText: string, context = 3): Hunk[] {
	const { lines: oldLines } = splitLines(oldText);
	const { lines: newLines } = splitLines(newText);
	const script = editScript(oldLines, newLines);

	// Indices in `script` that are changes
	const changed = script
		.map((line, idx) => (line.type === 'context' ? -1 : idx))
		.filter((idx) => idx !== -1);
	if (changed.length === 0) return [];

	// Merge changes whose context windows overlap into hunk ranges
	const ranges: Array<[number, number]> = [];
	for (const idx of changed) {
		const start = Math.max(0, idx - context);
		const end = Math.min(script.length - 1, idx + context);
		const last = ranges[ranges.length - 1];
		if (last && start <= last[1] + 1) {
			last[1] = end;
		} else {
			ranges.push([start, end]);
		}
	}

	// Convert ranges into hunks, tracking old/new line numbers
	const hunks: Hunk[] = [];
	let oldLine = 1;
	let newLine = 1;
	let scriptIdx = 0;

	for (const [start, end] of ranges) {
		while (scriptIdx < start) {
			const line = script[scriptIdx++];
			if (line.type !== 'add') oldLine++;
			if (line.type !== 'del') newLine++;
		}
		const hunk: Hunk = {
			oldStart: oldLine,
			oldLines: 0,
			newStart: newLine,
			newLines: 0,
			lines: []
		};
		while (scriptIdx <= end) {
			const line = script[scriptIdx++];
			hunk.lines.push(line);
			if (line.type !== 'add') {
				hunk.oldLines++;
				oldLine++;
			}
			if (line.type !== 'del') {
				hunk.newLines++;
				newLine++;
			}
		}
		// Empty-side hunks (pure insertion/deletion) start one line earlier
		// in unified format when the side has zero lines.
		if (hunk.oldLines === 0) hunk.oldStart--;
		if (hunk.newLines === 0) hunk.newStart--;
		hunks.push(hunk);
	}

	return hunks;
}

function hunkHeader(hunk: Hunk): string {
	const oldPart = hunk.oldLines === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldLines}`;
	const newPart = hunk.newLines === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newLines}`;
	return `@@ -${oldPart} +${newPart} @@`;
}

export function formatHunk(hunk: Hunk): string {
	const lines = [hunkHeader(hunk)];
	for (const line of hunk.lines) {
		const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
		lines.push(`${prefix}${line.text}`);
	}
	return lines.join('\n');
}

/** Full unified diff body for one file (without the diff --git header). */
export function formatUnifiedDiff(oldText: string, newText: string, context = 3): string {
	return diffHunks(oldText, newText, context).map(formatHunk).join('\n');
}

/**
 * Apply a subset of hunks (as produced by diffHunks against the same oldText)
 * to oldText — the heart of hunk-level staging.
 */
export function applyHunks(oldText: string, hunks: Hunk[]): string {
	const { lines: oldLines, trailingNewline } = splitLines(oldText);
	const sorted = [...hunks].sort((a, b) => a.oldStart - b.oldStart);
	const out: string[] = [];
	// Old-file cursor, 0-based
	let cursor = 0;

	for (const hunk of sorted) {
		// A zero-length old side records the line *before* the insertion point
		const hunkStart = hunk.oldLines === 0 ? hunk.oldStart : hunk.oldStart - 1;
		while (cursor < hunkStart) out.push(oldLines[cursor++]);
		for (const line of hunk.lines) {
			if (line.type === 'context') {
				out.push(oldLines[cursor++]);
			} else if (line.type === 'del') {
				cursor++;
			} else {
				out.push(line.text);
			}
		}
	}
	while (cursor < oldLines.length) out.push(oldLines[cursor++]);

	return out.join('\n') + (trailingNewline && out.length > 0 ? '\n' : '');
}
