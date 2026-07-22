<script lang="ts">
	import { Ship, BadgeCheck, ShieldCheck, PackageCheck } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import LessonActivity from '../ui/LessonActivity.svelte';
	import MermaidDiagram from '../ui/MermaidDiagram.svelte';
	import PlaygroundNote from '../ui/PlaygroundNote.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import ChallengeActivity from '../ui/ChallengeActivity.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
	import Code from '../ui/Code.svelte';
</script>

<section id="part-8" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Ship}
			partLabel="Part 8"
			title="Ship It: CI, Bots, and Releases"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"The robots handle the vigilance so you can spend your attention on judgment."
		</blockquote>

		<p class="mb-4 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			Everything so far happened between you, your agent, and your repository. But open any active
			project on GitHub and you'll see an entourage you didn't create: green checkmarks appearing on
			every pull request, PRs opened by accounts named <Code code="dependabot" />
			and
			<Code code="release-please" />, security scans running on a schedule, version numbers bumping
			themselves. None of it is magic, and none of it is optional knowledge anymore — this machinery
			is how modern software actually ships, and every piece of it is built from things you already
			know: branches, commits, PRs, and tags.
		</p>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			One lens makes the whole chapter click: everything here is either a <strong
				style="color: var(--color-text);">safety net</strong
			>
			(it catches mistakes before users see them) or a
			<strong style="color: var(--color-text);">memory</strong> (it records what happened and why, for
			the future maintainer — usually you). CI checks are safety nets. Changelogs and releases are memories.
			The bots just run both without being asked.
		</p>

		<!-- 8.1 CI: The Green Checkmark -->
		<div id="section-8-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={BadgeCheck}
				title="8.1 CI — Where the Green Checkmark Comes From"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/ci-pipeline.webp"
					alt="CI pipeline — a push triggers a fresh runner that lints, tests, and builds before the merge gate opens"
					caption="Every push gets a fresh machine and the full gauntlet — green means the gate opens"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> "It works on my machine" — but your machine has files that aren't
				committed, packages that aren't declared, and a you that forgot to run the tests. Multiply that
				by an AI agent pushing ten branches a day, and hoping everyone remembered to check everything
				stops being a plan.
			</Callout>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">CI — Continuous Integration</strong> — is the fix,
				and the idea is almost embarrassingly simple: every time anyone pushes, a robot builds the
				project from scratch and runs every check against it. Not "when someone remembers." Every
				push, every PR, every time. On GitHub the robot service is called
				<strong style="color: var(--color-text);">GitHub Actions</strong>: each run spins up a
				<em>runner</em> — a fresh, disposable Linux machine in the cloud — that clones your repo, installs
				dependencies from the lockfile, and works through the checklist. If everything passes, your PR
				gets the green checkmark. If anything fails, you get a red X and a log pointing at the failure
				— minutes after pushing, not weeks later in production.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				The checklist itself is just a YAML file committed to your repo, which means it's versioned,
				reviewed, and branch-protected like everything else. A real, minimal one:
			</p>

			<CodeBlock
				lang="yaml"
				title=".github/workflows/ci.yml"
				code={`name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci        # install EXACTLY the lockfile versions
      - run: npm run lint  # style + suspicious patterns
      - run: npm test      # the whole suite, every time
      - run: npm run build # prove a production build works`}
			/>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Read it top to bottom: <em>on these triggers, run these steps</em>. That's the entire
				programming model. The steps are the same commands you (or your hooks from
				<a
					href="#section-6-2"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 6.2</a
				>) run locally — the difference is <em>where</em> and <em>always</em>. A pre-commit hook is
				a seatbelt you buckle on your own machine, and
				<Code code="--no-verify" /> unbuckles it. CI runs on a machine nobody can sweet-talk. Hooks are
				the seatbelt; CI is the law.
			</p>

			<MermaidDiagram
				definition={`graph TD
  P([git push or open a PR]) --> R[fresh cloud runner]
  R --> L[lint and format]
  R --> T[types and tests]
  R --> B[production build]
  L --> G{all green?}
  T --> G
  B --> G
  G -->|yes| M([merge button unlocks])
  G -->|no| F([red X — fix and push again])`}
				id="ci-pipeline-flow"
			/>
			<p class="mt-2 px-1 text-xs" style="color: var(--color-text-muted);">
				Branch protection (the rulesets from <a
					href="#section-3-3"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 3.3</a
				>) is what wires the checkmark to the merge button: no green, no merge — for you, your
				teammates, and every agent equally.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				The sibling acronym, <strong style="color: var(--color-text);">CD</strong> — Continuous
				Delivery or Deployment — is what happens <em>after</em> green: code that reaches
				<Code code="main" /> ships to users automatically. Many projects (including this site) deploy
				on every merge — a second workflow builds the app and publishes it the moment a PR lands. That
				immediacy is exactly why the gate in front of main matters: when merging
				<em>is</em> shipping, "we'll fix it before the release" is not a sentence that exists.
			</p>

			<Callout type="tip">
				<strong>Why vibe coders should care most:</strong> CI is the one reviewer that scales with
				your agents. You can't personally re-run the test suite for every branch three agents push
				in parallel — but the runner can, does, and never gets tired. Green checks are what let you
				supervise
				<em>outcomes</em> instead of babysitting every command.
			</Callout>

			<VibeBox
				prompts={[
					'Add a GitHub Actions workflow to my repo that runs lint, tests, and a build on every pull request',
					'My tests pass locally but fail in CI — walk me through the usual suspects (lockfile, node version, environment)'
				]}
			/>
		</div>

		<!-- 8.2 The Robot Coworkers -->
		<div id="section-8-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={ShieldCheck}
				title="8.2 The Robot Coworkers: Dependabot, CodeQL & Friends"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/robot-coworkers.webp"
					alt="Robot coworkers — bots opening dependency and security PRs that flow through the same CI gate"
					caption="Bots open PRs like everyone else — and face the same green-check gate"
				/>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Once CI guards the gate, something clever becomes possible: you can let robots <em
					>propose</em
				>
				changes, because no proposal — human, agent, or bot — gets through without passing the same checks.
				A bot's PR is a completely ordinary PR: a branch, a diff, a conversation, a checkmark. You already
				know how to review one. Meet the three coworkers you'll see most.
			</p>

			<div class="mb-6 space-y-3">
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Dependabot — the dependency gardener
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Your project stands on dozens of open-source packages, and dependencies age like food,
						not wine: every one has its own release stream and, occasionally, its own security
						holes. Dependabot watches all of them and opens PRs on your behalf — branches named <Code
							code="dependabot/npm_and_yarn/..."
						/>
						with commits like
						<Code code="chore(deps): bump lodash from 4.17.20 to 4.17.21" />. The elegant part: its
						PR triggers <em>your</em> CI. The robot proposes, your test suite disposes. If the update
						breaks the build, you find out in the PR — not in production.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						CodeQL — the code detective
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						GitHub's code-scanning engine treats your codebase like a database and runs queries
						written by security researchers against it — hundreds of known-dangerous shapes, like
						user input flowing unsanitized into HTML (cross-site scripting) or into file paths. It
						runs on PRs <em>and</em> on a schedule, so when a new attack pattern is discovered, your
						<em>old</em> code gets re-checked too. Think of it as a security specialist who re-reads your
						entire repo every week and only speaks up on a match.
					</p>
				</div>
				<div class="rounded-lg p-5" style="background: var(--color-bg-secondary);">
					<h4 class="mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
						Secret scanning — the leak alarm
					</h4>
					<p class="text-[13px]" style="color: var(--color-text-secondary);">
						Remember the staged <Code code=".env" />
						drama from
						<a
							href="#section-2-4"
							class="underline underline-offset-2"
							style="color: var(--color-primary);">section 2.4</a
						>? GitHub runs a last line of defense: it recognizes the formats of API keys and tokens
						and — with push protection on — refuses the push outright. A blocked push is a gift.
						Treat any key that reaches a public commit as burned, and rotate it.
					</p>
				</div>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Dependabot is configured with — you guessed it — a YAML file in the repo. The one setting
				worth knowing on day one is <em>grouping</em>, which turns thirty tiny weekly PRs into one
				digestible one:
			</p>

			<CodeBlock
				lang="yaml"
				title=".github/dependabot.yml"
				code={`version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
        # major bumps stay separate — those need real review`}
			/>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Two quieter pieces complete the safety net. The <strong style="color: var(--color-text);"
					>lockfile</strong
				>
				(<Code code="package-lock.json" />) pins the exact version of every package
				<em>and every package's packages</em>, so your laptop, CI, and production all install
				byte-identical dependencies — it's why the lockfile belongs in Git even though you never
				edit it by hand. And
				<strong style="color: var(--color-text);">supply-chain pinning</strong>: careful repos
				reference third-party Actions by full commit hash instead of a friendly tag. You know from
				<a
					href="#section-5-6"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 5.6</a
				>
				that a tag is just a movable label — and if an attacker compromises an Action's repo, they can
				quietly move
				<Code code="v4" /> to malicious code. A commit hash can't be moved. Same Git concept, now a security
				boundary.
			</p>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Here's what a healthy history looks like with the robots at work — one of these commits was
				written by a human:
			</p>

			<CodeBlock
				title="git log on a well-tended repo"
				code={`git log --oneline -n 4
e4f5a6b feat: add csv export
b7c8d9e chore(deps): bump the npm group with 3 updates
a1b2c3d chore(main): release 1.4.2 (#118)
9f8e7d6 fix: handle empty header row`}
			/>

			<Callout type="warning">
				<strong>Bots are agents with one narrow job.</strong> Everything Part 6 taught you about AI
				agents applies: read the diff before you merge, be extra awake for <em>major</em> version bumps
				(breaking changes ride in on those), and never grant a bot more permissions than its one job needs.
				The green check tells you the tests still pass — it cannot tell you whether the new major version
				quietly changed a behavior your tests never covered.
			</Callout>

			<h4
				id="bot-pr"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Review the Robot's PR
			</h4>
			<PlaygroundNote>
				Dependabot has pushed a branch. Inspect exactly what it wants to change with <Code
					code="git diff"
				/>, merge it, and clean up the branch — the same moves the "Merge" button does for you on
				GitHub.
			</PlaygroundNote>
			<LessonActivity title="Review the Robot's PR" scenarioId="bot-pr" id="bot-pr" />

			<VibeBox
				prompts={[
					'Set up Dependabot for my repo with weekly, grouped minor/patch updates',
					'Dependabot opened a major-version bump PR — read the changelog of the dependency and tell me what could break'
				]}
			/>
		</div>

		<!-- 8.3 Releases on Autopilot -->
		<div id="section-8-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={PackageCheck}
				title="8.3 Releases on Autopilot: SemVer, Conventional Commits, `release-please`"
				color="var(--color-primary)"
			/>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/release-autopilot.webp"
					alt="Release autopilot — conventional commits feeding a changelog, a version bump, and a tagged release"
					caption="Structured commit messages are the fuel — the changelog and version number write themselves"
				/>
			</div>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				A green merge says the code is good. A <strong style="color: var(--color-text);"
					>release</strong
				>
				answers two different questions: <em>what do we call this state</em>, and
				<em>what changed since the last one</em>? In
				<a
					href="#section-5-6"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 5.6</a
				> you did this by hand — decided a version number, wrote an annotated tag. This lesson is about
				the grammar behind those version numbers, and the robot that does the paperwork.
			</p>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Semantic Versioning: the number is a promise
			</h4>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				A version like <Code code="2.4.1" />
				reads as
				<strong style="color: var(--color-text);">major.minor.patch</strong>, and each position
				carries a promise to whoever upgrades: a <em>patch</em> bump (2.4.1 → 2.4.2) means "bug
				fixes only, upgrade blind"; a <em>minor</em> bump (2.4 → 2.5) means "new features, nothing
				you rely on changed"; a <em>major</em> bump (2 → 3) means "something breaks — read the notes before
				touching it." That's why Dependabot's major-version PRs deserve your full attention while patch
				bumps barely need a glance: the versioning scheme is literally telling you how scared to be.
			</p>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Conventional Commits: the payoff
			</h4>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				Since <a
					href="#section-2-3"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">Part 2</a
				>
				you've been writing
				<Code code="feat:" />
				and
				<Code code="fix:" />
				prefixes, and in
				<a
					href="#section-6-2"
					class="underline underline-offset-2"
					style="color: var(--color-primary);">section 6.2</a
				>
				a hook started enforcing them. Here's the payoff: those prefixes map straight onto SemVer.
				<Code code="fix:" />
				means the next release is at least a patch.
				<Code code="feat:" />
				promotes it to a minor. A
				<Code code="feat!:" />
				or a
				<Code code="BREAKING CHANGE:" />
				footer forces a major. Your commit history stopped being prose and became data — which means a
				machine can read it.
			</p>

			<h4 class="mt-6 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				release-please: the release accountant
			</h4>

			<p class="mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">release-please</strong> (Google's oddly polite
				release bot) watches main and keeps a running draft of the next release. It reads every
				conventional commit since the last tag, computes the right version bump, and opens — a pull
				request. The PR contains exactly two things: an updated
				<Code code="CHANGELOG.md" />
				grouping your commits into Features and Bug Fixes, and the version bump. As more commits land
				on main, the bot quietly amends its own PR. When you decide it's release time, you merge the PR
				like any other — and the bot tags the commit and publishes a GitHub Release. If you've ever wondered
				what a commit like
				<Code code="chore(main): release 1.1.0 (#42)" /> is: that's someone merging the accountant's paperwork.
			</p>

			<MermaidDiagram
				definition={`graph TD
  C1["feat: add csv export"] --> RP[release-please reads main]
  C2["fix: handle empty rows"] --> RP
  RP --> PR([release PR: CHANGELOG + bump to v1.1.0])
  PR -->|you merge it| T[tag v1.1.0 + GitHub Release]
  T --> A([a named point to announce, compare, or roll back to])`}
				id="release-please-flow"
			/>

			<p class="mt-4 mb-4 text-[14px]" style="color: var(--color-text-secondary);">
				The changelog it maintains is the <em>memory</em> half of this chapter at its purest — the human-readable
				answer to "what changed since 1.0.0?", assembled from messages you were already writing:
			</p>

			<CodeBlock
				lang="markdown"
				title="CHANGELOG.md — written by the robot, from your commits"
				code={`## 1.1.0 (2026-07-17)

### Features

* add csv export (#31)

### Bug Fixes

* handle empty header row (#33)`}
			/>

			<Callout type="note">
				<strong>A release is not a deploy.</strong> If your project deploys on every merge (8.1),
				users may be running code from ten minutes ago while your latest <em>release</em> is v1.1.0 from
				last week. Deploying is code reaching users; releasing is giving a state a name, a changelog entry,
				and a tag you can return to. Small tools may release without deploying anything; a website deploys
				constantly and releases occasionally, as a bookmark.
			</Callout>

			<h4
				id="release-robot"
				class="mt-6 mb-3 scroll-mt-20 text-lg font-semibold"
				style="color: var(--color-text);"
			>
				Try It: Be release-please for a Day
			</h4>
			<PlaygroundNote>
				Two conventional commits have landed since <Code code="v1.0.0" />. Do the accountant's job
				by hand exactly once — read the log, write the changelog, commit the paperwork, cut the tag
				— and you'll never wonder what the bot does again.
			</PlaygroundNote>
			<LessonActivity
				title="Be release-please for a Day"
				scenarioId="release-robot"
				id="release-robot"
			/>

			<VibeBox
				prompts={[
					'Set up release-please for my repository and explain what its first PR will contain',
					'Read my commits since the last tag and tell me the next version number — and why'
				]}
			/>

			<ChallengeActivity title="Review the Robot" part={8} id="ch-8-review-the-robot" />
		</div>
	</div>
</section>
