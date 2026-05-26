if (typeof window !== 'undefined' && typeof globalThis.Buffer === 'undefined') {
	import('buffer').then(({ Buffer }) => {
		globalThis.Buffer = Buffer;
	});
}
