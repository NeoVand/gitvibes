<script lang="ts">
	import {
		Undo2,
		Trash2,
		MinusCircle,
		PenLine,
		RotateCcw,
		AlertTriangle,
		Table
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
				src="{base}/images/undo.png"
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
					src="{base}/images/git-restore.png"
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
				code={`git restore .              # Discard ALL local changes
git restore src/bad_file.py  # Discard a single file`}
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
					src="{base}/images/git-restore-staged.png"
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
				a debug file. Unstage them with <code>git restore --staged</code> before committing.
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
				This rewrites your last commit. This is 100% safe <strong>if and only if</strong> you have not
				pushed that commit to the remote server yet.
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
					src="{base}/images/git-reset.png"
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
				code="git reset --hard HEAD~3   # Delete last 3 commits + all changes"
			/>

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
						Deletes commits AND all code changes. Your files reset to the older commit's state.
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
					src="{base}/images/git-revert.png"
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
				code={`git log --oneline          # Find the hash: a1b2c3d
git revert a1b2c3d         # Create an inverse commit
git push                   # Push the revert`}
			/>

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
					src="{base}/images/force-with-lease.png"
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
						permanently destroy their work.
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
			<Callout type="caution">
				<strong>What does the error look like?</strong> When you try to push after rewriting
				history, Git will reject it with:
				<code
					class="mt-1 block rounded px-2 py-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>! [rejected] (non-fast-forward) — hint: Updates were rejected because the tip of your
					current branch is behind</code
				>
				This is Git protecting you. Try it yourself below:
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
				to go back, then <code>git push --force</code> to overwrite the remote. Never do this on shared
				branches!
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
		<div id="section-4-7" class="mb-8">
			<SectionHeader
				level="section"
				icon={Table}
				title="4.7 The Git &quot;Undo&quot; Recovery Matrix"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/recovery-matrix.png"
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
							<td class="px-3 py-2">Discards all local changes in the working directory</td>
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Right-click file → "Discard Changes"</td>
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
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
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
							<td class="px-3 py-2"><span style="color: var(--color-tip);">Safe (Local)</span></td>
							<td class="px-3 py-2">Stage files → ... → Commit Staged (Amend)</td>
						</tr>
						<tr style="border-top: 1px solid var(--color-border);">
							<td class="px-3 py-2">Last 3 local commits are bad</td>
							<td class="px-3 py-2"
								><code style="font-family: var(--font-mono);">git reset --hard HEAD~3</code></td
							>
							<td class="px-3 py-2">Destroys the last 3 commits and all their code changes</td>
							<td class="px-3 py-2"
								><span style="color: var(--color-warning);">Local Only! (Rewrites history)</span
								></td
							>
							<td class="px-3 py-2">GitLens → Right-click commit → Reset</td>
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
							<td class="px-3 py-2">GitLens → Right-click commit → "Revert Commit..."</td>
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
							<td class="px-3 py-2">Terminal only</td>
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
	</div>
</section>
