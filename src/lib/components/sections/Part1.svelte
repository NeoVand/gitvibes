<script lang="ts">
	import { Laptop, UserCheck, KeyRound, Download } from 'lucide-svelte';
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
			authenticate, and clone. Do it once and it mostly stays done (expiring tokens are the one
			exception — SSH keys and <code
				class="rounded px-1.5 py-0.5 text-sm"
				style="background: var(--color-code-bg); font-family: var(--font-mono);">gh</code
			> sign-in are the true set-and-forget paths).
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
				Don't want to use the terminal? No problem. VS Code will prompt you to configure your
				identity the first time you commit — answer the prompt and it runs those two commands for
				you. (There's no palette command for this; the prompt or the terminal are the two paths.)
			</p>

			<p class="mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				To see what's already configured — or double-check what you just set — read it back:
			</p>

			<CodeBlock
				title="Verify your config"
				code={`git config user.name          # One value
git config --global --list    # Everything you've set globally`}
			/>

			<p class="mt-5 mb-3 text-[14px]" style="color: var(--color-text-secondary);">
				While you're here, four more one-time settings pay for themselves many times over:
			</p>

			<CodeBlock
				title="Quality-of-life defaults"
				code={`# New repos start on 'main' (matches GitHub; becomes Git's own
# built-in default in Git 3.0)
git config --global init.defaultBranch main

# Git messages open in VS Code instead of a terminal editor
git config --global core.editor "code --wait"

# First push of a new branch just works - no upstream error
git config --global push.autoSetupRemote true

# When you pull into local commits, replay yours on top
# (you'll meet the alternative in Part 3)
git config --global pull.rebase true`}
			/>

			<VibeBox
				prompts={[
					'Set up my Git config with my name and email on this machine',
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
				scope; add
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">read:org</code
				> only if you'll also sign in the gh CLI with it). If your team tells you to use one, the rest
				of the workflow is identical.
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
				code={`# macOS - usually preconfigured to use the Keychain; if not:
git config --global credential.helper osxkeychain

# Windows - Git for Windows ships with Credential Manager; if not:
git config --global credential.helper manager

# Linux - install Git Credential Manager (git-credential-manager),
# then:
git config --global credential.helper manager
# Lightweight alternative (holds credentials in memory ~15 min):
git config --global credential.helper cache`}
			/>

			<Callout type="tip">
				On macOS and Windows a helper is usually <em>already configured</em> by the installer — run
				these only if Git keeps re-prompting for your token. On Linux there's no default: install
				<strong>Git Credential Manager</strong> (or use
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">cache</code
				>). You may see older guides suggest
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">libsecret</code
				>
				— on Debian/Ubuntu that helper ships as source code you'd have to compile first, so it fails out
				of the box. Once a helper is set, Git prompts you once and saves the credentials.
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

			<Callout type="caution">
				<strong>Make it survive a reboot (macOS):</strong> without a config file, the agent forgets
				your key when you restart — and SSH auth mysteriously breaks days later. Create
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);"
					>~/.ssh/config</code
				>
				with the lines below (on Linux, drop the
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">UseKeychain</code
				> line):
			</Callout>

			<CodeBlock
				title="~/.ssh/config — load the key automatically"
				code={'Host *\n' +
					'  AddKeysToAgent yes\n' +
					'  UseKeychain yes\n' +
					'  IdentityFile ~/.ssh/id_ed25519'}
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
				<strong>Or let a tool set one of those two up for you</strong> — browser sign-in (below) stores
				an HTTPS token behind the scenes, no copy-pasting required.
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
				src="github/auth-prompt.png"
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
		<div id="section-1-3" class="mb-8">
			<SectionHeader
				level="section"
				icon={Download}
				title="1.3 Getting the Code (Cloning the Repository)"
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
				code={`git clone https://github.com/Your-Enterprise/your-project.git
cd your-project   # The clone lands in a NEW folder named after the repo`}
			/>

			<p class="mt-3 mb-3 text-[13px]" style="color: var(--color-text-secondary);">
				That new folder <em>is</em> the repository — specifically, the hidden
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git</code
				>
				directory inside it holds the entire history, every branch, all of it. Delete
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">.git</code
				>
				and you're left with an ordinary folder of files. (And the #1 "Git is broken!" beginner moment:
				running git commands from the <em>parent</em> folder — check you actually
				<code
					class="rounded px-1 py-0.5 text-xs"
					style="background: var(--color-code-bg); font-family: var(--font-mono);">cd</code
				>'d in.)
			</p>

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
				src="quickstart/clone-repository-url.png"
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
	</div>
</section>
