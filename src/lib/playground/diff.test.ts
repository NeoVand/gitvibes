import { describe, expect, it } from 'vitest';
import { applyHunks, diffHunks, formatUnifiedDiff } from './diff';

const OLD = `function greet(name) {
	console.log('Hello ' + name);
}

function farewell(name) {
	console.log('Bye ' + name);
}

module.exports = { greet, farewell };
`;

const NEW = `function greet(name) {
	console.log(\`Hello \${name}!\`);
}

function farewell(name) {
	console.log('Bye ' + name);
}

function wave() {
	console.log('👋');
}

module.exports = { greet, farewell, wave };
`;

describe('diffHunks', () => {
	it('returns no hunks for identical text', () => {
		expect(diffHunks(OLD, OLD)).toEqual([]);
	});

	it('produces interleaved del/add lines in position order', () => {
		const hunks = diffHunks(OLD, NEW);
		expect(hunks.length).toBeGreaterThan(0);
		const first = hunks[0];
		const types = first.lines.map((l) => l.type);
		// The change to the greet body appears as del followed by add,
		// surrounded by context — never all-dels-then-all-adds across the file.
		expect(types).toContain('context');
		const delIdx = first.lines.findIndex((l) => l.type === 'del');
		const addIdx = first.lines.findIndex((l) => l.type === 'add');
		expect(delIdx).toBeGreaterThanOrEqual(0);
		expect(addIdx).toBe(delIdx + 1);
	});

	it('handles duplicate lines correctly', () => {
		const a = 'x\ny\nx\n';
		const b = 'x\ny\nz\nx\n';
		const hunks = diffHunks(a, b);
		const adds = hunks.flatMap((h) => h.lines.filter((l) => l.type === 'add'));
		expect(adds).toHaveLength(1);
		expect(adds[0].text).toBe('z');
		expect(hunks.flatMap((h) => h.lines.filter((l) => l.type === 'del'))).toHaveLength(0);
	});

	it('emits standard @@ headers', () => {
		const out = formatUnifiedDiff('a\nb\nc\n', 'a\nB\nc\n');
		expect(out).toMatch(/^@@ -1,3 \+1,3 @@$/m);
		expect(out).toContain('-b');
		expect(out).toContain('+B');
		expect(out).toContain(' a');
	});

	it('splits distant changes into separate hunks', () => {
		const many = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n') + '\n';
		const changed = many.replace('line 2', 'LINE 2').replace('line 27', 'LINE 27');
		const hunks = diffHunks(many, changed);
		expect(hunks).toHaveLength(2);
	});
});

describe('applyHunks', () => {
	it('applying all hunks reproduces the new text', () => {
		const hunks = diffHunks(OLD, NEW);
		expect(applyHunks(OLD, hunks)).toBe(NEW);
	});

	it('applying a subset stages only that change', () => {
		const many = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n') + '\n';
		const changed = many.replace('line 2', 'LINE 2').replace('line 27', 'LINE 27');
		const hunks = diffHunks(many, changed);
		expect(hunks).toHaveLength(2);

		const firstOnly = applyHunks(many, [hunks[0]]);
		expect(firstOnly).toContain('LINE 2');
		expect(firstOnly).toContain('line 27');
		expect(firstOnly).not.toContain('LINE 27');

		const secondOnly = applyHunks(many, [hunks[1]]);
		expect(secondOnly).toContain('line 2');
		expect(secondOnly).toContain('LINE 27');
	});

	it('handles pure insertions and deletions at file edges', () => {
		const a = 'middle\n';
		const b = 'top\nmiddle\nbottom\n';
		const hunks = diffHunks(a, b);
		expect(applyHunks(a, hunks)).toBe(b);

		const back = diffHunks(b, a);
		expect(applyHunks(b, back)).toBe(a);
	});

	it('round-trips file creation from empty', () => {
		const b = 'brand\nnew\nfile\n';
		const hunks = diffHunks('', b);
		expect(applyHunks('', hunks)).toBe(b);
	});
});
