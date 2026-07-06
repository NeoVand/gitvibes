<script lang="ts">
	import { Laptop, UserCheck, KeyRound, Download, EyeOff, Webhook } from 'lucide-svelte';
	import { base } from '$app/paths';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import ExpandableImage from '../ui/ExpandableImage.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-1" class="py-10">
	<div class="mx-auto max-w-4xl px-6">
		<SectionHeader
			icon={Laptop}
			partLabel="Part 1"
			title="Enterprise Onboarding: Connecting to Your Codebase"
			color="var(--color-primary)"
		/>

		<blockquote
			class="my-8 border-l-4 py-1 pl-5 text-lg italic"
			style="color: var(--color-text-secondary); border-color: var(--color-primary); font-family: var(--font-heading);"
		>
			"Every great journey begins with a single <code
				class="rounded px-1.5 py-0.5 text-sm not-italic"
				style="background: var(--color-code-bg); font-family: var(--font-mono);">git clone</code
			>."
		</blockquote>

		<p class="mb-8 text-[15px] leading-relaxed" style="color: var(--color-text-secondary);">
			Before you write your first line of code — or prompt your first AI — you need Git set up and
			talking to your team's repository. This is a one-time ritual: configure your identity,
			authenticate, and clone. Once it's done, it's done forever.
		</p>

		<!-- 1.1 Git Config -->
		<div id="section-1-1" class="mb-14">
			<SectionHeader
				level="section"
				icon={UserCheck}
				title="1.1 First-Time Local Configuration"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Every commit you make carries a name and email — your digital signature. Before anything
				else, Git needs to know who you are.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/P1.Section1-git-config.webp"
					alt="Git config — configured once, carried by every commit"
					caption="Your identity is baked into every commit — configure it once and forget about it"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You have a new machine with a fresh Git installation. Before your
				first commit, Git requires you to set your identity -- a permanent digital signature baked into
				every change you make.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In an enterprise, traceability is paramount. Every commit must be tied to a specific
				individual. Using your correct enterprise name and email is non-negotiable.
			</p>

			<CodeBlock
				title="Set your identity"
				code={`git config --global user.name "Your Name"
git config --global user.email "your-enterprise-email@company.com"`}
			/>

			<Callout type="tip">
				The <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--global</code
				> flag saves this for every Git repository on your computer. You only need to do this once.
			</Callout>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Don't want to use the terminal? No problem. VS Code will actually prompt you to configure
				your identity the first time you try to use Git. You can also open the Command Palette (<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Cmd+Shift+P</kbd
				>
				/
				<kbd
					class="rounded border px-1 py-0.5 text-[11px]"
					style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
					>Ctrl+Shift+P</kbd
				>) and search for <strong>"Git: Config"</strong> to set these values without touching the terminal.
			</p>

			<VibeBox
				prompts={[
					'Set up my Git config with my name and email for this project',
					'Configure Git to use VS Code as my default editor'
				]}
			/>
		</div>

		<!-- 1.2 Authentication -->
		<div id="section-1-2" class="mb-14">
			<SectionHeader
				level="section"
				icon={KeyRound}
				title="1.2 Authentication: Tokens & SSH Keys"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Your company's code lives in a private repository. To access it, you need to prove you're
				allowed in — and GitHub removed password authentication for Git back in 2021. Today there
				are two ways to authenticate: over <strong>HTTPS</strong> with a token, or over
				<strong>SSH</strong> with a key pair.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/personal-access-token.webp"
					alt="Personal Access Token — a token proves identity and carries permission"
					caption="A personal access token proves your identity to GitHub without a password"
				/>
			</div>

			<Callout type="warning">
				<strong>The Problem:</strong> Your company's code is in a private repository, and password authentication
				for Git operations no longer exists. You need either a Personal Access Token (for HTTPS) or an
				SSH key — and you should know which one fits your situation.
			</Callout>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 1: HTTPS with a Personal Access Token
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				A Personal Access Token (PAT) is a generated secret that acts as your password, but with
				scoped permissions and an expiration date. GitHub now recommends <strong
					>fine-grained tokens</strong
				>, which can be limited to specific repositories:
			</p>

			<ol
				class="mb-5 list-inside list-decimal space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>
					Go to GitHub <strong>Settings</strong> &rarr; <strong>Developer settings</strong> &rarr;
					<strong>Personal access tokens</strong>
					&rarr; <strong>Fine-grained tokens</strong>
				</li>
				<li>
					Click <strong>Generate new token</strong> and name it descriptively (e.g., "Work Laptop")
				</li>
				<li>Set an expiration (90 days recommended)</li>
				<li>
					Under <strong>Repository access</strong>, choose <strong>Only select repositories</strong> and
					pick your project
				</li>
				<li>
					Under <strong>Permissions</strong>, set
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">Contents</code
					>
					to <strong>Read and write</strong>
				</li>
				<li>
					Click <strong>Generate token</strong> and copy it immediately — you won't see it again
				</li>
			</ol>

			<Callout type="note">
				Some organizations still use the older <strong>classic tokens</strong> (same page, under
				"Tokens (classic)" — select the
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">repo</code
				>
				and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">read:org</code
				> scopes). If your team tells you to use one, the rest of the workflow is identical.
			</Callout>

			<CodeBlock
				title="Clone using your token"
				code={`git clone https://github.com/Your-Enterprise/your-project.git
# Username: your-github-username
# Password: your-personal-access-token`}
			/>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Storing Your Credentials
			</h4>

			<CodeBlock
				title="Save credentials (choose your OS)"
				code={`# macOS - Store in Keychain (recommended)
git config --global credential.helper osxkeychain

# Windows - Use Windows Credential Manager
git config --global credential.helper manager

# Linux - Store in encrypted file
git config --global credential.helper libsecret`}
			/>

			<Callout type="tip">
				After configuring a credential helper, the next time you clone, pull, or push, Git will
				prompt you once and then save the credentials for future use.
			</Callout>

			<h4 class="mt-7 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Option 2: SSH Keys
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				SSH flips the model. Instead of pasting a secret, you generate a <strong>key pair</strong>:
				a private key that never leaves your machine, and a public key you upload to GitHub. Set it
				up once and every clone, pull, and push just works — no tokens to renew. It's the classic
				"set it and forget it" choice for a machine you develop on daily.
			</p>

			<CodeBlock
				title="Generate your key"
				code={`ssh-keygen -t ed25519 -C "your-enterprise-email@company.com"
# Press Enter to accept the default file location,
# then choose a passphrase (recommended)`}
			/>

			<CodeBlock
				title="Add the key to the ssh-agent"
				code={`# macOS - store the passphrase in your Keychain
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# Windows (Git Bash) & Linux
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519`}
			/>

			<CodeBlock
				title="Copy your public key"
				code={`# macOS
pbcopy < ~/.ssh/id_ed25519.pub

# Windows (Git Bash)
cat ~/.ssh/id_ed25519.pub | clip

# Linux - print it, then copy the output
cat ~/.ssh/id_ed25519.pub`}
			/>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Then go to GitHub <strong>Settings</strong> &rarr; <strong>SSH and GPG keys</strong> &rarr;
				<strong>New SSH key</strong>, paste the key, and save. Verify the connection works:
			</p>

			<CodeBlock
				title="Test the connection"
				code={`ssh -T git@github.com
# Hi your-username! You've successfully authenticated...`}
			/>

			<Callout type="important">
				Only ever share the <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.pub</code
				> file. The private key (the one without an extension) must never leave your machine — treat it
				like the master key to your accounts.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				With SSH, repository URLs look different — use the <strong>SSH</strong> tab of the green
				<strong>Code</strong> button when copying a clone URL:
			</p>

			<CodeBlock
				title="Clone over SSH"
				code={`git clone git@github.com:Your-Enterprise/your-project.git
# No username or token prompt - your key authenticates you`}
			/>

			<h4 class="mt-7 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Which One Should You Use?
			</h4>

			<Callout type="tip">
				<strong>SSH</strong> if it's your own machine and you push daily — one-time setup, then it
				disappears from your life.
				<strong>A fine-grained token</strong> for scripts, CI pipelines, or short-lived access to a
				specific repo.
				<strong>Neither</strong> if a tool can sign you in through the browser — see below.
			</Callout>

			<h4 class="mt-7 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The Modern Shortcut: GitHub CLI
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In practice, many developers today never copy a token at all. The <strong>GitHub CLI</strong
				>
				(<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">gh</code
				>) is GitHub's official command-line tool. Where
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git</code
				>
				talks to the repository,
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">gh</code
				>
				talks to GitHub itself — authentication, pull requests, issues, releases — all without leaving
				your terminal. Download it from
				<a
					href="https://cli.github.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium underline underline-offset-2"
					style="color: var(--color-primary);">cli.github.com</a
				> or install it with your package manager:
			</p>

			<CodeBlock
				title="Install GitHub CLI"
				code={`# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux - see cli.github.com for your distro's instructions`}
			/>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Then one command handles the entire authentication setup interactively — including
				generating and uploading an SSH key if you ask it to:
			</p>

			<CodeBlock
				title="Authenticate once, interactively"
				code={`gh auth login
# Pick HTTPS or SSH, sign in through your browser,
# and it configures Git for you`}
			/>

			<Callout type="tip">
				Once <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>gh auth login</code
				>
				succeeds, every
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git clone</code
				>,
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">pull</code
				>, and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">push</code
				>
				just works — and you get bonus commands like
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>gh pr create</code
				> to open a pull request straight from your terminal.
			</Callout>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				And if you're using VS Code, it handles GitHub authentication the same way — when you clone
				a private repo or push for the first time, it opens your browser to sign in. No tokens to
				generate, copy, or store:
			</p>

			<VsCodeScreenshot
				src="github/auth-prompt.webp"
				alt="VS Code showing GitHub authentication prompt in the browser"
				caption="VS Code automatically opens your browser to sign in to GitHub -- no tokens to manage."
			/>

			<VibeBox
				prompts={[
					'Generate an ed25519 SSH key and add it to my GitHub account',
					'Help me decide between SSH and a personal access token for this machine'
				]}
			/>
		</div>

		<!-- 1.3 Cloning -->
		<div id="section-1-3" class="mb-14">
			<SectionHeader
				level="section"
				icon={Download}
				title="1.3 The First Pull (Cloning the Repository)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				Your team's code exists on a remote server. Cloning is the act of bringing the entire
				project — every file, every branch, every commit in its history — right onto your machine.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-clone.webp"
					alt="git clone — remote repository copied to your local machine"
					caption="Cloning creates a complete copy of the remote repository on your machine"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> The code exists on the server, but not on your machine. You need
				to download a complete copy ("clone") of the repository.
			</Callout>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				To get a copy of the project on your machine, run the clone command with the repository URL
				your team shared with you:
			</p>

			<CodeBlock
				title="Clone the repository"
				code="git clone https://github.com/Your-Enterprise/your-project.git"
			/>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The VS Code Way
			</h4>

			<ol
				class="mb-4 list-inside list-decimal space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>Open VS Code. Click <strong>"Clone Repository"</strong> on the Welcome page</li>
				<li>
					Or use the Command Palette (<kbd
						class="rounded border px-1 py-0.5 text-[11px]"
						style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
						>Cmd+Shift+P</kbd
					>
					/
					<kbd
						class="rounded border px-1 py-0.5 text-[11px]"
						style="border-color: var(--color-border); background: var(--color-bg-tertiary);"
						>Ctrl+Shift+P</kbd
					>) and type <strong>Git: Clone</strong>
				</li>
				<li>Paste the HTTPS URL. VS Code handles authentication automatically</li>
				<li>Choose a save location, then open the folder</li>
			</ol>

			<VsCodeScreenshot
				src="quickstart/clone-repository-url.webp"
				alt="VS Code Clone Repository dialog showing URL input field"
				caption="Use Cmd+Shift+P → 'Git: Clone' and paste the repository URL. VS Code handles the rest."
			/>

			<p class="mt-4 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				One thing to keep in mind after cloning:
			</p>

			<Callout type="note">
				When you clone, you only get the default branch (e.g., <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code
				>) checked out. Other branches exist as remote-tracking branches until you explicitly check
				them out.
			</Callout>

			<VibeBox
				prompts={[
					'Clone the repo at github.com/our-team/project into my projects folder',
					'Clone this repository and set up the development environment'
				]}
			/>
		</div>

		<!-- 1.4 .gitignore -->
		<div id="section-1-4" class="mb-14">
			<SectionHeader
				level="section"
				icon={EyeOff}
				title="1.4 What NOT to Commit (.gitignore)"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You asked the AI to scaffold your project, and it delivered: dependencies installed, an
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.env</code
				>
				file holding your API keys, and a working app. Then it helpfully runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				>
				— and now your secrets, your
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>node_modules</code
				>
				folder, and a stray
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.DS_Store</code
				> are all staged for your first commit. Before that happens, you need to teach Git what to ignore.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/gitignore.webp"
					alt=".gitignore — a gatekeeper filtering secrets and junk files out of the repository"
					caption="A .gitignore file is the guardrail that makes 'git add .' safe — secrets and junk never enter history"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> AI agents move fast and stage everything. Without a guardrail,
				one
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				> can commit API keys, gigabytes of dependencies, and OS junk into a history that everyone on
				your team will clone.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				A <strong style="color: var(--color-text);">.gitignore</strong> file is a plain text file at
				the root of your repository that lists patterns of files Git should pretend don't exist.
				Ignored files never show up as "untracked" in
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git status</code
				>, and
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git add .</code
				> silently skips them. The file itself gets committed, so the whole team — and every AI agent
				working in the repo — shares the same guardrail.
			</p>

			<CodeBlock
				title=".gitignore — a realistic starter for a JS/Python project"
				code={`# Dependencies
node_modules/
.venv/
__pycache__/
*.pyc

# Secrets & local config
.env
.env.*
!.env.example

# Build output
dist/
build/
coverage/

# Logs & caches
*.log
.cache/

# OS & editor junk
.DS_Store
Thumbs.db
.idea/`}
			/>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Pattern Syntax Essentials
			</h4>

			<ul
				class="mb-5 list-inside list-disc space-y-1.5 text-[13px]"
				style="color: var(--color-text-secondary);"
			>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">*.log</code
					>
					— a glob: matches any file ending in <strong>.log</strong>, in any directory
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">dist/</code
					> — a trailing slash matches only directories (and everything inside them)
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>/config.json</code
					> — a leading slash anchors the pattern to the repository root
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>docs/**/*.tmp</code
					>
					—
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">**</code
					> matches any depth of nested directories
				</li>
				<li>
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);"
						>!.env.example</code
					>
					— a leading
					<code
						class="rounded px-1 py-0.5 text-xs"
						style="background: var(--color-code-bg); font-family: var(--font-mono);">!</code
					> negates a pattern, re-including a file an earlier rule excluded (it can't re-include anything
					inside an excluded directory, though)
				</li>
			</ul>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				The Gotcha: Already-Tracked Files Stay Tracked
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				<strong style="color: var(--color-text);">.gitignore only affects untracked files.</strong> If
				a file was already committed before you added it to .gitignore, Git keeps tracking it — and keeps
				committing your changes to it. To stop tracking a file without deleting it from your disk, remove
				it from the index:
			</p>

			<CodeBlock
				title="Untrack a file that's already committed"
				code={`git rm --cached .env
# For a whole directory:
git rm -r --cached node_modules

# Then commit the removal
git commit -m "chore: stop tracking ignored files"`}
			/>

			<Callout type="warning">
				<strong>If a secret was ever committed, removing it in a new commit is not enough.</strong>
				The key still exists in every older commit, and anyone who clones the repository can read it.
				Treat a pushed secret as compromised: <strong>rotate the credential immediately</strong>
				(revoke the key and issue a new one), then scrub it from history with a rewriting tool like
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git filter-repo</code
				> — a topic we'll return to when we cover rewriting history. Rotation comes first; no amount of
				history surgery un-leaks a key that's already been seen.
			</Callout>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				A Global Ignore File for OS and Editor Junk
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Files like <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.DS_Store</code
				>
				(macOS) or
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">Thumbs.db</code
				>
				(Windows) are about <em>your machine</em>, not the project. Instead of asking every
				repository to ignore them, configure a
				<strong style="color: var(--color-text);">global ignore file</strong> that applies to all your
				repositories:
			</p>

			<CodeBlock
				title="Set up a global ignore file (once per machine)"
				code={`git config --global core.excludesFile ~/.gitignore_global

echo ".DS_Store" >> ~/.gitignore_global
echo "Thumbs.db" >> ~/.gitignore_global`}
			/>

			<Callout type="tip">
				Rule of thumb: project artifacts (builds, dependencies, secrets) go in the repository's <strong
					>.gitignore</strong
				> so the whole team is protected; personal noise (your OS, your editor) goes in your global ignore
				file.
			</Callout>

			<VibeBox
				prompts={[
					'Write a .gitignore for this project — look at my stack and include editor and OS artifacts',
					"Check my repo for tracked files that look like secrets or build artifacts that shouldn't be committed"
				]}
			/>
		</div>

		<!-- 1.5 Git Hooks -->
		<div id="section-1-5">
			<SectionHeader
				level="section"
				icon={Webhook}
				title="1.5 Automating Quality with Git Hooks"
				color="var(--color-primary)"
			/>

			<p class="mb-4 text-[14.5px] leading-relaxed" style="color: var(--color-text-secondary);">
				You told your agent: "always run the tests before committing." It did — for the first three
				commits. Then, deep in a refactor, it forgot, and a broken commit landed in history. Rules
				that live in a prompt are suggestions. Rules that live in Git are law. That's what
				<strong style="color: var(--color-text);">hooks</strong> are for.
			</p>

			<div class="my-6">
				<ExpandableImage
					src="{base}/images/git-hooks.webp"
					alt="Git hooks — an automated checkpoint that inspects every commit before it's allowed through"
					caption="A hook is a script Git runs at key moments — a mechanical gate no commit can skip"
				/>
			</div>

			<Callout type="note">
				<strong>The Problem:</strong> You can't rely on yourself — or an AI agent — to remember to lint,
				test, and format before every commit. You need the check to happen automatically, every time,
				with no memory required.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				A <strong style="color: var(--color-text);">Git hook</strong> is a script that Git runs
				automatically at a specific moment — before a commit is created, after a merge, before a
				push. Hooks live in the
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git/hooks/</code
				>
				directory of your repository, where Git puts a set of
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.sample</code
				>
				files to get you started. One crucial detail:
				<strong style="color: var(--color-text);">
					the .git directory is never committed, so hooks are not versioned</strong
				> — they don't travel with a clone. We'll fix that in a moment.
			</p>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				A Minimal pre-commit Hook
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The <strong style="color: var(--color-text);">pre-commit</strong> hook runs before Git
				creates a commit. If the script exits with a non-zero status, the commit is blocked. Create
				a file named
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>.git/hooks/pre-commit</code
				> (no file extension) and make it executable:
			</p>

			<CodeBlock
				title=".git/hooks/pre-commit"
				code={`#!/bin/sh
echo "Running checks before commit..."

npm run lint || { echo "Lint failed - commit blocked." >&2; exit 1; }
npm test || { echo "Tests failed - commit blocked." >&2; exit 1; }`}
			/>

			<CodeBlock title="Make it executable (once)" code="chmod +x .git/hooks/pre-commit" />

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				From now on, every <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				> in this repository runs your lint and test suite first. If either fails, nothing gets committed
				— no exceptions, no forgetting.
			</p>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Enforcing Commit Message Standards
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				The <strong style="color: var(--color-text);">commit-msg</strong> hook receives the path to
				a file containing the proposed commit message. Here's a compact one that enforces
				<strong style="color: var(--color-text);">Conventional Commits</strong>
				(messages like
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>feat: add login form</code
				>):
			</p>

			<CodeBlock
				title=".git/hooks/commit-msg"
				code={`#!/bin/sh
if ! grep -qE '^(feat|fix|docs|style|refactor|test|chore)(\\(.+\\))?!?: .+' "$1"; then
  echo "Commit message must follow Conventional Commits, e.g. 'feat: add login form'" >&2
  exit 1
fi`}
			/>

			<h4 class="mt-5 mb-2 text-[14px] font-semibold" style="color: var(--color-text);">
				Making Hooks Shareable
			</h4>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				Since <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git/hooks/</code
				>
				isn't versioned, your teammates (and their agents) won't get your hooks automatically. The lightweight
				fix is a committed hooks folder plus
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>core.hooksPath</code
				>:
			</p>

			<CodeBlock
				title="Option 1: a versioned hooks folder"
				code={`mkdir .githooks
# move your hook scripts into .githooks/, then:
git config core.hooksPath .githooks

# commit the folder - each teammate runs the config command once`}
			/>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				In the JavaScript world, <strong style="color: var(--color-text);">Husky</strong> is the
				popular tool that automates exactly this — it wires up the hooks path when anyone runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">npm install</code
				>:
			</p>

			<CodeBlock
				title="Option 2: Husky"
				code={`npm install --save-dev husky
npx husky init

# your hooks now live in the committed .husky/ folder
echo "npm test" > .husky/pre-commit`}
			/>

			<Callout type="important">
				<strong>Hooks fire on agent commits too.</strong> When Claude Code, Cursor, or any AI agent
				runs
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">git commit</code
				>, your pre-commit and commit-msg hooks run exactly as if you'd typed the command yourself.
				This is how you enforce standards on AI-authored code
				<em>without trusting the AI to remember</em> — the agent literally cannot commit failing code
				or a sloppy message. Better yet, agents read the error output and usually fix the problem and
				retry on their own.
			</Callout>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				One escape hatch to know about: <code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>git commit --no-verify</code
				>
				skips the pre-commit and commit-msg hooks entirely. It exists for genuine emergencies — a broken
				hook blocking a critical hotfix — but use it sparingly. Every
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">--no-verify</code
				> is a hole in your safety net, and it's a habit you especially don't want your agents learning.
			</p>

			<VibeBox
				prompts={[
					'Set up a pre-commit hook that runs our lint and test scripts and blocks the commit if either fails',
					'Add a commit-msg hook enforcing Conventional Commits, and make the hooks shareable with the team via Husky'
				]}
			/>
		</div>
	</div>
</section>
