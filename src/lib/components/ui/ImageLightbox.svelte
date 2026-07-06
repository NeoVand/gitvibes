<script lang="ts">
	import { X } from 'lucide-svelte';

	let {
		open = false,
		src = '',
		alt = '',
		onClose
	}: {
		open: boolean;
		src: string;
		alt: string;
		onClose: () => void;
	} = $props();

	let dialogEl: HTMLDivElement | undefined = $state(undefined);

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;

		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement as HTMLElement | null;
		document.body.style.overflow = 'hidden';
		dialogEl?.querySelector<HTMLElement>('button[aria-label="Close"]')?.focus();

		return () => {
			document.body.style.overflow = previousOverflow;
			previousFocus?.focus?.();
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			onClose();
			return;
		}
		// Keep Tab focus inside the dialog while it's open
		if (e.key === 'Tab' && dialogEl) {
			const focusable = [...dialogEl.querySelectorAll<HTMLElement>('button')];
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			if (e.shiftKey && (active === first || !dialogEl.contains(active))) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && (active === last || !dialogEl.contains(active))) {
				e.preventDefault();
				first.focus();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		bind:this={dialogEl}
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
		role="dialog"
		aria-modal="true"
		aria-label={alt || 'Expanded image'}
	>
		<button
			type="button"
			class="absolute inset-0 cursor-zoom-out bg-black/80 backdrop-blur-sm"
			onclick={onClose}
			aria-label="Close expanded image"
		></button>

		<button
			type="button"
			onclick={onClose}
			class="absolute top-4 right-4 z-[102] flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-80"
			style="background: rgba(0, 0, 0, 0.55); color: white;"
			aria-label="Close"
		>
			<X size={18} />
		</button>

		<img
			{src}
			{alt}
			class="relative z-[101] max-h-[90vh] max-w-[min(92vw,1200px)] rounded-lg object-contain shadow-2xl"
		/>
	</div>
{/if}
