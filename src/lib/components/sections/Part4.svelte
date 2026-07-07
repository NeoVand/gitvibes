<script lang="ts">
	import {
		Undo2,
		Trash2,
		MinusCircle,
		PenLine,
		RotateCcw,
		AlertTriangle,
		Table,
		Compass,
		History
	} from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';

	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-4" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Undo2}
			partLabel="Part 4"
			title="The &quot;Undo&quot; Toolkit: Reversing AI Mistakes"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"The AI will break things. Your job isn't to prevent that — it's to recover instantly."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			No matter how good your AI assistant is, it will occasionally hallucinate, delete the wrong
			file, or introduce a subtle bug. Git gives you a full spectrum of undo tools — from gentle
			nudges to nuclear resets. Knowing which tool to reach for in each situation is what separates
			a confident developer from a panicked one.
		</p>

		<div class="my-6">
			<ExpandableImage
				src="{base}/images/undo.webp"
				alt="Undo — choose the least destructive tool that solves the problem"
				caption="Choose the least destructive tool that solves the problem"
			/>
		</div>

		<Callout type="important">
			This is the most critical section. The AI will misunderstand a prompt, generate buggy code, or
			delete something important. Your value as an engineer is your <strong
				>ability to recover instantly and safely</strong
			>.
		</Callout>

		<!-- 4.1 Discard Local -->
		<div id="section-4-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Trash2}
				title="4.1 &quot;Discard This Mess&quot; (Local, Not Committed)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				The AI just rewrote half your file and it's completely wrong. You haven't committed anything
				yet. This is the simplest undo — just throw it all away and go back to your last save point.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-restore.webp"
					alt="git restore . — discard local changes and return to a clean working directory"
					caption="Discard local edits and return to the last committed state"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> The AI modified files and the result is completely wrong. You haven't
				staged or committed. You want to revert to your last save point.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The fix is simple -- one command wipes the slate clean and takes you back to your last
				commit:
			</p>

			<CodeBlock
				title="Discard changes"
				code={`git restore .              # Discard edits to tracked files
git restore src/bad_file.py  # Discard a single file`}
			/>

			<p class="mt-3 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				One blind spot: <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git restore</code
				>
				only rewinds files Git already tracks. <em>Brand-new</em> files the AI scaffolded are
				untracked, so they survive it. Preview the leftovers with
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git clean -n</code
				>
				(a dry run), then delete them with
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git clean -fd</code
				>.
			</p>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				And one more trick for the road — restore doesn't have to stop at "the last commit." The
				most common real-world rescue is <em>one file, from an older commit</em>: the AI broke
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>src/parser.py</code
				>
				three commits ago and you only just noticed. No reset, no history surgery:
			</p>

			<CodeBlock
				title="Pull one file back from the past"
				code={`git restore --source=HEAD~3 src/parser.py
# The file's content is now as it was 3 commits ago;
# everything else stays untouched. Review it, then commit.`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, you don't need the terminal for this. In the Source Control panel, hover over
				the file you want to discard under "Changes" and click the <strong>curved arrow</strong>
				icon. To discard ALL changes at once, click the curved arrow next to the "Changes" header. You
				can also right-click any file and choose <strong>"Discard Changes"</strong>.
			</p>

			<Callout type="caution">
				This is a "dangerous" command: your local changes are gone forever. But in this case, that's
				exactly what you want.
			</Callout>

			<VibeBox
				prompts={[
					'That last change broke everything — throw it all away and go back to my last commit',
					"Discard all the changes you just made, they're not working"
				]}
			/>
		</div>

		<!-- 4.2 Unstage -->
		<div id="section-4-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={MinusCircle}
				title="4.2 &quot;I Staged This by Accident&quot; (Staged, Not Committed)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You hit <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				> a bit too quickly and staged files you didn't mean to include. No worries — unstaging is completely
				harmless and doesn't touch your code.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-restore-staged.webp"
					alt="git restore --staged — move files out of the staging area without losing your edits"
					caption="Unstage files without losing your edits — a gentle undo"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You used
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				>
				and accidentally staged a file with a bad AI change. You need to "unstage" it.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				No worries -- unstaging is a safe operation that simply moves a file back out of the staging
				area:
			</p>

			<CodeBlock
				title="Unstage a file"
				code={`git restore --staged src/bad_file.py
# Older equivalent: git reset HEAD src/bad_file.py`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, this is a one-click fix. In the Source Control panel, look under <strong
					>"Staged Changes"</strong
				>, hover over the file you want to unstage, and click the <strong>−</strong> (minus) button. The
				file moves right back to "Changes":
			</p>

			<VsCodeScreenshot
				src="staging-commits/unstage-changes.png"
				alt="VS Code Source Control panel showing the unstage button (minus icon) on a staged file"
				caption="Click the − button next to any staged file to unstage it. It moves back to the 'Changes' section."
			/>

			<h4
				id="accidental-stage"
				class="mt-8 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Unstage Dangerous Files
			</h4>
			<PlaygroundNote>
				You ran <code>git add .</code> too quickly and staged <code>.env</code> with credentials and
				a debug file. Unstage them with <code>git restore --staged</code> before committing — then
				remember the permanent fix from Part 2: add them to <code>.gitignore</code> so the next
				<code>git add .</code> can't stage them again.
			</PlaygroundNote>
			<LessonActivity
				title="Unstage Secrets & Debug Files"
				scenarioId="accidental-stage"
				id="accidental-stage"
			/>

			<VibeBox
				prompts={[
					"Unstage config.py, I don't want that in this commit",
					'I accidentally staged everything — unstage all files except auth.py'
				]}
			/>
		</div>

		<!-- 4.3 Amend -->
		<div id="section-4-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={PenLine}
				title="4.3 &quot;I Forgot a File in My Last Commit&quot;"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You just committed — and immediately realized you forgot a file, or there's a typo in the
				message. Instead of creating a messy "oops" commit, you can quietly fix the last one.
			</p>

			<Callout type="note">
				<strong>The Problem:</strong> You just committed but missed a file, or there's a typo in
				your commit message. The commit has <strong>not been pushed yet</strong>.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Instead of creating a whole new commit, you can tack the missing file onto the one you just
				made:
			</p>

			<CodeBlock
				title="Amend the last commit"
				code={`git add src/forgotten_file.py   # Stage the missed file
git commit --amend --no-edit     # Add it to the last commit

# Or just fix the message:
git commit --amend`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, click the <strong>dropdown arrow</strong> next to the Commit button and select
				<strong>"Commit (Amend)"</strong>. This adds your newly staged files to the last commit
				without needing the terminal. You can also find this under the <strong>...</strong> menu →
				Commit → <strong>Commit Staged (Amend)</strong>.
			</p>

			<Callout type="warning">
				This rewrites your last commit. Amending is safe when <strong
					>nobody else could have based work on that commit</strong
				>
				— either it was never pushed, or it lives on your own personal branch and you follow up with a
				careful
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>--force-with-lease</code
				> push (see section 4.6). If teammates may have pulled the commit, don't amend — revert instead.
			</Callout>

			<VibeBox
				prompts={[
					'I forgot to include the test file in my last commit — add it without creating a new commit',
					"Fix my last commit message, it should say 'fix' not 'feat'"
				]}
			/>
		</div>

		<!-- 4.4 Reset -->
		<div id="section-4-4" class="mb-14">
			<SectionHeader
				level="section"
				icon={RotateCcw}
				title="4.4 &quot;Nuke This Whole Feature&quot; (Locally, Committed)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Sometimes the AI experiment was a dead end — three commits deep, and none of it is
				salvageable. If you haven't pushed yet, you can erase those commits entirely and start
				fresh.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-reset.webp"
					alt="git reset — soft, mixed, and hard modes for rolling back local commits"
					caption="Three reset modes from gentle (soft) to nuclear (hard)"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> Your last three commits were a single bad AI experiment. You have
				not pushed them. You want to permanently delete them.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				This is where the nuclear option comes in. A hard reset rolls your branch back as if those
				commits never happened:
			</p>

			<CodeBlock
				title="Hard reset: destroy commits and changes"
				code="git reset --hard HEAD~3   # Remove last 3 commits + all changes"
			/>

			<p class="mt-3 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				"Remove," not quite "delete": the commits vanish from your branch, but Git keeps them around
				for ~30 days and the reflog (section 4.9) can bring them back. The truly unrecoverable loss
				is different — see the <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--hard</code
				> card below.
			</p>

			<h4 class="mt-6 mb-3 text-[14px] font-semibold" style="color: var(--color-text);">
				The "Safer" Resets
			</h4>

			<div class="mb-4 space-y-3">
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-important);">
						<code class="text-xs" style="font-family: var(--font-mono);">--soft</code>: Keep changes
						staged
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Deletes commits but keeps changes in the Staging Area. Useful for "squashing" commits
						into one.
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-warning);">
						<code class="text-xs" style="font-family: var(--font-mono);">--mixed</code> (default): Keep
						changes unstaged
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Deletes commits but keeps changes in the Working Directory (unstaged).
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-bg-secondary);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						<code class="text-xs" style="font-family: var(--font-mono);">--hard</code>: Destroy
						everything
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Removes commits AND all code changes. Your files reset to the older commit's state —
						including any <strong>uncommitted</strong> work sitting in your working tree, which is
						the one thing the reflog can <em>never</em> bring back. Run
						<code class="text-xs" style="font-family: var(--font-mono);">git status</code> first; if it
						isn't clean, stash or commit before you reset.
					</p>
				</div>
			</div>

			<Callout type="caution">
				<strong>CRITICAL:</strong>
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code
				>
				rewrites history. Never use this on a branch your teammates have already pulled. This is for
				<strong>local cleanup only</strong>.
			</Callout>

			<VibeBox
				prompts={[
					'The last 3 commits were all bad — nuke them but keep the code changes so I can redo it',
					'Completely undo my last 2 commits, I want to start fresh from before them'
				]}
			/>
		</div>

		<!-- 4.5 Revert -->
		<div id="section-4-5" class="mb-14">
			<SectionHeader
				level="section"
				icon={Undo2}
				title="4.5 &quot;I Pushed a Bug to the Team!&quot; (Public, Pushed)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				This is the "oh no" moment — you pushed a bad commit and your teammates already pulled it.
				You can't erase history, but you can create a new commit that perfectly reverses the damage.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-revert.webp"
					alt="git revert — undo a pushed commit safely with a new commit"
					caption="Revert creates a new commit that undoes the damage — safe for shared branches"
				/>
			</div>

			<Callout type="caution">
				<strong>The Problem:</strong> You pushed a bad AI-generated commit. It's on
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>. Your teammates have already pulled it.
			</Callout>

			<p class="mb-3" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-caution);">The WRONG Solution:</strong> You cannot use
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code
				>. It rewrites history that others have, causing repository divergence.
			</p>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-tip);">The RIGHT Solution:</strong> Create a new commit
				that undoes the bad commit. This is a <strong>revert</strong>.
			</p>

			<MermaidDiagram
				definition={`gitGraph
  commit id: "Good commit"
  commit id: "Bad commit (pushed!)"
  commit id: "Revert 'Bad commit'" type: REVERSE
  commit id: "Continue work"`}
				id="revert-visual"
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Here's how to create that revert commit in the terminal:
			</p>

			<CodeBlock
				title="Safely undo a pushed commit"
				code={`git log --oneline           # Find the hash: a1b2c3d
git revert --no-edit a1b2c3d # Create an inverse commit
git push                    # Push the revert`}
			/>

			<p class="mt-3 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				Without <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--no-edit</code
				>, Git opens your editor so you can customize the revert message — fine once you expect it,
				startling the first time (especially if that editor turns out to be vim).
			</p>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Notice that you're not erasing anything -- you're adding a new commit on top that reverses
				the damage:
			</p>

			<Callout type="important">
				The bad commit stays in history, but a new "revert" commit undoes its changes. This is safe
				because <strong>no history is deleted</strong>. The history clearly shows: "Feature was
				added" &rarr; "Feature was reverted."
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code has this built in too. Open the <strong>...</strong> menu in the Source Control panel
				-- this is your gateway to all advanced Git operations. From here you can access Commit, Changes,
				Pull, Push, Branch, Stash, and more:
			</p>

			<VsCodeScreenshot
				src="quickstart/pull-push-commands.png"
				alt="VS Code Source Control ellipsis menu showing Pull, Push, Commit, Stash, Branch, and other Git commands"
				caption="The ... menu is your Git command center. Look under Commit for Undo Last Commit, Commit (Amend), and other recovery options."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				For reverting pushed commits, use the <strong>Source Control Graph</strong>: right-click any
				commit and select <strong>"Revert Commit"</strong> to create the inverse commit safely.
			</p>

			<VibeBox
				prompts={[
					'I pushed a broken commit to main — safely undo it without rewriting history',
					'Revert commit a1b2c3d, it introduced a bug in production'
				]}
			/>
		</div>

		<!-- 4.6 Force Push -->
		<div id="section-4-6" class="mb-14">
			<SectionHeader
				level="section"
				icon={AlertTriangle}
				title="4.6 The &quot;Break Glass&quot; Command"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You rewrote local history with a reset or amend — and now Git refuses to push because local
				and remote have diverged. This is the emergency tool: a force push with a built-in safety
				net.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/force-with-lease.webp"
					alt="git push --force-with-lease — force push with a safety check against overwriting teammates' work"
					caption="Force push with --force-with-lease protects teammates' work"
				/>
			</div>

			<Callout type="warning">
				<strong>The Problem:</strong> You used
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git reset</code
				>
				or
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git commit --amend</code
				> on a branch you already pushed. Local and remote history have diverged. Git refuses to let you
				push.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				You have two flavors of force push, and picking the right one matters a lot:
			</p>

			<div class="mb-4 grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg p-4" style="background: var(--color-caution-bg);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-caution);">
						<code class="text-xs" style="font-family: var(--font-mono);">git push --force</code>
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Replaces the server unconditionally. If a teammate pushed in the last 5 minutes, you
						blow their commits off the server (they survive only in that teammate's local clone).
					</p>
				</div>
				<div class="rounded-lg p-4" style="background: var(--color-tip-bg);">
					<p class="mb-1 text-[13px] font-semibold" style="color: var(--color-tip);">
						<code class="text-xs" style="font-family: var(--font-mono);"
							>git push --force-with-lease</code
						>
					</p>
					<p class="text-xs" style="color: var(--color-text-secondary);">
						Conditional force push. Only succeeds if the remote branch hasn't changed since your
						last fetch. <strong>Always use this instead.</strong>
					</p>
				</div>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				One subtlety: the lease compares the remote against <strong
					style="color: var(--color-text);">what you last fetched</strong
				>
				— so run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git fetch</code
				> first, review what changed on the remote, and only then push.
			</p>

			<Callout type="caution">
				<strong>And one trap:</strong> anything that fetches in the background quietly renews the
				lease. VS Code's autofetch (<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git.autofetch</code
				>), GitLens, and other IDE tooling can fetch every minute — after which
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>--force-with-lease</code
				>
				passes even though you never <em>looked</em> at what arrived. The lease proves the remote hasn't
				changed since the last fetch — it can't prove you reviewed it. Fetch, read, then push.
			</Callout>
			<Callout type="caution">
				<strong>What does the error look like?</strong> When you try to push after rewriting
				history, Git will reject it with:
				<code
					class="mt-1 block rounded px-2 py-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>! [rejected] (non-fast-forward) — hint: Updates were rejected because the tip of your
					current branch is behind</code
				>
				This is Git protecting you. But careful — the full hint goes on to suggest
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git pull</code
				>, and after a deliberate amend or reset that's exactly wrong: pulling merges the old commit
				right back in, recreating the mess you just cleaned up. When <em>you</em> rewrote the history
				on purpose, the answer is the lease push, not a pull. Try it yourself below:
			</Callout>

			<h4
				id="force-push"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Reset and Force Push
			</h4>
			<PlaygroundNote>
				Your feature branch has two bad commits already pushed. Use <code
					>git reset --hard HEAD~2</code
				>
				to go back, watch a plain <code>git push</code> get rejected, then overwrite the remote with
				<code>git push --force-with-lease</code>. Never do this on shared branches!
			</PlaygroundNote>
			<LessonActivity title="Reset and Force Push" scenarioId="force-push" id="force-push" />

			<VibeBox
				prompts={[
					"I amended a commit I already pushed and now I can't push — help me fix it safely",
					"What's the safest way to force push after rewriting history on my branch?"
				]}
			/>
		</div>

		<!-- 4.7 Recovery Matrix -->
		<div id="section-4-7" class="mb-14">
			<SectionHeader
				level="section"
				icon={Table}
				title="4.7 The Git &quot;Undo&quot; Recovery Matrix"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/recovery-matrix.webp"
					alt="Recovery Matrix — match what went wrong to the least destructive Git undo command"
					caption="The recovery matrix — match your mistake to the right undo tool"
				/>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Before moving to advanced topics, here's a quick-reference matrix summarizing every undo
				technique and when to use it:
			</p>

			<div class="my-4 overflow-x-auto rounded-lg" style="background: var(--color-bg-secondary);">
				<table class="w-full text-xs">
					<thead>
						<tr style="background: var(--color-bg-tertiary);">
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>Scenario</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>Command</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>What It Does</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>Safe?</th
							>
							<th class="px-3 py-2.5 text-left font-semibold" style="color: var(--color-text);"
								>VS Code</th
							>
						</tr>
					</thead>
					<tbody style="color: var(--color-text-secondary);">
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">AI's change is bad, not committed</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git restore .</code></td
							>
							<td class="px-3 py-2"
								>Discards edits to tracked files (new untracked files survive — see git clean)</td
							>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Right-click file → "Discard Changes"</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">One file broke several commits ago</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);"
									>git restore --source=HEAD~3 &lt;file&gt;</code
								></td
							>
							<td class="px-3 py-2"
								>Brings back that file's old content; history and other files untouched</td
							>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Timeline → click old commit → copy the old version</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">File staged by accident</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);"
									>git restore --staged &lt;file&gt;</code
								></td
							>
							<td class="px-3 py-2">Unstages a file, moving it from Staging back to Changes</td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Right-click staged file → "Unstage Changes"</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Typo in last commit message</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git commit --amend</code></td
							>
							<td class="px-3 py-2">Edits the message of the most recent commit</td>
							<td class="px-3 py-2"
								><span style="color: var(--color-tip);">Safe (if not pushed yet)</span></td
							>
							<td class="px-3 py-2">... → Commit → Commit (Amend)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Forgot a file in last commit</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git add &lt;file&gt;</code><br /><code
									style="font-family: var(--font-mono);">git commit --amend --no-edit</code
								></td
							>
							<td class="px-3 py-2">Adds new files to the most recent commit</td>
							<td class="px-3 py-2"
								><span style="color: var(--color-tip);">Safe (if not pushed yet)</span></td
							>
							<td class="px-3 py-2">Stage files → ... → Commit Staged (Amend)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Last 3 local commits are bad</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git reset --hard HEAD~3</code></td
							>
							<td class="px-3 py-2"
								>Removes the last 3 commits and all their code changes (reflog can recover the
								commits)</td
							>
							<td class="px-3 py-2"
								><span style="color: var(--color-warning);">Local Only! (Rewrites history)</span
								></td
							>
							<td class="px-3 py-2">... → Commit → Undo Last Commit (once per commit)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Commits "vanished" after a hard reset</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git reflog</code><br /><code
									style="font-family: var(--font-mono);">git reset --hard HEAD@&#123;1&#125;</code
								></td
							>
							<td class="px-3 py-2"
								>Finds the lost commit in the reflog and moves the branch back</td
							>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Terminal only (see section 4.9)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Pushed a bug to the team</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git revert &lt;hash&gt;</code></td
							>
							<td class="px-3 py-2">Creates a new commit that is the inverse of the bad one</td>
							<td class="px-3 py-2"
								><span style="color: var(--color-tip);">100% Safe (Public)</span></td
							>
							<td class="px-3 py-2">Source Control Graph → Right-click commit → "Revert Commit"</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Reset a public branch, need to push</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git push --force-with-lease</code></td
							>
							<td class="px-3 py-2">Forcefully overwrites remote, only if no one else pushed</td>
							<td class="px-3 py-2"
								><span style="color: var(--color-caution);">Enterprise "Break Glass"</span></td
							>
							<td class="px-3 py-2">Git: Push (Force With Lease)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Stuck in "detached HEAD"</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git switch main</code><br /><code
									style="font-family: var(--font-mono);">git switch -c keep-this</code
								></td
							>
							<td class="px-3 py-2"
								>Reattaches HEAD to a branch — create one first if you made commits to keep (see
								section 4.8)</td
							>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Click the branch name in the status bar</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h4
				id="undo"
				class="mt-8 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: The Undo Toolkit
			</h4>
			<PlaygroundNote>
				The playground includes <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git revert HEAD</code
				>
				and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git commit --amend</code
				>. Try reverting the pushed bad commit, then amending after staging a fix.
			</PlaygroundNote>
			<LessonActivity title="Undo Operations" scenarioId="undo" id="undo" />
		</div>

		<!-- 4.8 Detached HEAD -->
		<div id="section-4-8" class="mb-14">
			<SectionHeader
				level="section"
				icon={Compass}
				title="4.8 Detached HEAD — Time Travel Safely"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You (or the agent) checked out an old commit hash to see how the code looked before a
				refactor — and the terminal barks back: <strong style="color: var(--color-text);"
					>"You are in 'detached HEAD' state."</strong
				> It sounds like an injury. It isn't. It's Git telling you exactly where you are: in the past.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/detached-head.webp"
					alt="Detached HEAD — HEAD pointing directly at an old commit instead of a branch"
					caption="Detached HEAD: you're standing on a commit, not riding a branch"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You ran
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git checkout a1b2c3d</code
				>
				(or
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git checkout HEAD~2</code
				>) to inspect an old version. Git warns about a "detached HEAD" and you're not sure if you
				broke something.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Normally, <strong style="color: var(--color-text);">HEAD points at a branch</strong>, and
				the branch moves forward with every commit. When you check out a commit hash directly, HEAD
				points at that <strong style="color: var(--color-text);">commit</strong> instead — no branch is
				along for the ride. Looking around is completely safe:
			</p>

			<CodeBlock
				title="Time-travel to inspect an old commit"
				code={`git log --oneline        # Find the commit you want to visit
git checkout HEAD~2      # Detach HEAD two commits back
cat src/app.py           # Look around — reading is 100% safe`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The catch is <strong style="color: var(--color-text);">committing</strong> while detached.
				Any commits you make there belong to no branch — the moment you switch away, nothing points
				at them anymore and they become <strong style="color: var(--color-text);">orphaned</strong>.
				They don't disappear instantly (the reflog still remembers them — see section 4.9), but they
				vanish from
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git log</code
				> and real Git will eventually garbage-collect them.
			</p>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				There are exactly two escape hatches, and choosing is easy:
			</p>

			<CodeBlock
				title="The two ways out"
				code={`# Made something worth keeping? Put a branch under your feet:
git switch -c inspect-v02

# Just sightseeing? Go back to the present:
git switch main`}
			/>

			<Callout type="tip">
				Think of detached HEAD as a <strong>read-only visit to the past</strong>. Inspect freely,
				run things, compare files. The instant you want to keep new work, run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git switch -c &lt;branch&gt;</code
				> — and even if you forget, the reflog is your safety net.
			</Callout>

			<h4
				id="detached-head"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Time-Travel and Escape
			</h4>
			<PlaygroundNote>
				Version 0.4 is misbehaving. Use <code>git checkout HEAD~2</code> to visit version 0.2,
				inspect <code>src/app.py</code>, then escape — <code>git switch -c inspect-v02</code> to
				keep a foothold, or <code>git switch main</code> to return to the present.
			</PlaygroundNote>
			<LessonActivity
				title="Try it: Time-travel and escape"
				scenarioId="detached-head"
				id="detached-head"
			/>

			<VibeBox
				prompts={[
					"Check out the commit from before yesterday's refactor so I can see how auth.py looked",
					"I'm in detached HEAD state and I made a commit here — save it to a new branch and take me back to main"
				]}
			/>
		</div>

		<!-- 4.9 Reflog -->
		<div id="section-4-9" class="mb-8">
			<SectionHeader
				level="section"
				icon={History}
				title="4.9 The Reflog — Your Time Machine"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				The agent ran <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git reset --hard</code
				>
				and the log now looks like two days of work never happened. Before you panic: those commits are
				<strong style="color: var(--color-text);">not gone</strong>. Git keeps a private journal of
				every place HEAD has ever been — the
				<strong style="color: var(--color-text);">reflog</strong> — and it's about to save your week.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-reflog.webp"
					alt="git reflog — a journal of every HEAD movement that lets you recover lost commits"
					caption="The reflog records every HEAD movement — commits, resets, checkouts, merges"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> A hard reset (or a botched rebase, or an agent gone rogue)
				erased commits from
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git log</code
				>. You need them back.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git log</code
				>
				only shows commits <strong style="color: var(--color-text);">reachable</strong> from your
				branches. The reflog shows
				<strong style="color: var(--color-text);">everywhere HEAD has moved</strong>, reachable or
				not. Here's how to read it:
			</p>

			<CodeBlock
				title="Anatomy of git reflog output"
				code={`git reflog

a9f8e21 HEAD@{0}: reset: moving to HEAD~2         <- where you are NOW
4c7d3b9 HEAD@{1}: commit: feat: add caching layer <- one move ago (the "lost" work!)
8e2f1a0 HEAD@{2}: commit: feat: add ranking algorithm
1d0c5f4 HEAD@{3}: commit (initial): Initial commit`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>{'HEAD@{n}'}</code
				>
				means "where HEAD was <em>n</em> moves ago" —
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>{'HEAD@{0}'}</code
				>
				is now,
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>{'HEAD@{1}'}</code
				> is one move back. Each line also shows the short hash, so you have two ways to name any point
				in time. Pick your recovery recipe:
			</p>

			<CodeBlock
				title="Three recovery recipes"
				code={`# 1. Undo the reset entirely — move the branch back:
git reset --hard HEAD@{1}

# 2. Rescue a single lost commit onto your current branch
#    (cherry-pick gets its own section in 5.4):
git cherry-pick 4c7d3b9

# 3. Inspect first — park a rescue branch on the lost commit:
git switch -c rescue 4c7d3b9`}
			/>

			<Callout type="warning">
				<strong>The reflog's limits:</strong> it is <strong>local-only</strong> — it's never pushed,
				and your teammates' machines each have their own. In real Git, entries expire (unreachable
				ones after about 30 days, the rest after about 90). And crucially:
				<strong>uncommitted work is NOT in the reflog</strong> — Git can only time-travel to states you
				committed. The real lesson of this whole part: commit early, commit often.
			</Callout>

			<Callout type="tip">
				This completes the undo toolkit from the recovery matrix in section 4.7: <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">restore</code
				>
				for the working directory,
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">revert</code
				>
				for public history,
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">reset</code
				>
				for local history — and
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">reflog</code
				> when a reset itself was the mistake.
			</Callout>

			<h4
				id="reflog-rescue"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Rescue Lost Commits
			</h4>
			<PlaygroundNote>
				An agent ran <code>git reset --hard HEAD~2</code> and two commits vanished. Run
				<code>git reflog</code>
				to find where HEAD was before the reset, then <code>{'git reset --hard HEAD@{1}'}</code> to bring
				everything back.
			</PlaygroundNote>
			<LessonActivity
				title="Try it: Rescue lost commits"
				scenarioId="reflog-rescue"
				id="reflog-rescue"
			/>

			<VibeBox
				prompts={[
					'The last reset deleted commits I still need — check the reflog and restore them',
					'Find the commit where tests still passed in the reflog and create a rescue branch on it'
				]}
			/>

			<p class="mt-8 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The reflog answers "where did my commits <em>go</em>?" Its sibling question — "which commit
				<em>broke</em> this?" — has its own tool:
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git bisect</code
				>
				binary-searches your history. Mark one commit as bad and one as good, and Git checks out midpoints
				for you to test — 1,000 commits take ten rounds, not a thousand. In the agent era this is the
				tool for "somewhere in the bot's forty commits, the tests started failing."
			</p>

			<h4
				id="bisect"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Find the Bad Commit
			</h4>
			<PlaygroundNote>
				The tests fail on <code>main</code> but passed at <code>v1.0</code>, eight commits ago. Use
				<code>git bisect</code> plus the <code>run-tests</code> command to pin down the culprit in three
				rounds instead of eight.
			</PlaygroundNote>
			<LessonActivity title="Bisect: Binary-Search the History" scenarioId="bisect" id="bisect" />

			<VibeBox
				prompts={[
					'The tests fail now but passed at v1.0 — bisect between them and tell me the first bad commit',
					'Run git bisect to find which of your last 20 commits broke the login flow'
				]}
			/>
		</div>
	</div>
</section>
