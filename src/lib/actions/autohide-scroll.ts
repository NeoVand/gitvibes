/**
 * Auto-hiding scrollbar for panel scroll areas: invisible at rest, visible
 * while the pointer is over the panel or while it is actively scrolling,
 * fading out shortly after use. Pairs with the .autohide-scrollbar styles
 * in layout.css.
 */
export function autohideScroll(node: HTMLElement) {
	node.classList.add('autohide-scrollbar');

	let timer: ReturnType<typeof setTimeout> | undefined;
	const onScroll = () => {
		node.classList.add('is-scrolling');
		clearTimeout(timer);
		timer = setTimeout(() => node.classList.remove('is-scrolling'), 800);
	};

	node.addEventListener('scroll', onScroll, { passive: true });
	return {
		destroy() {
			node.removeEventListener('scroll', onScroll);
			clearTimeout(timer);
		}
	};
}
