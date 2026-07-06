<script lang="ts">
	import { Layers, Archive, GitMerge, FileWarning, Cherry, ShieldAlert, Tag } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';

	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-5" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Layers}
			partLabel="Part 5"
			title="Advanced Scenarios: Managing a Multi-Branch Workflow"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"Real projects are messy. Stash your work, resolve your conflicts, and keep moving."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			By now you know the fundamentals. But real-world development is rarely linear — you'll be
			mid-feature when a critical bug drops, your branch will diverge from a teammate's, and two
			files will clash during a merge. These advanced tools handle the chaos.
		</p>

		<Callout type="note">
			As you grow, you'll often work on multiple tasks at once. Your AI-driven workflow will be
			interrupted by urgent bugs or questions. Git provides the tools to manage this
			context-switching seamlessly.
		</Callout>

		<!-- 5.1 Stash -->
		<div id="section-5-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={Archive}
				title="5.1 &quot;I Need to Switch Branches, but My Work Isn't Ready&quot;"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You're deep in a feature branch with ten modified files when your manager says "urgent bug
				on main." You can't commit half-finished work, and you can't lose it either. The stash is
				your escape hatch.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-stash.webp"
					alt="git stash — shelve uncommitted work and switch branches without losing progress"
					caption="Stash your work-in-progress to switch context without losing anything"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You're in the middle of a complex AI refactor with 10 modified files.
				Your manager says: "Urgent bug on main!" You can't commit half-baked work, and Git may block you
				from switching branches if your uncommitted changes conflict with the target branch.
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				The <strong>stash</strong> is a temporary, private holding area for your dirty changes.
			</p>

			<CodeBlock
				title="Stash, fix, and return"
				code={`# 1. Stash your changes
git stash push -m "WIP: refactoring pipeline, AI changes"

# 2. Fix the urgent bug
git switch main
git pull
git switch -c "hotfix/urgent-bug"
# ... fix, test, commit, push, create PR ...

# 3. Return to your work
git switch feature/A
git stash pop`}
			/>

			<p class="my-4 text-[13px]" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git stash pop</code
				>
				re-applies your changes and removes them from the stash. Use
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git stash apply</code
				> to keep the stash entry for reuse.
			</p>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In VS Code, you can do all of this without memorizing commands. Open the <strong>...</strong
				>
				menu in the Source Control panel -- you'll see a <strong>Stash</strong> submenu with all the options
				you need:
			</p>

			<VsCodeScreenshot
				src="quickstart/pull-push-commands.png"
				alt="VS Code Source Control ellipsis menu showing Stash, Branch, and other Git commands"
				caption="The ... menu includes a Stash submenu with 'Stash (Include Untracked)' and 'Pop Latest Stash' -- everything you need for context-switching."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Choose <strong>"Stash (Include Untracked)"</strong> to save all your work. When you're ready
				to come back, go to <strong>...</strong> → Stash → <strong>"Pop Latest Stash"</strong> to restore
				everything exactly where you left off.
			</p>

			<h4
				id="stash"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: The Stash Workflow
			</h4>
			<PlaygroundNote>
				You're mid-refactor on <code>feature/A</code> when a critical bug comes in. Stash your work, fix
				the bug on a hotfix branch, then come back and pop the stash.
			</PlaygroundNote>
			<LessonActivity title="Stash: Context-Switch Safely" scenarioId="stash" id="stash" />

			<VibeBox
				prompts={[
					"I need to switch branches but I'm not done here — save my work temporarily",
					'Stash my current changes, switch to main to fix a bug, then come back and restore them'
				]}
			/>
		</div>

		<!-- 5.2 Rebase vs Merge -->
		<div id="section-5-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={GitMerge}
				title="5.2 &quot;My Branch is Out of Date&quot; (Rebase vs. Merge)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Your feature branch has been alive for a few days and main has moved on without you. Now you
				need to catch up — and Git offers two philosophies with very different trade-offs.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/merge-rebase.webp"
					alt="merge vs rebase — two ways to update a stale feature branch with main"
					caption="Merge preserves history, rebase rewrites it — choose based on your team's convention"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> Your feature branch is "stale."
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>
				has moved on. There are two philosophies for updating it.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				You have two options for catching up with main, and each tells a different story in your
				commit history.
			</p>

			<div class="mb-6 grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-note);">
						git merge main
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						Creates a new "Merge Commit" on your branch. Preserves the exact history -- messy but
						100% accurate.
					</p>
					<p class="text-xs" style="color: var(--color-text-muted);">
						History: "Worked on feature... merged main... worked on feature..."
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-important);">
						git rebase main
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						"Replays" your commits on top of the latest main. Creates a clean, linear history as if
						you started today.
					</p>
					<p class="text-xs" style="color: var(--color-text-muted);">
						History: "A, B, E, F, C', D'" -- all in a straight line.
					</p>
				</div>
			</div>

			<Callout type="caution">
				<strong>The Golden Rule of Rebasing:</strong> Never rebase a public branch (one your team is also
				using), as it rewrites history.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				VS Code supports both approaches. Use the <strong>...</strong> menu in Source Control →
				<strong>"Pull (Rebase)"</strong>
				to rebase instead of merge when pulling. For merging, use the Command Palette (<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Cmd+Shift+P</kbd
				>
				/
				<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Ctrl+Shift+P</kbd
				>) → <strong>"Git: Merge Branch..."</strong> and select the branch to merge.
			</p>

			<Callout type="tip">
				<strong>The AI-First Developer's Choice:</strong> Since your experiment branch is your
				private playground, <strong>rebase</strong> is preferred to keep it clean before creating a PR.
				It avoids cluttering the PR with "I merged main" commits.
			</Callout>

			<h4
				id="rebase-merge"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Merge vs. Rebase
			</h4>
			<PlaygroundNote>
				Your feature branch and <code>main</code> have diverged. Try <code>git merge main</code>
				first, then reset and try <code>git rebase main</code> to compare the resulting history.
			</PlaygroundNote>
			<LessonActivity title="Merge vs. Rebase" scenarioId="rebase-merge" id="rebase-merge" />

			<VibeBox
				prompts={[
					'My branch is behind main — rebase my changes on top of the latest main',
					'Update my feature branch with the latest changes from main using rebase'
				]}
			/>
		</div>

		<!-- 5.3 Merge Conflicts -->
		<div id="section-5-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={FileWarning}
				title="5.3 &quot;We Both Edited the Same File&quot; (Merge Conflicts)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				This is the moment every developer dreads the first time — and handles calmly by the tenth.
				Two people changed the same lines, and Git needs a human to decide which version wins.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/merge-conflict.webp"
					alt="merge conflict — two edits collide and Git needs you to choose the resolution"
					caption="When two edits collide, Git asks you to choose — this is a merge conflict"
				/>
			</div>

			<Callout type="warning">
				<strong>The Problem:</strong> You run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git pull</code
				>
				(or merge
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>
				into your branch) and Git halts with
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">CONFLICT</code
				>. You and a teammate edited the same lines. Git needs you, the human, to resolve it.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Don't panic -- conflicts look intimidating at first, but they follow a simple pattern. Git
				inserts special markers into your file to show you exactly where the disagreement is.
			</p>

			<h4 class="mb-3 text-[14px] font-semibold" style="color: var(--color-text);">
				The Conflict Markers
			</h4>
			<CodeBlock
				lang="python"
				title="What you'll see in src/model.py"
				code={`<<<<<<< HEAD
x = 10
# AI refactor
=======
x = 5
# teammate fix
>>>>>>> main`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Everything between <code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code
				>
				and the
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">=======</code
				>
				divider is <strong style="color: var(--color-text);">your side</strong> (here, the AI's
				refactor on your branch). Everything below the divider is
				<strong style="color: var(--color-text);">the incoming side</strong>
				— the label after
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code
				>
				names where it came from (<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>
				when merging a local branch,
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">origin/main</code
				> when the conflict came from a pull).
			</p>

			<p class="my-4 text-[13px]" style="color: var(--color-text-secondary);">
				Delete all the markers (<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>&lt;&lt;&lt;</code
				>,
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">===</code
				>,
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>&gt;&gt;&gt;</code
				>) and edit the code to be the correct final version, then stage and commit. In the
				playground, you can write the resolved file with
				<code
					class="rounded px-1 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>echo 'x = 10' &gt; src/model.py</code
				>.
			</p>

			<h4 class="mt-6 mb-3 text-[14px] font-semibold" style="color: var(--color-text);">
				The VS Code Way (The Superior Way)
			</h4>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Editing conflict markers by hand works, but VS Code makes the whole process much more visual
				and less error-prone.
			</p>

			<Callout type="tip">
				This is one of the best features of the IDE. VS Code opens a <strong
					>3-way Merge Editor</strong
				>:
				<br /><br />
				<strong>Left Pane:</strong> "Incoming" (teammate's changes)<br />
				<strong>Right Pane:</strong> "Current" (your changes)<br />
				<strong>Bottom Pane:</strong> "Result" (what will be saved)<br /><br />
				Above each conflict block, VS Code shows clickable links: <strong>"Accept Current"</strong>
				|
				<strong>"Accept Incoming"</strong> | <strong>"Accept Both"</strong>.
			</Callout>

			<VsCodeScreenshot
				src="overview/merge-conflict.png"
				alt="VS Code inline merge conflict view showing Accept Current, Accept Incoming, and Accept Both options"
				caption="VS Code highlights conflicts inline with clickable actions: Accept Current Change, Accept Incoming Change, or Accept Both Changes."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				For complex conflicts with multiple overlapping changes, click <strong
					>"Resolve in Merge Editor"</strong
				> to open the full 3-way view. This gives you the most control over the final result:
			</p>

			<VsCodeScreenshot
				src="overview/merge-editor-overview.png"
				alt="VS Code 3-way Merge Editor with Incoming, Current, and Result panes"
				caption="The 3-way Merge Editor: Incoming changes (left), your changes (right), and the final result (bottom). Use checkboxes to select which changes to keep."
			/>

			<h4
				id="conflicts"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Resolving a Merge Conflict
			</h4>
			<PlaygroundNote>
				The scenario starts mid-merge with conflict markers in <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>src/model.py</code
				>. Use
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">echo</code
				>
				to overwrite the file, then
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add</code
				>
				and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				> to finish.
			</PlaygroundNote>
			<LessonActivity title="Merge Conflict Resolution" scenarioId="conflicts" id="conflicts" />

			<VibeBox
				prompts={[
					'I have a merge conflict in model.py — help me resolve it, keeping both changes',
					'Show me the conflicts and suggest the best resolution for each one'
				]}
			/>
		</div>

		<!-- 5.4 Cherry-Pick -->
		<div id="section-5-4" class="mb-14">
			<SectionHeader
				level="section"
				icon={Cherry}
				title="5.4 Cherry-Pick — Take Only the Gems"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Your AI experiment branch is a mess — half-finished rewrites, abandoned TODOs, dead ends.
				But buried in the middle is one brilliant commit: a currency rounding fix that actually
				works. You don't want the branch. You want <strong style="color: var(--color-text);"
					>that one commit</strong
				>.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/cherry-pick.webp"
					alt="git cherry-pick — copying a single commit from a messy branch onto main"
					caption="Cherry-pick copies exactly one commit onto your branch and leaves the rest behind"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> An experiment branch has one valuable fix buried among junk
				commits. Merging would bring <strong>everything</strong>. You want to extract a single
				commit.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git cherry-pick</code
				>
				copies one commit's changes onto your current branch as a
				<strong style="color: var(--color-text);">new commit</strong> — same change, same message, but
				a brand-new hash, because it now sits on a different parent. The original commit stays untouched
				on its branch.
			</p>

			<CodeBlock
				title="Pick the gem, leave the junk"
				code={`git log --oneline --all      # Find the gem's hash on the experiment branch
git switch main              # Stand on the branch that should receive it
git cherry-pick e4f5a6b      # Copy exactly that commit here
git log --oneline            # The fix is on main — the junk is not`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">When to prefer it over merging:</strong> merge
				when the whole branch is worth keeping; cherry-pick when only part of it is. And because a
				cherry-picked commit replays changes onto code that may have moved on,
				<strong style="color: var(--color-text);">conflicts can happen here too</strong> — the escape
				hatches mirror rebase exactly:
			</p>

			<CodeBlock
				title="If the pick conflicts"
				code={`# Fix the conflicted file, then:
git add <file>
git cherry-pick --continue

# Or walk away as if nothing happened:
git cherry-pick --abort`}
			/>

			<Callout type="tip">
				<strong>The AI reviewing strategy — "reject the PR, cherry-pick the gems":</strong> when an agent's
				branch is 80% noise, don't agonize over salvaging it. Close the PR, cherry-pick the one or two
				commits that earned their place, and delete the branch. This pairs perfectly with the guidance
				in section 7.3 on teaching your AI to work in small, single-purpose commits — small commits are
				what make cherry-picking possible.
			</Callout>

			<h4
				id="cherry-pick-activity"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Cherry-Pick the Gem
			</h4>
			<PlaygroundNote>
				The <code>experiment</code> branch has a half-finished dashboard rewrite and one gem: a
				currency rounding fix. Use <code>git log --oneline --all</code> to find it, then
				<code>git cherry-pick</code> it onto <code>main</code> — and check
				<code>src/billing.py</code>
				to confirm the fix arrived.
			</PlaygroundNote>
			<LessonActivity
				title="Try it: Cherry-pick the gem"
				scenarioId="cherry-pick"
				id="cherry-pick"
			/>

			<VibeBox
				prompts={[
					'The experiment branch is mostly junk but the rounding fix is good — cherry-pick just that commit onto main',
					'Find the commit that fixed the login bug on the old branch and apply only that one here'
				]}
			/>
		</div>

		<!-- 5.5 Rebase Conflicts -->
		<div id="section-5-5" class="mb-14">
			<SectionHeader
				level="section"
				icon={ShieldAlert}
				title="5.5 When Rebase Goes Wrong — Conflicts, Continue, Abort"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Section 5.2 sold you on rebase for clean history — but it skipped the scary part. Your
				feature branch tuned <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>src/config.py</code
				>, main changed the same lines, and halfway through the rebase Git slams the brakes. Here's
				how to read the wreck and drive out of it.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/rebase-conflict.webp"
					alt="Rebase paused on a conflict — resolve and continue, or abort and return to safety"
					caption="A paused rebase is a fork in the road: fix and continue, or abort and go home"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You ran
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git rebase main</code
				>
				and Git stopped with
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">CONFLICT</code
				>. The rebase is half-done and you're not sure whether to fix it or flee.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Remember what rebase does: it <strong style="color: var(--color-text);">replays</strong>
				your commits one at a time on top of the latest main. If a replayed commit touches lines that
				main also changed, Git can't guess the winner — so it
				<strong style="color: var(--color-text);">pauses mid-replay</strong>
				and hands you the keys. Run
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				>
				to see the paused state: it reports a rebase in progress and lists the conflicted files under
				<strong style="color: var(--color-text);">"unmerged paths"</strong>. The files themselves
				contain the same conflict markers you learned to read in section 5.3.
			</p>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				From here, it's a three-step ritual — the same one every time:
			</p>

			<CodeBlock
				title="The three-step ritual"
				code={`# 1. Fix the file — remove the markers, keep the right code
echo 'TIMEOUT = 120\\nRETRIES = 5' > src/config.py

# 2. Tell Git the conflict is resolved
git add src/config.py

# 3. Resume the replay
git rebase --continue`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				If more commits remain, Git keeps replaying — and may pause again on the next conflict. Just
				repeat the ritual until the rebase completes. And if at any point you're lost, confused, or
				late for dinner, there's a guilt-free eject button:
			</p>

			<CodeBlock
				title="The guilt-free escape"
				code="git rebase --abort   # Everything returns EXACTLY as it was before the rebase"
			/>

			<Callout type="important">
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--abort</code
				>
				is the reason rebasing your <strong>local</strong> branches is always safe to attempt. The rebase
				doesn't touch your original commits until it finishes — abort at any pause and your branch is
				restored exactly as it was. The Golden Rule from 5.2 still stands (never rebase shared branches),
				but on your own branch, the worst case is typing one command and being back where you started.
			</Callout>

			<h4
				id="rebase-conflict-activity"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Survive a Rebase Conflict
			</h4>
			<PlaygroundNote>
				Your <code>feature/tuning</code> branch raised the timeout in <code>src/config.py</code>,
				but <code>main</code> changed the same lines. Run <code>git rebase main</code>, read the
				conflict, fix the file with <code>echo</code>, then <code>git add</code> and
				<code>git rebase --continue</code>. Try <code>git rebase --abort</code> too — watch everything
				snap back.
			</PlaygroundNote>
			<LessonActivity
				title="Try it: Survive a rebase conflict"
				scenarioId="rebase-conflict"
				id="rebase-conflict"
			/>

			<VibeBox
				prompts={[
					'My rebase stopped on a conflict in config.py — resolve it keeping the higher timeout and continue',
					'This rebase is a mess — abort it and get my branch back to how it was'
				]}
			/>
		</div>

		<!-- 5.6 Tags & Releases -->
		<div id="section-5-6" class="mb-8">
			<SectionHeader
				level="section"
				icon={Tag}
				title="5.6 Tags &amp; Releases — Naming Your Milestones"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Branches move — every commit drags them forward. But some moments deserve a permanent name:
				the commit you shipped, the version that passed the audit, the last known-good state before
				a big AI refactor. That's what <strong style="color: var(--color-text);">tags</strong> are: labels
				that stick to one commit, forever.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-tags.webp"
					alt="git tag — permanent named labels marking release commits in history"
					caption="Tags are permanent name plates on commits — branches move, tags stay"
				/>
			</div>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Git has two kinds of tags, and the choice matters more than it looks:
			</p>

			<div class="mb-6 grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-note);">
						Lightweight: <code class="text-xs" style="font-family: var(--font-mono);"
							>git tag v1.1.0</code
						>
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						Just a name pointing at a commit. No author, no date, no message. Fine for private
						bookmarks.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-important);">
						Annotated: <code class="text-xs" style="font-family: var(--font-mono);"
							>git tag -a v1.1.0 -m "..."</code
						>
					</h4>
					<p class="mb-2 text-[13px]" style="color: var(--color-text-secondary);">
						A full object with author, date, and message. <strong>Always annotate releases</strong> —
						future-you will want to know who cut it and why.
					</p>
				</div>
			</div>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">Naming convention:</strong> most projects use
				<strong style="color: var(--color-text);">semantic versioning</strong> —
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>MAJOR.MINOR.PATCH</code
				>. Bump <strong style="color: var(--color-text);">MAJOR</strong> when you break existing
				users (v1.x → v2.0.0), <strong style="color: var(--color-text);">MINOR</strong> when you add
				features compatibly (v1.0 → v1.1.0), and
				<strong style="color: var(--color-text);">PATCH</strong> for pure bug fixes (v1.1.0 → v1.1.1).
				One glance at a version tells users how scared to be.
			</p>

			<CodeBlock
				title="Cut and inspect a release"
				code={`git tag -a v1.1.0 -m "Release: import support"   # Tag HEAD
git tag                                          # List all tags
git log --oneline                                # Tags appear as decorations
git show v1.0.0                                  # Inspect what a release points at`}
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				One surprise: in real Git, <code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git push</code
				>
				does <strong style="color: var(--color-text);">not</strong> send tags. You push them
				explicitly —
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git push origin v1.1.0</code
				>
				for one tag, or
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git push origin --tags</code
				>
				for all of them. (The playground's simulated remote doesn't sync tags, so practice the pushing
				part in a real repository.) Deleted a tag by mistake?
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git tag -d v1.1.0</code
				> removes one locally.
			</p>

			<Callout type="tip">
				<strong>The AI-first habit:</strong> tag before letting an agent loose on a big refactor —
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git tag -a pre-refactor -m "Last known good before agent rewrite"</code
				>. If things go sideways, a named restore point beats scrolling through the reflog trying to
				remember which
				<code
					class="rounded px-1.5 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>{'HEAD@{n}'}</code
				> was the good one.
			</Callout>

			<h4
				id="release-tags-activity"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Cut a Release
			</h4>
			<PlaygroundNote>
				v1.0.0 shipped two commits ago and the import feature is ready. Tag the current commit with
				<code>git tag -a v1.1.0 -m "Release: import support"</code>, list your tags, then use
				<code>git show v1.1.0</code> and <code>git log --oneline</code> to see what each release points
				at.
			</PlaygroundNote>
			<LessonActivity title="Try it: Cut a release" scenarioId="release-tags" id="release-tags" />

			<VibeBox
				prompts={[
					"Tag the current commit as v2.0.0 with a message summarizing what's in this release",
					'Before you start the refactor, create an annotated tag so we can get back to this exact state'
				]}
			/>
		</div>
	</div>
</section>
