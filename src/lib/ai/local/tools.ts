/**
 * The agent's tool registry: search_course (agentic RAG over the committed
 * course index) and the gated bash tool (demonstrations in the agent's own
 * ShellEngine sandbox — every call pauses at the human approval gate via the
 * deepagent's interruptOn machinery before this tool ever executes).
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { retrieve } from '../retrieval';
import type { AgentBash } from '../types';
import type { AnyTool } from './deepagent';

/**
 * Persona + citation + demonstration contract. Verbose and beginner-warm on
 * purpose: the answer must TEACH — direct answer, concrete explanation, a
 * runnable example, the classic gotcha — with citations at the end (the
 * panel renders them as a "Sources" chip row, outside the sentence flow).
 */
export const TUTOR_SYSTEM_PROMPT = [
	'You are the GitVibes tutor: a friendly, patient guide to Git and version',
	"control, embedded in the GitVibes course. You run entirely in the learner's",
	'browser. Your learners are beginners — often developers who use AI coding',
	'tools and want Git as the safety net for the code those tools generate.',
	'',
	'MANDATORY WORKFLOW — no exceptions:',
	'1. For EVERY question, your FIRST action is calling the search_course tool with',
	'   2-4 keywords (e.g. "undo pushed commit revert"). NEVER answer from memory alone.',
	'2. Ground your answer in the returned lesson excerpts.',
	'3. Cite the sections you used by copying their [[id]] tokens at the END of your',
	'   answer, e.g. [[section-4-5]]. Only cite ids search_course returned.',
	'',
	'HOW TO ANSWER — every answer teaches:',
	'- Answer the actual question directly in the first sentence, then explain the',
	'  concept concretely: what happens, why, what the learner will see.',
	'- Include at least one runnable example in a fenced code block:',
	'  ```bash',
	'  git log --oneline -n 5',
	'  ```',
	'- Mention the common gotcha or safety note when there is one (public vs local',
	'  history, reset vs revert, force-push etiquette).',
	'- Put every command, flag, branch, and filename in `backticks`. Use **bold**',
	'  for the one key term. Short paragraphs and simple bullet lists over prose.',
	'',
	'YOUR TERMINAL — show, then explain:',
	'- You have a bash tool that runs commands in your own sandboxed Git repository,',
	'  visible to the learner. It accepts git commands plus echo/cat/ls. When they',
	'  ask HOW something works, or ask you to demonstrate, prefer to DEMONSTRATE:',
	'  call bash with one small command at a time, then explain what just happened.',
	'- IMPORTANT: to actually run a command you must CALL the bash tool — just',
	'  printing a code block does NOT run anything.',
	'- Every bash call pauses for the learner to approve, edit, or deny it — that',
	'  is part of the lesson. Keep commands small, safe, and readable.',
	'- The sandbox is yours alone: a tiny repo with real history, a side branch,',
	'  one modified file and one untracked file — nothing to break. A "YOUR REPO',
	'  RIGHT NOW" snapshot at the end of this message is refreshed before every',
	'  one of your turns — it is the ground truth. Demonstrate against the files,',
	'  branches, and commits it shows. If you need a file that is not listed,',
	'  CREATE it first (echo). NEVER reference a path or branch it does not show.',
	'',
	'BOUNDARIES:',
	'- You teach Git, GitHub workflows, and this course. For unrelated topics, say',
	'  the course does not cover them and steer back to Git.',
	'- Never invent flags — only use what appears in the lesson excerpts or is',
	'  standard, and call out destructive commands explicitly (reset --hard,',
	'  push --force, clean).',
	'- If search_course returns nothing relevant, say the course does not cover it.'
].join('\n');

/**
 * The per-round system prompt: the tutor contract plus a live snapshot of the
 * agent's sandbox. Rebuilt for EVERY model call (deepagent accepts a function)
 * so the listing stays truthful after the agent's own commands mutate the VFS.
 */
export function tutorSystemPrompt(listing?: string | null): string {
	if (!listing) return TUTOR_SYSTEM_PROMPT;
	return [
		TUTOR_SYSTEM_PROMPT,
		'',
		'YOUR REPO RIGHT NOW:',
		listing,
		'Anything not listed above does not exist yet.'
	].join('\n');
}

/** Format retrieval hits the way the system prompt teaches the model to cite. */
export function formatCourseHits(query: string, k = 4): string {
	const hits = retrieve(query, k);
	if (hits.length === 0) {
		return 'No course sections matched that query. Tell the learner the course does not cover it.';
	}
	return hits
		.map((h) => `[[${h.id}]] "${h.title}" (relevance ${h.score.toFixed(1)}):\n${h.snippet}`)
		.join('\n\n');
}

export function createSearchCourseTool() {
	return tool(async ({ query }: { query: string }) => formatCourseHits(query), {
		name: 'search_course',
		description:
			'Search the GitVibes course lessons. Returns the most relevant lesson excerpts, ' +
			'each tagged with its [[section-id]] citation token. Call this before answering any ' +
			'question about Git, GitHub workflows, or the course.',
		schema: z.object({
			query: z.string().describe('Short search query, e.g. "undo pushed commit revert"')
		})
	});
}

/**
 * The gated bash tool. Execution reaches this function only AFTER the human
 * approved (or edited) the call — the deepagent's `interruptOn: ['bash']`
 * pass gates it first, and a denial is answered with a synthesized
 * ToolMessage without ever executing. Output (stdout/stderr) becomes the
 * ToolMessage the model reads next round.
 */
export function createBashTool(bash: AgentBash) {
	return tool(
		async ({ cmd }: { cmd: string }) => {
			const result = await bash.run(cmd);
			if (!result.output) return result.error ? '(command failed with no output)' : '(no output)';
			return result.error ? `[stderr]\n${result.output}` : result.output;
		},
		{
			name: 'bash',
			description:
				'Run one command in your own sandboxed Git repository, visible to the learner — ' +
				'git commands plus echo/cat/ls. Use it to demonstrate concepts live ("show, then ' +
				'explain"). The learner approves every command before it runs. Keep each call to ' +
				'a single small command.',
			schema: z.object({
				cmd: z.string().describe('The command to run, e.g. git log --oneline')
			})
		}
	);
}

export interface AgentToolOptions {
	/** The gated sandbox; when present the bash tool joins the roster. */
	bash?: AgentBash;
}

/** The tool roster for the course agent. */
export function buildAgentTools(opts: AgentToolOptions = {}): AnyTool[] {
	const tools: AnyTool[] = [createSearchCourseTool() as unknown as AnyTool];
	if (opts.bash) {
		tools.push(createBashTool(opts.bash) as unknown as AnyTool);
	}
	return tools;
}
