<script lang="ts">
	import { Copy, Check } from 'lucide-svelte';

	let {
		code,
		lang = 'bash',
		title = ''
	}: { code: string; lang?: string; title?: string } = $props();

	let copied = $state(false);

	function copyCode() {
		navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="group relative my-4 overflow-hidden rounded-lg" style="background: var(--color-terminal-bg);">
	{#if title || lang}
		<div
			class="flex items-center justify-between border-b px-4 py-2"
			style="border-color: var(--color-terminal-border);"
		>
			<span class="text-xs font-medium" style="color: var(--color-text-muted);">
				{title || lang}
			</span>
			<button
				onclick={copyCode}
				class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-xs transition-opacity"
				style="color: var(--color-text-muted);"
				aria-label="Copy code"
			>
				{#if copied}
					<Check size={14} />
					<span>Copied</span>
				{:else}
					<Copy size={14} />
					<span class="opacity-0 transition-opacity group-hover:opacity-100">Copy</span>
				{/if}
			</button>
		</div>
	{:else}
		<button
			onclick={copyCode}
			class="absolute top-2 right-2 flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
			style="color: var(--color-text-muted); background: var(--color-terminal-bg);"
			aria-label="Copy code"
		>
			{#if copied}
				<Check size={14} />
				<span>Copied</span>
			{:else}
				<Copy size={14} />
				<span>Copy</span>
			{/if}
		</button>
	{/if}
	<pre class="overflow-x-auto p-4 text-sm leading-relaxed" style="color: var(--color-terminal-text); font-family: var(--font-mono); margin: 0;"><code>{code}</code></pre>
</div>
