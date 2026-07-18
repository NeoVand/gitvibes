/**
 * The gate-to-engine bridge: connects the agent's bash tool to a private
 * GitEngine sandbox and records everything into a terminal transcript the
 * panel renders. Pure orchestration — the approval decision itself comes
 * from gate.ts, the execution from the playground's runGitCommand, so the
 * agent's terminal behaves exactly like the learner's.
 */
import git from 'isomorphic-git';
import { GitEngine, type RepoSeed } from '../playground/git-engine';
import { runGitCommand } from '../playground/commands';
import { createGate, type Gate, type GateResolution } from './gate';

/**
 * The agent's demo-friendly home: a tiny repo with real history, a side
 * branch, one modified tracked file and one untracked file — so `git
 * status`, `git diff`, `git log`, staging, committing, and branch
 * demonstrations all land on state that actually exists. Nothing to break.
 */
export const AGENT_REPO_SEED: RepoSeed = {
	commits: [
		{
			message: 'Initial commit',
			files: [
				{ path: 'README.md', content: '# demo-app\nA tiny repo for live Git demonstrations.\n' },
				{ path: 'src/app.py', content: 'def main():\n    print("hello")\n' }
			]
		},
		{
			message: 'feat: add greeting endpoint',
			files: [{ path: 'src/greet.py', content: 'def greet(name):\n    return f"hi {name}"\n' }]
		},
		{
			message: 'fix: trim whitespace in names',
			files: [
				{ path: 'src/greet.py', content: 'def greet(name):\n    return f"hi {name.strip()}"\n' }
			]
		}
	],
	branches: [
		{
			name: 'feature/ideas',
			commits: [
				{
					message: 'wip: sketch welcome banner',
					files: [{ path: 'ideas.md', content: '- ascii-art welcome banner?\n' }]
				}
			]
		}
	],
	branch: 'main',
	workingFiles: [
		{
			path: 'src/greet.py',
			content: 'def greet(name):\n    return f"hello {name.strip()}!"\n'
		},
		{ path: 'notes.txt', content: 'remember: git status before git add\n' }
	]
};

/** Keeps the per-turn system-prompt injection cheap (~60 tokens seeded). */
const MAX_LISTING_LINES = 25;

/**
 * Compact repo-state snapshot for the system prompt: current branch, what is
 * staged / modified / untracked, the recent log, and the branch list — the
 * ground truth the agent demonstrates against. Capped so a busy sandbox
 * never floods the context.
 */
export async function listingFor(engine: GitEngine): Promise<string> {
	const lines: string[] = [];
	try {
		const branch = (await git.currentBranch({ fs: engine.fs, dir: engine.dir })) ?? '(detached)';
		lines.push(`branch: ${branch}`);

		const matrix = await git.statusMatrix({ fs: engine.fs, dir: engine.dir });
		const staged: string[] = [];
		const modified: string[] = [];
		const untracked: string[] = [];
		for (const [file, head, workdir, stage] of matrix) {
			if (head === 0 && stage === 0 && workdir === 2) untracked.push(file);
			else if (stage === 2 || stage === 3 || (head === 0 && stage > 0)) staged.push(file);
			else if (workdir === 2 && stage === 1) modified.push(file);
		}
		lines.push(`staged: ${staged.join(', ') || '(none)'}`);
		lines.push(`modified: ${modified.join(', ') || '(none)'}`);
		lines.push(`untracked: ${untracked.join(', ') || '(none)'}`);

		const log = await git.log({ fs: engine.fs, dir: engine.dir, ref: 'HEAD', depth: 4 });
		lines.push('recent commits:');
		for (const entry of log) {
			lines.push(`  ${entry.oid.slice(0, 7)} ${entry.commit.message.trim().split('\n')[0]}`);
		}

		const branches = await git.listBranches({ fs: engine.fs, dir: engine.dir });
		lines.push(`branches: ${branches.join(', ')}`);
	} catch {
		lines.push('(repo state unavailable)');
	}
	return lines.slice(0, MAX_LISTING_LINES).join('\n');
}

export interface TerminalLine {
	type: 'input' | 'output';
	text: string;
	error?: boolean;
	/** Colored lines carry pre-escaped HTML from runGitCommand. */
	colored?: boolean;
	/** For input lines: the branch the prompt showed when the command ran. */
	promptCwd?: string;
}

export interface BashRunResult {
	output: string;
	error: boolean;
}

export interface GitBridge {
	gate: Gate;
	engine: GitEngine;
	/** Execute a command in the sandbox, recording prompt + output lines. */
	run(cmd: string): Promise<BashRunResult>;
	/** Convenience: gate.propose (what backends await before running). */
	propose(cmd: string): Promise<GateResolution>;
	/** Compact current repo-state snapshot, for the system prompt. */
	listing(): string;
}

export interface GitBridgeOptions {
	engine?: GitEngine;
	gate?: Gate;
	/** Called for every transcript line (the panel appends to its state). */
	onLine?: (line: TerminalLine) => void;
}

export async function createGitBridge(opts: GitBridgeOptions = {}): Promise<GitBridge> {
	const engine = opts.engine ?? new GitEngine('agent-sandbox');
	if (!opts.engine) {
		// The demo-friendly repo — the agent demonstrates on state that exists.
		await engine.reset(AGENT_REPO_SEED);
	}
	const gate = opts.gate ?? createGate();
	const onLine = opts.onLine ?? (() => {});

	// listing() must be synchronous (it is read while building the system
	// prompt), so the async repo inspection is cached and refreshed after
	// every command the agent runs.
	let cachedListing = '';
	let currentBranch = 'main';
	async function refresh() {
		cachedListing = await listingFor(engine);
		currentBranch =
			(await git.currentBranch({ fs: engine.fs, dir: engine.dir }).catch(() => null)) ??
			'(detached)';
	}
	await refresh();

	return {
		gate,
		engine,
		propose: (cmd: string) => gate.propose(cmd),
		listing: () => cachedListing,
		async run(cmd: string): Promise<BashRunResult> {
			onLine({ type: 'input', text: cmd, promptCwd: currentBranch });
			const result = await runGitCommand(engine, cmd);
			if (result.output) {
				onLine({
					type: 'output',
					text: result.output,
					error: result.error,
					colored: result.colored
				});
			}
			await refresh();
			return { output: result.output, error: result.error ?? false };
		}
	};
}
