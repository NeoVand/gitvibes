/**
 * The deterministic mock backend: a scripted guide that answers by quoting
 * the course itself. No model, no weights, no network — retrieval picks the
 * sections, fixed templates compose the reply, and every claim carries a
 * `[[section-x-y]]` citation the panel renders as a link chip.
 *
 * The real transformers.js local backend lands next phase behind the same
 * `AgentBackend` interface; nothing above this file will change.
 */
import type {
	AgentBackend,
	ChatMessage,
	CliRunOptions,
	GenerateOptions,
	SuggestContext,
	SuggestOptions,
	ToolCall
} from './types';
import { retrieve, type RetrievalHit } from './retrieval';
import { suggestionTopic } from './suggestions';

/** Below this score the mock refuses to bluff and says so. */
const CONFIDENT_SCORE = 3;

interface ToolPlan {
	/** The proposal matches when every keyword appears in the goal. */
	keywords: string[];
	cmds: string[];
	summary: string;
}

/** Tiny goal → script table for the tool loop and mock CLI sessions.
 *  First match wins, so the more specific 'backup' outranks 'notes'
 *  ("make a backup of my notes" must pick the backup plan). */
const TOOL_PLANS: ToolPlan[] = [
	{
		keywords: ['branch'],
		cmds: ['git status', 'git switch -c agent/experiment', 'git log --oneline -n 3'],
		summary: 'Created and switched to agent/experiment.'
	},
	{
		keywords: ['commit'],
		cmds: [
			"echo 'agent was here' > agent-notes.md",
			'git add agent-notes.md',
			'git commit -m "docs: add agent notes"'
		],
		summary: 'Committed agent-notes.md with a conventional message.'
	},
	{
		keywords: ['tag'],
		cmds: ['git log --oneline -n 3', 'git tag -a v0.1.0 -m "Release v0.1.0"', 'git tag'],
		summary: 'Tagged HEAD as v0.1.0 (annotated).'
	},
	{
		keywords: ['inspect'],
		cmds: ['git status', 'git log --oneline -n 5', 'git branch'],
		summary: 'Inspected the repo: working tree, recent history, branches.'
	}
];

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function lastUserMessage(messages: ChatMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') return messages[i].content;
	}
	return '';
}

/** Tool results appended since the last user message = completed steps. */
function completedSteps(messages: ChatMessage[]): number {
	let count = 0;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') break;
		if (messages[i].role === 'tool') count++;
	}
	return count;
}

/**
 * Curated lessons for the sections learners actually ask about: each one
 * answers the QUESTION first — concrete explanation, runnable example,
 * gotcha — instead of pointing at where the answer lives. Distilled from the
 * course sections they cite.
 */
interface Lesson {
	explain: string;
	example?: string;
	gotcha?: string;
}

const SECTION_LESSONS: Record<string, Lesson> = {
	'section-2-1': {
		explain:
			'`git status` is your heads-up display: it shows exactly what changed since the last commit, split into three groups — staged (going into the next commit), modified but not staged, and untracked (files Git has never seen). Run it before and after every other Git command until reading it is a reflex.',
		example: 'git status',
		gotcha:
			'After an AI assistant touches your project, `git status` is the fastest honest answer to "what did it just do?" — read it before you stage anything.'
	},
	'section-2-2': {
		explain:
			'Staging is choosing what goes into the next commit. `git add <file>` stages one file, `git diff` shows unstaged edits, and `git diff --staged` shows what the next commit will contain. `git add -p` walks the changes hunk by hunk so you approve each piece.',
		example: 'git status\ngit diff\ngit add -p',
		gotcha:
			'Blind `git add .` is how secrets and debug junk end up in history — review the diff first, stage what you trust.'
	},
	'section-2-3': {
		explain:
			'A commit is a permanent save point of everything staged, with a message. Follow Conventional Commits — `feat:`, `fix:`, `chore:` — so both humans and tooling can read your history; the message body explains *why*, not what.',
		example: 'git commit -m "feat: add csv export"',
		gotcha:
			'Commit small and often — a commit that does one thing is easy to revert, cherry-pick, or bisect; a "big everything" commit is none of those.'
	},
	'section-3-1': {
		explain:
			'A branch is a movable label on a commit — a parallel timeline that shares history with `main` until it diverges. `git switch -c <name>` creates and switches in one move; nothing you commit there can hurt `main` until you deliberately merge it.',
		example: 'git switch -c feature/my-idea',
		gotcha:
			'Branch BEFORE the experiment, not after. Committing AI work straight to main is the #1 mess this course teaches you to avoid (and to fix).'
	},
	'section-3-2': {
		explain:
			'`git fetch` downloads what the remote has without touching your work; `git pull` is fetch plus merge — download and incorporate. "Your branch is behind origin/main" just means the remote copy has commits your local branch has not seen yet.',
		example: 'git fetch origin\ngit merge origin/main',
		gotcha:
			'Fetch-then-merge is the two-step version of pull — it lets you LOOK at what came down (`git log --oneline --all`) before merging it.'
	},
	'section-4-4': {
		explain:
			'`git reset` moves your branch pointer back in time. `--soft` keeps the changes staged, `--mixed` (default) keeps them in the working tree, and `--hard` throws them away entirely. Safe on commits that exist only on your machine.',
		example: 'git reset --soft HEAD~1',
		gotcha:
			'Never reset a PUSHED commit — that rewrites shared history. For public mistakes the tool is `git revert`, which undoes by adding a new commit.'
	},
	'section-4-5': {
		explain:
			'`git revert <hash>` creates a NEW commit that is the exact inverse of an old one — the mistake and its undo both stay in history. That is why it is the only safe undo for commits that were already pushed: nobody\u2019s copy of history is rewritten.',
		example: 'git log --oneline\ngit revert --no-edit a1b2c3d\ngit push',
		gotcha: 'Reset rewrites, revert appends. Public code gets revert, every time.'
	},
	'section-4-9': {
		explain:
			'The reflog is Git\u2019s diary of every place HEAD has been — commits, resets, checkouts, rebases. Even after a `reset --hard`, the "lost" commits are still in the reflog for weeks; find the entry from before the damage and reset back to it.',
		example: 'git reflog\ngit reset --hard HEAD@{1}',
		gotcha:
			'`git log` shows only what is reachable; `git reflog` shows where you have BEEN. If work seems gone, check the reflog before you panic.'
	},
	'section-5-2': {
		explain:
			'`git rebase main` lifts your branch\u2019s commits off their old starting point and replays them, one by one, on top of the latest main — as if you had started your work today. History stays a straight line, unlike `git merge`, which ties the two timelines together with a merge commit. The code ends up identical either way; what differs is the shape of history.',
		example: 'git fetch origin\ngit rebase origin/main',
		gotcha:
			'Rebase REWRITES your commits (new hashes), so only rebase branches you alone own — and never rewrite history that was already pushed and shared.'
	},
	'section-5-1': {
		explain:
			'`git stash` shelves your uncommitted changes so you can switch branches with a clean tree, then `git stash pop` brings them back. `-u` takes untracked files along; `-m` labels the stash so future-you knows what it holds.',
		example: 'git stash push -u -m "WIP: refactor"\ngit switch main\n# ...later...\ngit stash pop',
		gotcha:
			'Stashes are easy to forget — `git stash list` shows the shelf, and a stash older than a day usually deserves to become a real commit on a branch.'
	},
	'section-5-3': {
		explain:
			'A merge conflict means both sides edited the same lines and Git refuses to guess. The file gets `<<<<<<<`, `=======`, `>>>>>>>` markers around the two versions — delete the markers, keep the right code, `git add` the file, and commit to finish the merge.',
		example:
			'git status\n# edit the conflicted file, then:\ngit add src/model.py\ngit commit -m "fix: resolve merge conflict"',
		gotcha:
			'Lost mid-merge? `git merge --abort` returns everything to the moment before the merge — a guilt-free escape hatch.'
	},
	'section-4-6': {
		explain:
			'`git push --force-with-lease` replaces the remote branch with your local history — but ONLY if the remote still looks the way you last saw it, so a teammate\u2019s new commits are never silently destroyed. It is the safe force for your own rebased feature branches.',
		example: 'git push --force-with-lease origin feature/x',
		gotcha:
			'Plain `--force` overwrites unconditionally. Never force-push any shared branch — and main, never at all.'
	}
};

/** Scripted terminal demonstrations, driven through the real approval gate. */
interface Demo {
	match: RegExp;
	intro: string;
	cmds: string[];
	wrap: string;
	citations: string[];
}

const DEMOS: Demo[] = [
	{
		match: /^demo:\s*status\b/i,
		intro:
			"Let me show you in my terminal below — I'll read the repo's state, then look at the actual edits. You approve each command before it runs.",
		cmds: ['git status', 'git diff'],
		wrap: 'That is the whole safety loop opening move: `git status` names WHAT changed, `git diff` shows exactly HOW. Nothing gets staged until you have read both.',
		citations: ['section-2-1', 'section-2-2']
	},
	{
		match: /^demo:\s*commit/i,
		intro:
			"Watch the terminal — my sandbox has a modified file, and I'll walk it through stage → commit → proof.",
		cmds: [
			'git add src/greet.py',
			'git commit -m "feat: friendlier greeting"',
			'git log --oneline -n 2'
		],
		wrap: 'Stage, commit with a Conventional Commit message, then `git log --oneline` to see the new save point sitting on top. That rhythm is the core of the whole course.',
		citations: ['section-2-2', 'section-2-3']
	},
	{
		match: /^demo:\s*sandbox/i,
		intro: "Let's peek at my sandbox repo — the history and the branches, in two quick commands.",
		cmds: ['git log --oneline', 'git branch'],
		wrap: 'That is my whole world: a tiny history with real `feat:`/`fix:` commits and a `feature/ideas` side branch. Ask me to demonstrate any command against it — there is a modified file and an untracked one waiting for a status demo.',
		citations: ['section-2-1', 'section-3-1']
	}
];

/** Compose a teaching answer: explanation first, example, gotcha — then cite. */
function composeAnswer(question: string, hits: RetrievalHit[]): string {
	if (hits.length === 0) {
		return (
			"That topic isn't covered in the course, and I won't guess — " +
			'right now I answer strictly from the lessons. Try asking about ' +
			'a command from the cheat sheet, like `git revert`, branches, or rebase.'
		);
	}

	const [top, ...rest] = hits;
	if (top.score < CONFIDENT_SCORE) {
		return (
			"That one isn't really covered in the course, so I won't make " +
			`something up. The closest lesson is "${top.title}" [[${top.id}]] — ` +
			'it may still point you in the right direction.'
		);
	}

	const related = rest.filter((h) => h.score >= top.score * 0.35).slice(0, 2);

	// Part intros often outrank their own child sections ("how do pipes
	// work" → part-4 before section-4-2); the curated lesson may live on any
	// of the strong hits, so pick the first one that has it.
	const strong = [top, ...related];
	const lessonHit = strong.find((h) => SECTION_LESSONS[h.id]) ?? top;
	const citations = [lessonHit.id, ...strong.filter((h) => h.id !== lessonHit.id).map((h) => h.id)];
	const citationLine = citations.map((id) => `[[${id}]]`).join(' ');

	const lesson = SECTION_LESSONS[lessonHit.id];
	if (lesson) {
		const parts = [lesson.explain];
		if (lesson.example) parts.push('```bash\n' + lesson.example + '\n```');
		if (lesson.gotcha) parts.push(`**Heads up:** ${lesson.gotcha}`);
		parts.push(citationLine);
		return parts.join('\n\n');
	}

	// No curated lesson: teach from the chunk itself — its own sentences,
	// never a "the course covers this in…" meta-line.
	return `${top.snippet}\n\n${citationLine}`;
}

export class MockBackend implements AgentBackend {
	readonly name = 'mock';

	async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<void> {
		const { onEvent, signal } = opts;
		const instant = opts.instant || import.meta.env.MODE === 'test';

		if (signal?.aborted) return;

		if (opts.tools) {
			this.#generateToolStep(messages, opts);
			return;
		}

		const question = lastUserMessage(messages);

		// Scripted terminal demonstrations: the deterministic harness for the
		// full propose → gate → execute → result loop (drives the e2e tests).
		const demo = opts.bash ? DEMOS.find((d) => d.match.test(question)) : null;
		if (demo && opts.bash) {
			await this.#runDemo(demo, opts, instant);
			return;
		}

		const answer = composeAnswer(question, retrieve(question, 3));
		await this.#stream(answer, opts, instant);
		if (signal?.aborted) return;
		onEvent({ type: 'doneTurn' });
	}

	/**
	 * Deterministic contextual suggestions: the same four templates around the
	 * topic of wherever the learner is reading, streamed as numbered lines the
	 * way the local model would — so unit and e2e tests cover the exact parse
	 * → chip flow without any weights.
	 */
	async suggest(ctx: SuggestContext, opts: SuggestOptions): Promise<void> {
		const instant = opts.instant || import.meta.env.MODE === 'test';
		const topic = suggestionTopic(ctx.label);
		const text =
			[
				`1. Can you explain ${topic} in plain words?`,
				`2. What's the most common ${topic} mistake?`,
				`3. When would I actually use ${topic}?`,
				`4. Show me ${topic} live in your terminal.`
			].join('\n') + '\n';
		for (const word of text.match(/\S+\s*/g) ?? []) {
			if (opts.signal?.aborted) return;
			opts.onToken(word);
			if (!instant) await sleep(14);
		}
	}

	/**
	 * Deterministic CLI session for `agent "<task>"`: walk the matching
	 * scripted plan, proposing each command through the terminal's gate —
	 * exactly the propose → verdict → execute contract of the local backend,
	 * so the session machine and the e2e tests exercise the real flow.
	 */
	async generateCli(task: string, opts: CliRunOptions): Promise<void> {
		const { onEvent, signal, bash } = opts;
		const instant = opts.instant || import.meta.env.MODE === 'test';
		if (signal?.aborted) return;

		const stream = (text: string) => this.#stream(text, opts, instant);
		const goal = task.toLowerCase();
		const plan = TOOL_PLANS.find((p) => p.keywords.every((k) => goal.includes(k)));
		if (!plan) {
			await stream(
				'Demo mode only knows a few scripted tasks — try one mentioning a "branch", a "commit", a "tag", or ask me to "inspect" the repo.\n'
			);
			if (signal?.aborted) return;
			onEvent({
				type: 'toolCall',
				call: {
					id: 'call-done',
					name: 'done',
					args: { summary: 'No scripted plan for that goal (demo mode).' }
				}
			});
			onEvent({ type: 'doneTurn' });
			return;
		}

		await stream(
			`On it. I'll work in ${plan.cmds.length} steps — each command waits for your go-ahead.\n`
		);

		let ran = 0;
		for (const cmd of plan.cmds) {
			if (signal?.aborted) return;
			onEvent({ type: 'toolCall', call: { id: `call-${ran + 1}`, name: 'bash', args: { cmd } } });
			const verdict = await bash.propose(cmd);
			if (signal?.aborted) return;
			if (verdict.decision === 'deny') {
				await stream(`Okay — skipping \`${cmd}\` and moving on.\n`);
				continue;
			}
			await bash.run(verdict.cmd);
			ran++;
		}
		if (signal?.aborted) return;
		onEvent({
			type: 'toolCall',
			call: {
				id: 'call-done',
				name: 'done',
				args: { summary: ran > 0 ? plan.summary : 'Nothing was run — every command was denied.' }
			}
		});
		onEvent({ type: 'doneTurn' });
	}

	async #stream(text: string, opts: GenerateOptions, instant: boolean): Promise<void> {
		// Stream word by word, keeping whitespace (incl. newlines) attached.
		for (const word of text.match(/\S+\s*/g) ?? []) {
			if (opts.signal?.aborted) return;
			opts.onEvent({ type: 'token', text: word });
			if (!instant) await sleep(14);
		}
	}

	/** Propose each scripted command through the gate, run what's approved. */
	async #runDemo(demo: Demo, opts: GenerateOptions, instant: boolean): Promise<void> {
		const { onEvent, signal } = opts;
		const bash = opts.bash!;

		await this.#stream(`${demo.intro}\n\n`, opts, instant);

		let ran = 0;
		for (const cmd of demo.cmds) {
			if (signal?.aborted) return;
			onEvent({
				type: 'toolCall',
				call: { id: `call-${ran + 1}`, name: 'bash', args: { cmd } }
			});
			const verdict = await bash.propose(cmd);
			if (signal?.aborted) return;
			if (verdict.decision === 'deny') {
				await this.#stream(
					`Skipping \`${cmd}\` — you said no${verdict.reason ? ` (${verdict.reason})` : ''}. `,
					opts,
					instant
				);
				continue;
			}
			await bash.run(verdict.cmd);
			ran++;
		}

		const wrap =
			ran > 0
				? `${demo.wrap}\n\n${demo.citations.map((id) => `[[${id}]]`).join(' ')}`
				: `No problem — nothing was run. Whenever you're curious, ask again and approve the commands to watch them work. ${demo.citations.map((id) => `[[${id}]]`).join(' ')}`;
		await this.#stream(`\n\n${wrap}`, opts, instant);
		if (signal?.aborted) return;
		onEvent({ type: 'doneTurn' });
	}

	/**
	 * One step of the standard tool loop per generate() call: emit the next
	 * bash call and yield; the caller runs it (through the approval gate),
	 * appends the tool result, and re-invokes generate. When the script is
	 * exhausted, emit `done` with a summary.
	 */
	#generateToolStep(messages: ChatMessage[], opts: GenerateOptions): void {
		const { onEvent, signal } = opts;
		const goal = lastUserMessage(messages).toLowerCase();
		const plan = TOOL_PLANS.find((p) => p.keywords.every((k) => goal.includes(k)));

		const emit = (call: ToolCall) => {
			if (signal?.aborted) return;
			onEvent({ type: 'toolCall', call });
			onEvent({ type: 'doneTurn' });
		};

		if (!plan) {
			emit({
				id: 'call-done',
				name: 'done',
				args: { summary: "I don't have a scripted plan for that goal yet (mock runtime)." }
			});
			return;
		}

		const step = completedSteps(messages);
		if (step < plan.cmds.length) {
			emit({ id: `call-${step + 1}`, name: 'bash', args: { cmd: plan.cmds[step] } });
		} else {
			emit({ id: 'call-done', name: 'done', args: { summary: plan.summary } });
		}
	}
}
