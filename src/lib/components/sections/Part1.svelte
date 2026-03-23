<script lang="ts">
	import { Laptop, UserCheck, KeyRound, Download } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodeScreenshot from '../ui/VsCodeScreenshot.svelte';
	import SectionHeader from '../ui/SectionHeader.svelte';
	import VibeBox from '../ui/VibeBox.svelte';
</script>

<section id="part-1" class="border-t py-16" style="border-color: var(--color-border-light);">
	<div class="mx-auto max-w-3xl px-6">
		<SectionHeader
			icon={Laptop}
			partLabel="Part 1"
			title="Enterprise Onboarding: Connecting to Your Codebase"
			color="var(--color-primary)"
		/>

		<!-- 1.1 Git Config -->
		<div id="section-1-1" class="mb-14">
			<SectionHeader level="section" icon={UserCheck} title="1.1 First-Time Local Configuration" color="var(--color-primary)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You have a new machine with a fresh Git installation. Before
					your first commit, Git requires you to set your identity -- a permanent digital signature
					baked into every change you make.
				{/snippet}
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
				{#snippet children()}
					The <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">--global</code> flag saves this for every Git repository on your computer. You only need to do this once.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				Don't want to use the terminal? No problem. VS Code will actually prompt you to configure your identity the first time you try to use Git. You can also open the Command Palette (<kbd class="rounded border px-1 py-0.5 text-[11px]" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Cmd+Shift+P</kbd>) and search for <strong>"Git: Config"</strong> to set these values without touching the terminal.
			</p>

			<VibeBox prompts={[
				"Set up my Git config with my name and email for this project",
				"Configure Git to use VS Code as my default editor"
			]} />
		</div>

		<!-- 1.2 Authentication -->
		<div id="section-1-2" class="mb-14">
			<SectionHeader level="section" icon={KeyRound} title="1.2 Authentication with Personal Access Token" color="var(--color-primary)" />

			<Callout type="warning">
				{#snippet children()}
					<strong>The Problem:</strong> Your company's code is in a private repository. Most enterprises
					have disabled password authentication for Git operations. You need a Personal Access Token (PAT).
				{/snippet}
			</Callout>

			<ol class="mb-5 list-inside list-decimal space-y-1.5 text-[13px]" style="color: var(--color-text-secondary);">
				<li>Go to GitHub <strong>Settings</strong> &rarr; <strong>Developer settings</strong> &rarr; <strong>Personal access tokens</strong></li>
				<li>Click <strong>Generate new token (classic)</strong></li>
				<li>Name it descriptively (e.g., "Work Laptop")</li>
				<li>Set an expiration (90 days recommended)</li>
				<li>Select scopes: <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">repo</code> and <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">read:org</code></li>
				<li>Click <strong>Generate token</strong> and copy it immediately</li>
			</ol>

			<CodeBlock
				title="Clone using your token"
				code={`git clone https://github.com/Your-Enterprise/your-project.git
# Username: your-github-username
# Password: your-personal-access-token`}
			/>

			<h4 class="mb-2 mt-5 text-[14px] font-semibold" style="color: var(--color-text);">Storing Your Credentials</h4>

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
				{#snippet children()}
					After configuring a credential helper, the next time you clone, pull, or push, Git
					will prompt you once and then save the credentials for future use.
				{/snippet}
			</Callout>

			<p class="mb-3 mt-5 text-[14px]" style="color: var(--color-text-secondary);">
				That said, if you're using VS Code, you can skip the PAT setup entirely. VS Code handles GitHub authentication for you -- when you clone a private repo or push for the first time, it opens your browser to sign in. No tokens to generate, copy, or store:
			</p>

			<VsCodeScreenshot
				src="github/auth-prompt.png"
				alt="VS Code showing GitHub authentication prompt in the browser"
				caption="VS Code automatically opens your browser to sign in to GitHub -- no tokens to manage."
			/>

			<VibeBox prompts={[
				"Help me set up SSH authentication for GitHub",
				"Generate an SSH key and add it to my GitHub account"
			]} />
		</div>

		<!-- 1.3 Cloning -->
		<div id="section-1-3">
			<SectionHeader level="section" icon={Download} title="1.3 The First Pull (Cloning the Repository)" color="var(--color-primary)" />

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> The code exists on the server, but not on your machine.
					You need to download a complete copy ("clone") of the repository.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Clone the repository"
				code="git clone https://github.com/Your-Enterprise/your-project.git"
			/>

			<h4 class="mb-2 mt-5 text-[14px] font-semibold" style="color: var(--color-text);">The VS Code Way</h4>

			<ol class="mb-4 list-inside list-decimal space-y-1.5 text-[13px]" style="color: var(--color-text-secondary);">
				<li>Open VS Code. Click <strong>"Clone Repository"</strong> on the Welcome page</li>
				<li>Or use the Command Palette (<kbd class="rounded border px-1 py-0.5 text-[11px]" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Cmd+Shift+P</kbd>) and type <strong>Git: Clone</strong></li>
				<li>Paste the HTTPS URL. VS Code handles authentication automatically</li>
				<li>Choose a save location, then open the folder</li>
			</ol>

			<VsCodeScreenshot
				src="quickstart/clone-repository-url.png"
				alt="VS Code Clone Repository dialog showing URL input field"
				caption="Use Cmd+Shift+P → 'Git: Clone' and paste the repository URL. VS Code handles the rest."
			/>

			<Callout type="note">
				{#snippet children()}
					When you clone, you only get the default branch (e.g., <code class="rounded px-1 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>)
					checked out. Other branches exist as remote-tracking branches until you explicitly check them out.
				{/snippet}
			</Callout>

			<VibeBox prompts={[
				"Clone the repo at github.com/our-team/project into my projects folder",
				"Clone this repository and set up the development environment"
			]} />
		</div>
	</div>
</section>
