<script lang="ts">
	/**
	 * A Part's closing test — the graded, unhinted sibling of LessonActivity.
	 *
	 * It is a SIBLING rather than a fork: the sandbox, the chips, the commit
	 * graph and the terminal are all GitPlayground, reached through
	 * `toScenario(challenge)`. What lives here is everything a challenge has
	 * and a playground does not — the terracotta chrome, and the verdict.
	 *
	 * Three rules the code enforces rather than merely intends:
	 *
	 *   1. NO HINT, AND THE BRIEF IS PRINTED ONCE. `toScenario` puts the brief
	 *      where the UI expects `hint`, so there is no second slot to fill and
	 *      nothing here offers one. That slot — one Puzzle icon and the prose,
	 *      directly above the terminal — is the SAME slot a playground puts
	 *      its hint in, which is why this header carries no icon of its own
	 *      and why GitPlayground does not echo the brief into the terminal
	 *      scrollback for a challenge. One brief, one icon, one place.
	 *   2. The pool is a KIT, not a walkthrough. GitPlayground labels the
	 *      chips accordingly once it knows this is a challenge.
	 *   3. The grade is FROZEN at the first passing check. Poking around after
	 *      you have solved it must never demote you.
	 */
	import { onMount } from 'svelte';
	import { Puzzle, RotateCcw } from 'lucide-svelte';
	// Type-only, so it is erased: the real module is still fetched lazily below.
	import type GitPlayground from '$lib/components/playground/GitPlayground.svelte';
	import type { AttemptScore, Challenge, ChallengeGrade } from '$lib/playground/challenges';
	import type { PlaygroundScenario } from '$lib/playground/scenarios';

	let {
		title,
		part,
		id
	}: {
		/** Card heading. Display copy — the sidebar reads its own label. */
		title: string;
		/** 1..9. Selects the challenge; everything else is derived from it. */
		part: number;
		/**
		 * The anchor. Load-bearing for deep links, the sidebar and scroll-spy —
		 * and unlike LessonActivity, this id IS the DOM anchor of the card.
		 */
		id: string;
	} = $props();

	interface Loaded {
		challenge: Challenge;
		scenario: PlaygroundScenario;
		Playground: typeof GitPlayground;
		score: (history: readonly string[]) => AttemptScore;
		grade: (history: readonly string[], solved: boolean) => ChallengeGrade;
	}

	let retryKey = $state(0);
	let resetFn = $state<(() => void) | null>(null);
	let bundle = $state<Promise<Loaded> | null>(null);

	/** The frozen verdict. Null until `check()` first passes; cleared on reset. */
	let verdict = $state<{ grade: ChallengeGrade; score: AttemptScore } | null>(null);
	/** The economical cost, for the gap an 'acceptable' solve should be able to see. */
	let par = $state(0);
	/** The canonical route, revealed after the verdict. */
	let greatPath = $state<{ note: string; lines: string[] } | null>(null);

	// Each challenge seeds its own sandbox repo — and, unlike a playground,
	// its seed ships inside a module that would otherwise pull all nine into
	// the page bundle. So the import waits for the viewport too, not just the
	// mount: nothing about challenge 9 is downloaded while you read Part 1.
	let visible = $state(false);
	let rootEl: HTMLElement | undefined = $state(undefined);

	async function load(): Promise<Loaded> {
		const [challenges, playground] = await Promise.all([
			import('$lib/playground/challenges'),
			import('$lib/components/playground/GitPlayground.svelte')
		]);
		const challenge = challenges.challengeForPart(part);
		if (!challenge) throw new Error(`no challenge is registered for part ${part}`);
		if (challenge.id !== id) {
			throw new Error(`part ${part}'s challenge is "${challenge.id}", but the anchor says "${id}"`);
		}
		const free = challenges.effectiveFreeSet(challenge);
		par = challenges.greatCostOf(challenge);
		greatPath = { note: challenge.scoring.great.note, lines: challenge.scoring.great.lines };
		return {
			challenge,
			scenario: challenges.toScenario(challenge),
			Playground: playground.default,
			score: (history) => challenges.scoreHistory(history, free),
			grade: (history, solved) => challenges.gradeAttempt(challenge, history, solved)
		};
	}

	function start() {
		bundle = load();
	}

	onMount(() => {
		if (!rootEl || typeof IntersectionObserver === 'undefined') {
			visible = true;
			start();
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					visible = true;
					start();
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(rootEl);
		return () => observer.disconnect();
	});

	/**
	 * The only channel out of the sandbox. An empty history means the seed was
	 * just (re)laid, which is the one event that clears a frozen verdict — a
	 * retry genuinely is a new attempt.
	 */
	function onProgress(loaded: Loaded, state: { history: readonly string[]; solved: boolean }) {
		if (state.history.length === 0) {
			verdict = null;
			return;
		}
		if (verdict || !state.solved) return;
		verdict = {
			grade: loaded.grade(state.history, true),
			score: loaded.score(state.history)
		};
	}

	function retry() {
		verdict = null;
		resetFn?.();
	}

	const accent = 'var(--color-challenge)';
	/** A great solve earns the lifted success green; an acceptable one keeps
	 *  the challenge terracotta, because it is still a solve on its own terms.
	 *  Brightness and fill carry the difference — never hue alone. */
	const verdictAccent = $derived(
		verdict?.grade === 'great' ? 'var(--color-earned-bright)' : 'var(--color-challenge)'
	);
</script>

<div
	class="my-6"
	{id}
	data-challenge-activity={id}
	data-activity-kind="challenge"
	style="--activity-accent: {accent};"
	bind:this={rootEl}
>
	<div class="activity-header">
		<!-- No icon here. The card's one icon lives beside the brief below,
		     exactly where a playground puts its own — see the header note. -->
		<span class="text-sm font-semibold" style="color: {accent};">
			<span class="sr-only">Challenge:</span>
			{title}
		</span>
		<button
			type="button"
			onclick={retry}
			disabled={!resetFn}
			class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
			style="color: var(--color-text-muted);"
			aria-label="Reset challenge"
		>
			<RotateCcw size={13} />
			Reset
		</button>
	</div>

	<div class="activity-panel">
		{#if !visible || !bundle}
			<div
				class="placeholder flex items-center justify-center p-8"
				style="color: var(--color-text-muted);"
			>
				<p class="text-sm">Loading challenge...</p>
			</div>
		{:else}
			{#key retryKey}
				{#await bundle}
					<div
						class="placeholder flex items-center justify-center p-8"
						style="color: var(--color-text-muted);"
					>
						<p class="text-sm">Loading challenge...</p>
					</div>
				{:then loaded}
					<div class="[&>div]:rounded-none">
						<loaded.Playground
							scenarioId={loaded.challenge.id}
							customScenario={loaded.scenario}
							embedded
							hideHeader
							{id}
							kind="challenge"
							showScenarioPicker={false}
							onResetReady={(fn) => (resetFn = fn)}
							onProgress={(state) => onProgress(loaded, state)}
						/>
					</div>
				{:catch error}
					<div class="p-6 text-center">
						<p class="text-sm" style="color: var(--color-warning);">
							Failed to load challenge: {error?.message ?? 'Unknown error'}
						</p>
						<button
							type="button"
							onclick={() => {
								retryKey++;
								start();
							}}
							class="mt-2 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
							style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
						>
							Retry
						</button>
					</div>
				{/await}
			{/key}
		{/if}
	</div>

	{#if verdict}
		<!-- The verdict. It sits OUTSIDE the sandbox panel on purpose: the
		     terminal already said the goal was reached, and this is the
		     separate question of what it cost you. -->
		<div class="verdict" style="--verdict-accent: {verdictAccent};" role="status">
			<p class="verdict-line">
				<Puzzle size={14} aria-hidden="true" />
				{#if verdict.grade === 'great'}
					<!-- No number in this line. Par is the MAX across the canonical
					     route and its alternates, so an economical solve is often
					     UNDER par — and "solved for 2, which is par" next to "par is
					     4" is the kind of sentence that makes a reader distrust the
					     whole scoreboard. The figures live below. -->
					<strong>Great.</strong> You found the short way — the one the Part was teaching.
				{:else}
					<strong>Solved.</strong> That is a real solve — and there is a shorter way.
				{/if}
			</p>

			<p class="verdict-cost">
				Your cost: <strong>{verdict.score.cost}</strong>
				&mdash; {verdict.score.enters}
				{verdict.score.enters === 1 ? 'Enter press' : 'Enter presses'} plus
				{verdict.score.elements}
				{verdict.score.elements === 1 ? 'command element' : 'command elements'}. Par is
				<strong>{par}</strong>. Looking costs nothing; only the commands that change the repository
				count.
			</p>

			{#if verdict.grade === 'great' && greatPath}
				<p class="verdict-note">{greatPath.note}</p>
			{:else if greatPath}
				<details class="verdict-reveal">
					<summary>Show the economical route</summary>
					<p class="verdict-note">{greatPath.note}</p>
					<pre class="verdict-lines">{greatPath.lines.join('\n')}</pre>
				</details>
				<button type="button" class="verdict-retry" onclick={retry}>
					<RotateCcw size={12} />
					Reset and try for par
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.activity-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 1.25rem;
		border: 1px solid color-mix(in srgb, var(--activity-accent) 55%, var(--color-border));
		border-bottom: none;
		border-radius: 0.75rem 0.75rem 0 0;
		background: transparent;
	}

	.activity-panel {
		overflow: hidden;
		border-radius: 0 0 0.75rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--activity-accent) 55%, var(--color-border));
		border-top: none;
	}

	/* Match the loaded playground's height so materializing it doesn't
	   shift everything below (which breaks in-flight scrolls). */
	.placeholder {
		min-height: 500px;
	}

	.verdict {
		margin-top: 0.75rem;
		padding: 0.875rem 1.25rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--verdict-accent) 45%, var(--color-border));
		background: color-mix(in srgb, var(--verdict-accent) 7%, var(--color-bg-secondary));
	}

	.verdict-line {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 13px;
		line-height: 1.5;
		color: var(--verdict-accent);
	}

	.verdict-line :global(svg) {
		flex-shrink: 0;
		align-self: center;
	}

	.verdict-cost {
		margin-top: 0.4rem;
		font-size: 12px;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.verdict-note {
		margin-top: 0.4rem;
		font-size: 12px;
		line-height: 1.6;
		font-style: italic;
		color: var(--color-text-secondary);
	}

	.verdict-reveal {
		margin-top: 0.5rem;
	}

	.verdict-reveal summary {
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		color: var(--verdict-accent);
	}

	.verdict-lines {
		margin-top: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-terminal-bg);
		color: var(--color-terminal-command);
		font-family: var(--font-mono);
		font-size: 11.5px;
		line-height: 1.6;
		overflow-x: auto;
	}

	.verdict-retry {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.6rem;
		cursor: pointer;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--verdict-accent) 45%, transparent);
		background: transparent;
		padding: 0.3rem 0.7rem;
		font-size: 11.5px;
		font-weight: 600;
		color: var(--verdict-accent);
		transition: background 0.15s ease;
	}

	.verdict-retry:hover {
		background: color-mix(in srgb, var(--verdict-accent) 12%, transparent);
	}
</style>
