/**
 * Lifted from LangX (src/lib/runtime/async-context.ts, same author):
 * a synchronous AsyncLocalStorage shim for the browser.
 *
 * LangGraph's `interrupt()` (and context vars) read the current run config
 * from `AsyncLocalStorageProviderSingleton`. In Node that's backed by real
 * `node:async_hooks`; the browser has none, so LangChain falls back to a
 * mock whose `getStore()` always returns `undefined` — which is why
 * `interrupt()` throws "Called interrupt() outside the context of a graph"
 * in the browser (see langchain-ai/langgraphjs#879).
 *
 * We can't fully replicate async_hooks: native `await` bypasses userland
 * Promise hooks in V8, so context cannot survive an `await`. But it CAN
 * survive the synchronous portion of a node — which is all `interrupt()`
 * needs, because our deepagent calls it synchronously at the top of the
 * tools node (before any await). A stack-restoring `run()` is enough to
 * make the approval gate work in the browser.
 */
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons';

class SyncAsyncLocalStorage<T> {
	#store: T | undefined = undefined;

	getStore(): T | undefined {
		return this.#store;
	}

	run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R {
		const previous = this.#store;
		this.#store = store;
		try {
			return callback(...args);
		} finally {
			this.#store = previous;
		}
	}

	enterWith(store: T): void {
		this.#store = store;
	}
}

let installed = false;

/**
 * Installs the browser shim as the global async-context store. No-op outside
 * the browser (Node already has a real AsyncLocalStorage) and idempotent —
 * `initializeGlobalInstance` never clobbers an existing instance.
 */
export function installBrowserAsyncContext(): void {
	if (typeof window === 'undefined' || installed) return;
	installed = true;
	AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new SyncAsyncLocalStorage() as never);
}
