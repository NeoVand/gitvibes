/**
 * The local model catalog and the pure device/selection logic. Nothing here
 * touches the network or the GPU — capability probing that actually loads a
 * model lives in local-backend.ts (LangX kokoro-style: never trust a load
 * without a timed tiny generation).
 */

export interface LocalModelSpec {
	id: string;
	/** Short human label ("LFM2.5 1.2B"). */
	label: string;
	dtype: 'q4f16';
	/** Approximate download size of the q4f16 weights, in MB. */
	sizeMb: number;
	/** True when wasm is too slow / memory-hungry to be worth offering. */
	requiresWebGpu: boolean;
	recommendedRamGb: number;
	/** One-line card copy after the size. */
	tagline: string;
	/** Weight license shown in the gear settings. */
	license: string;
}

export const DEFAULT_MODEL_ID = 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX';
export const QUALITY_MODEL_ID = 'onnx-community/Qwen3.5-2B-ONNX';

/** Models we shipped before and no longer offer — their downloaded/selected
 * flags are purged on init and their cache entries deleted after the user
 * downloads a current model. */
export const LEGACY_MODEL_IDS = ['onnx-community/Qwen3.5-0.8B-Text-ONNX'];

export const LOCAL_MODELS: LocalModelSpec[] = [
	{
		// Single q4f16 decoder (760 MB, verified 2026-02 revision). Liquid's
		// LFM2.5 line is purpose-trained for reliable tool-call invocation
		// (Pythonic calls between <|tool_call_start|> tokens; the chat template
		// injects tool JSON into the system prompt — verified live).
		id: DEFAULT_MODEL_ID,
		label: 'LFM2.5 1.2B',
		dtype: 'q4f16',
		sizeMb: 760,
		requiresWebGpu: false,
		recommendedRamGb: 6,
		tagline: 'built for tool calling',
		license: 'LFM Open License v1.0'
	},
	{
		// Multimodal repo (decoder + embed_tokens + vision_encoder). The
		// text-generation pipeline skips the vision files (verified against
		// the transformers.js source).
		id: QUALITY_MODEL_ID,
		label: 'Qwen3.5 2B',
		dtype: 'q4f16',
		sizeMb: 1330,
		requiresWebGpu: true,
		recommendedRamGb: 8,
		tagline: 'better answers · needs WebGPU',
		license: 'Apache 2.0'
	}
];

export function getModelSpec(id: string): LocalModelSpec | null {
	return LOCAL_MODELS.find((m) => m.id === id) ?? null;
}

export interface DeviceCaps {
	webgpu: boolean;
	/** navigator.deviceMemory (Chrome caps it at 8); null when unavailable. */
	ramGb: number | null;
}

/** Cheap, synchronous capability sniff — safe to call at render time. */
export function detectCaps(): DeviceCaps {
	if (typeof navigator === 'undefined') return { webgpu: false, ramGb: null };
	const nav = navigator as Navigator & { gpu?: unknown; deviceMemory?: number };
	return {
		webgpu: typeof nav.gpu !== 'undefined',
		ramGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null
	};
}

export interface ModelGate {
	ok: boolean;
	reason?: string;
}

/** Can this model be OFFERED on this device? (The warm-up probe still decides.) */
export function canRunModel(spec: LocalModelSpec, caps: DeviceCaps): ModelGate {
	if (spec.requiresWebGpu && !caps.webgpu) {
		return { ok: false, reason: 'needs WebGPU, which this browser does not expose' };
	}
	if (caps.ramGb !== null && caps.ramGb < spec.recommendedRamGb / 2) {
		return { ok: false, reason: `needs ~${spec.recommendedRamGb} GB RAM` };
	}
	return { ok: true };
}

/**
 * Device attempt cascade for the warm-up probe: WebGPU first when exposed,
 * wasm as the fallback — unless the model is WebGPU-only.
 */
export function attemptCascade(spec: LocalModelSpec, caps: DeviceCaps): ('webgpu' | 'wasm')[] {
	if (spec.requiresWebGpu) return caps.webgpu ? ['webgpu'] : [];
	return caps.webgpu ? ['webgpu', 'wasm'] : ['wasm'];
}

export type BackendChoice = 'local-webgpu' | 'local-wasm' | 'mock';

/**
 * The selection ladder, as a pure function for tests: local on WebGPU when
 * everything lines up, local on wasm when the model allows it, mock otherwise.
 * `downloaded` = the user explicitly fetched this model before (we never
 * auto-download); `probed` = which devices survived the timed tiny generation
 * (null = not probed yet, so trust the static caps).
 */
export function selectBackend(
	spec: LocalModelSpec | null,
	caps: DeviceCaps,
	downloaded: boolean,
	probed: { webgpu?: boolean; wasm?: boolean } | null = null
): BackendChoice {
	if (!spec || !downloaded) return 'mock';
	if (!canRunModel(spec, caps).ok) return 'mock';
	for (const device of attemptCascade(spec, caps)) {
		const verdict = probed?.[device];
		if (verdict === false) continue;
		return device === 'webgpu' ? 'local-webgpu' : 'local-wasm';
	}
	return 'mock';
}

/* ── localStorage bookkeeping (explicit download consent + revisit warm) ── */

const DOWNLOADED_KEY = 'tv-agent-downloaded';
const SELECTED_KEY = 'tv-agent-model';

export function downloadedModels(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(DOWNLOADED_KEY);
		const list = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

export function markDownloaded(id: string) {
	if (typeof localStorage === 'undefined') return;
	const list = downloadedModels();
	if (!list.includes(id)) list.push(id);
	localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(list));
}

export function selectedModel(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(SELECTED_KEY);
}

export function rememberSelectedModel(id: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SELECTED_KEY, id);
}

export function forgetSelectedModel() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(SELECTED_KEY);
}

/**
 * Migration: drop downloaded/selected flags for models we no longer ship, so
 * a stale 0.8B flag can't suppress the first-run intro or claim a download
 * that the new default doesn't have.
 */
export function purgeLegacyFlags() {
	if (typeof localStorage === 'undefined') return;
	const list = downloadedModels().filter((id) => !LEGACY_MODEL_IDS.includes(id));
	localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(list));
	const selected = selectedModel();
	if (selected && LEGACY_MODEL_IDS.includes(selected)) {
		forgetSelectedModel();
	}
}

/**
 * Best-effort cleanup of retired models' weights from transformers.js's
 * Cache Storage — called after the user downloads a current model, so the
 * old ~450 MB never lingers alongside the new weights.
 */
export async function deleteLegacyModelCaches(): Promise<void> {
	if (typeof caches === 'undefined') return;
	try {
		const cache = await caches.open('transformers-cache');
		for (const request of await cache.keys()) {
			if (LEGACY_MODEL_IDS.some((id) => request.url.includes(id))) {
				await cache.delete(request);
			}
		}
	} catch {
		// Cache Storage unavailable (private mode, etc.) — nothing to clean.
	}
}
