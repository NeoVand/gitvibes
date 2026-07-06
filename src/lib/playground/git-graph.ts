import git from 'isomorphic-git';
import type { GitEngine } from './git-engine';

function sanitizeLabel(message: string): string {
	return message.split('\n')[0].replace(/"/g, "'").slice(0, 28).trim() || 'commit';
}

export async function buildGitGraph(engine: GitEngine): Promise<string> {
	const { fs, dir } = engine;

	let branches: string[];
	try {
		branches = await git.listBranches({ fs, dir });
	} catch {
		return 'gitGraph\n  commit id: "empty"';
	}

	if (branches.length === 0) {
		return 'gitGraph\n  commit id: "empty"';
	}

	const currentBranch = (await git.currentBranch({ fs, dir })) ?? branches[0];
	const mainBranch = branches.includes('main') ? 'main' : branches[0];

	const branchLogs = new Map<string, Awaited<ReturnType<typeof git.log>>>();
	for (const branch of branches) {
		try {
			branchLogs.set(branch, await git.log({ fs, dir, ref: branch, depth: 100 }));
		} catch {
			branchLogs.set(branch, []);
		}
	}

	const mainLog = branchLogs.get(mainBranch) ?? [];
	if (mainLog.length === 0 && branches.every((b) => (branchLogs.get(b)?.length ?? 0) === 0)) {
		return 'gitGraph\n  commit id: "no commits yet"';
	}

	const lines: string[] = ['gitGraph'];
	const emitted = new Set<string>();

	const emitMain = [...mainLog].reverse();
	for (const entry of emitMain) {
		lines.push(`  commit id: "${sanitizeLabel(entry.commit.message)}"`);
		emitted.add(entry.oid);
	}

	for (const branch of branches) {
		if (branch === mainBranch) continue;

		const log = branchLogs.get(branch) ?? [];
		const chronological = [...log].reverse();
		const uniqueCommits = chronological.filter((entry) => !emitted.has(entry.oid));

		if (uniqueCommits.length === 0) continue;

		lines.push(`  branch ${branch}`);
		if (branch === currentBranch) {
			lines.push(`  checkout ${branch}`);
		}

		for (const entry of uniqueCommits) {
			lines.push(`  commit id: "${sanitizeLabel(entry.commit.message)}"`);
			emitted.add(entry.oid);
		}
	}

	if (currentBranch !== mainBranch && !lines.some((l) => l.includes(`checkout ${currentBranch}`))) {
		const insertAt = lines.findIndex((l) => l.includes(`branch ${currentBranch}`));
		if (insertAt >= 0) {
			lines.splice(insertAt + 1, 0, `  checkout ${currentBranch}`);
		}
	}

	return lines.join('\n');
}
