if (typeof globalThis.Buffer === 'undefined' && typeof window !== 'undefined') {
	const { Buffer } = await import('buffer');
	globalThis.Buffer = Buffer;
}
