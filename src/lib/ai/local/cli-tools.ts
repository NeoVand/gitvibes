/**
 * Tool roster + system prompt for CLI sessions (`agent "<task>"` in a
 * playground terminal). Two tools only: bash, bound to the INVOKING
 * terminal's engine and gated by the human at every call, and done, which
 * ends the session with a summary. `done` is declared interruptOn alongside
 * bash — the session loop reads the interrupt and simply never resumes, so
 * calling done truly ends the run without a wasted model round (its invoke
 * body never executes).
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AgentBash } from '../types';
import type { AnyTool } from './deepagent';

/**
 * The course-agent persona, re-cut for CLI mode: terse and act-oriented.
 * Leads hard with "act first" and shows a worked example, because small
 * instruct models otherwise over-obey "end with done" and call it as their
 * very first move — completing nothing. Never invent output.
 */
export const CLI_SYSTEM_PROMPT = [
	"You are the GitVibes agent, a CLI assistant running inside the learner's",
	'sandboxed Git playground terminal, entirely in their browser. You are given',
	'one task and you COMPLETE IT BY RUNNING COMMANDS — not by describing them.',
	'',
	'HOW YOU WORK:',
	'- Your FIRST action is ALWAYS a bash tool call. Never call done before you',
	'  have actually run at least one command and seen its real output.',
	'- Call the bash tool with ONE small command at a time, then read its real',
	'  output before deciding the next step. Start with git status or git log',
	'  --oneline when you need to understand the repo before changing it.',
	'- NEVER invent, predict, or paraphrase command output — only trust what the',
	'  tool actually returned.',
	'- Every bash call pauses for the human to allow, edit, or deny it. A denial',
	'  is feedback: change your approach instead of repeating the same command.',
	'- Keep prose to at most one short line before each action. No markdown, no',
	'  essays — this is a terminal.',
	'- The sandbox is a real in-memory Git repository. Available: every git',
	'  command the playground supports (status log diff add commit branch switch',
	'  merge rebase restore reset revert stash tag cherry-pick reflog bisect',
	'  worktree fetch pull push) plus echo cat ls. No network beyond the',
	'  simulated origin, no other shell tools.',
	'- Commit messages follow Conventional Commits: feat:, fix:, chore:, docs:.',
	'- Destructive commands (reset --hard, push --force, clean -f) need a clear',
	'  reason in your one-line prose before you propose them.',
	'- Call the done tool ONLY after the task is genuinely finished (its commands',
	'  have run) or is truly impossible — with a one-line summary of what you did.',
	'',
	'EXAMPLE',
	'Task: "commit the login stub on a new feature branch"',
	'  bash(cmd="git status")',
	'  bash(cmd="git switch -c feature/login")',
	'  bash(cmd="git add src/login.py")',
	'  bash(cmd=\'git commit -m "feat: add login stub"\')',
	'  bash(cmd="git log --oneline -n 2")',
	'  done(summary="Committed the login stub on feature/login.")'
].join('\n');

/** Gated bash bound to the invoking terminal (see tools.ts for the pattern). */
function createCliBashTool(bash: AgentBash) {
	return tool(
		async ({ cmd }: { cmd: string }) => {
			const result = await bash.run(cmd);
			if (!result.output) return result.error ? '(command failed with no output)' : '(no output)';
			return result.error ? `[stderr]\n${result.output}` : result.output;
		},
		{
			name: 'bash',
			description:
				"Run one command in the learner's Git playground terminal (git commands plus " +
				'echo/cat/ls). The human approves every command before it runs, and the real ' +
				'output comes back to you. One small command per call.',
			schema: z.object({
				cmd: z.string().describe('The command to run, e.g. git status')
			})
		}
	);
}

function createDoneTool() {
	return tool(async ({ summary }: { summary: string }) => summary || 'done', {
		name: 'done',
		description:
			'End the session. Call this exactly once, when the task is complete (or ' +
			'impossible), with a one-line summary of what happened.',
		schema: z.object({
			summary: z.string().describe('One line: what was accomplished.')
		})
	});
}

/** The CLI tool roster: bash (gated, terminal-bound) + done. */
export function buildCliTools(opts: { bash: AgentBash }): AnyTool[] {
	return [
		createCliBashTool(opts.bash) as unknown as AnyTool,
		createDoneTool() as unknown as AnyTool
	];
}
