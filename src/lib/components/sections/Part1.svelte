<script lang="ts">
	import { Laptop, UserCheck, KeyRound, Download } from 'lucide-svelte';
	import Callout from '../ui/Callout.svelte';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import VsCodePlaceholder from '../ui/VsCodePlaceholder.svelte';
</script>

<section id="part-1" class="py-20">
	<div class="mx-auto max-w-4xl px-6">
		<div class="mb-12 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl"
				style="background: var(--color-primary-dim); color: var(--color-primary);"
			>
				<Laptop size={22} />
			</div>
			<div>
				<p class="text-sm font-medium" style="color: var(--color-primary);">Part 1</p>
				<h2 class="text-2xl font-bold" style="color: var(--color-text);">
					Enterprise Onboarding: Connecting to Your Codebase
				</h2>
			</div>
		</div>

		<!-- 1.1 Git Config -->
		<div id="section-1-1" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<UserCheck size={18} style="color: var(--color-primary);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					1.1 First-Time Local Configuration (Your Identity)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> You have a new machine with a fresh installation of Git. Before
					you can make your first commit, Git requires you to set your identity. This identity is a
					permanent digital signature baked into every single change you make.
				{/snippet}
			</Callout>

			<p class="mb-4" style="color: var(--color-text-secondary);">
				In an enterprise, traceability is paramount. Every line of code, every commit, must be
				tied to a specific individual. Using your correct enterprise name and email is a
				non-negotiable requirement.
			</p>

			<CodeBlock
				title="Set your identity"
				code={`git config --global user.name "Your Name"
git config --global user.email "your-enterprise-email@company.com"`}
			/>

			<Callout type="tip">
				{#snippet children()}
					The <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">--global</code> flag saves
					this configuration for every Git repository on your computer, so you only have to do this once.
				{/snippet}
			</Callout>
		</div>

		<!-- 1.2 Authentication -->
		<div id="section-1-2" class="mb-16">
			<div class="mb-4 flex items-center gap-2">
				<KeyRound size={18} style="color: var(--color-primary);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					1.2 Authentication with Personal Access Token
				</h3>
			</div>

			<Callout type="warning">
				{#snippet children()}
					<strong>The Problem:</strong> Your company's code is stored in a private repository.
					You must prove to the server that you are authorized. Most enterprises have disabled
					simple password authentication for Git operations.
				{/snippet}
			</Callout>

			<p class="mb-3" style="color: var(--color-text-secondary);">
				To clone company repositories, you'll need a <strong>Personal Access Token (PAT)</strong>:
			</p>

			<ol
				class="mb-6 list-inside list-decimal space-y-2 text-sm"
				style="color: var(--color-text-secondary);"
			>
				<li>Go to GitHub <strong>Settings</strong> &rarr; <strong>Developer settings</strong> &rarr; <strong>Personal access tokens</strong> &rarr; <strong>Tokens (classic)</strong></li>
				<li>Click <strong>Generate new token (classic)</strong></li>
				<li>Give it a descriptive name (e.g., "My Work Laptop - VS Code")</li>
				<li>Set an expiration (recommend 90 days)</li>
				<li>Select scopes: <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">repo</code> and <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">read:org</code></li>
				<li>Click <strong>Generate token</strong> and copy it immediately</li>
			</ol>

			<CodeBlock
				title="Clone using your token"
				code={`git clone https://github.com/Your-Enterprise/your-project.git
# Username: your-github-username
# Password: your-personal-access-token`}
			/>

			<h4 class="mb-3 mt-6 text-base font-semibold" style="color: var(--color-text);">
				Storing Your Credentials
			</h4>

			<CodeBlock
				title="Save credentials (choose your OS)"
				code={`# macOS - Store in Keychain (recommended)
git config --global credential.helper osxkeychain

# Windows - Use Windows Credential Manager (recommended)
git config --global credential.helper manager

# Linux - Store in encrypted file
git config --global credential.helper libsecret`}
			/>

			<Callout type="tip">
				{#snippet children()}
					After running one of these commands, the next time you clone, pull, or push, Git will
					prompt you once for your username and token, then save it for future use.
				{/snippet}
			</Callout>
		</div>

		<!-- 1.3 Cloning -->
		<div id="section-1-3" class="mb-8">
			<div class="mb-4 flex items-center gap-2">
				<Download size={18} style="color: var(--color-primary);" />
				<h3 class="text-xl font-semibold" style="color: var(--color-text);">
					1.3 The First Pull (Cloning the Repository)
				</h3>
			</div>

			<Callout type="note">
				{#snippet children()}
					<strong>The Problem:</strong> The code exists on the server, but not on your machine. You
					need to download a complete copy, or "clone," the repository.
				{/snippet}
			</Callout>

			<CodeBlock
				title="Clone the repository"
				code="git clone https://github.com/Your-Enterprise/your-project.git"
			/>

			<h4 class="mb-3 mt-6 text-base font-semibold" style="color: var(--color-text);">
				The VS Code Way
			</h4>

			<ol
				class="mb-4 list-inside list-decimal space-y-2 text-sm"
				style="color: var(--color-text-secondary);"
			>
				<li>Open VS Code. Click <strong>"Clone Repository"</strong> on the Welcome page</li>
				<li>Or open the Command Palette (<kbd class="rounded border px-1.5 py-0.5 text-xs" style="border-color: var(--color-border); background: var(--color-bg-tertiary);">Cmd+Shift+P</kbd>) and type <strong>Git: Clone</strong></li>
				<li>Paste the HTTPS URL. VS Code will handle authentication</li>
				<li>Choose where to save, then open the folder</li>
			</ol>

			<VsCodePlaceholder
				description="Screenshot: VS Code Welcome page with 'Clone Repository' button highlighted, and the Command Palette showing 'Git: Clone' command"
			/>

			<Callout type="note">
				{#snippet children()}
					When you <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">git clone</code>, you only get the default branch (e.g., <code class="rounded px-1.5 py-0.5 text-xs" style="background: var(--color-code-bg); font-family: var(--font-mono);">main</code>)
					checked out locally. All other branches still exist as "remote-tracking" branches.
				{/snippet}
			</Callout>
		</div>
	</div>
</section>
