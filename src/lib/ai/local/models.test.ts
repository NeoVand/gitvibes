import { describe, expect, it } from 'vitest';
import {
	attemptCascade,
	canRunModel,
	DEFAULT_MODEL_ID,
	getModelSpec,
	LEGACY_MODEL_IDS,
	LOCAL_MODELS,
	QUALITY_MODEL_ID,
	selectBackend
} from './models';

const small = getModelSpec(DEFAULT_MODEL_ID)!;
const big = getModelSpec(QUALITY_MODEL_ID)!;

describe('model catalog', () => {
	it('ships the two expected models with honest sizes', () => {
		expect(LOCAL_MODELS).toHaveLength(2);
		expect(small.id).toBe('LiquidAI/LFM2.5-1.2B-Instruct-ONNX');
		expect(small.sizeMb).toBe(760);
		expect(small.requiresWebGpu).toBe(false);
		expect(small.tagline).toContain('tool calling');
		expect(small.license).toContain('LFM Open License');
		expect(big.requiresWebGpu).toBe(true);
		expect(big.recommendedRamGb).toBe(8);
		expect(big.license).toBe('Apache 2.0');
	});

	it('migration: legacy 0.8B flags are purged, cache cleanup targets it', () => {
		expect(LEGACY_MODEL_IDS).toContain('onnx-community/Qwen3.5-0.8B-Text-ONNX');
		expect(getModelSpec(LEGACY_MODEL_IDS[0])).toBeNull();
	});

	it('gates the 2B behind WebGPU', () => {
		expect(canRunModel(big, { webgpu: false, ramGb: 8 }).ok).toBe(false);
		expect(canRunModel(big, { webgpu: true, ramGb: 8 }).ok).toBe(true);
	});

	it('gates by RAM when the browser reports it', () => {
		expect(canRunModel(big, { webgpu: true, ramGb: 2 }).ok).toBe(false);
		expect(canRunModel(small, { webgpu: false, ramGb: 2 }).ok).toBe(false);
		expect(canRunModel(small, { webgpu: false, ramGb: 4 }).ok).toBe(true);
		// Unknown RAM → benefit of the doubt (the warm-up probe still decides).
		expect(canRunModel(big, { webgpu: true, ramGb: null }).ok).toBe(true);
	});

	it('builds the device attempt cascade per model', () => {
		expect(attemptCascade(small, { webgpu: true, ramGb: 8 })).toEqual(['webgpu', 'wasm']);
		expect(attemptCascade(small, { webgpu: false, ramGb: 8 })).toEqual(['wasm']);
		expect(attemptCascade(big, { webgpu: true, ramGb: 8 })).toEqual(['webgpu']);
		expect(attemptCascade(big, { webgpu: false, ramGb: 8 })).toEqual([]);
	});
});

describe('backend selection ladder (webgpu → wasm → mock)', () => {
	const caps = { webgpu: true, ramGb: 8 };

	it('prefers webgpu when everything lines up', () => {
		expect(selectBackend(small, caps, true)).toBe('local-webgpu');
	});

	it('falls to wasm when the webgpu probe failed', () => {
		expect(selectBackend(small, caps, true, { webgpu: false })).toBe('local-wasm');
	});

	it('falls to mock when every device probe failed', () => {
		expect(selectBackend(small, caps, true, { webgpu: false, wasm: false })).toBe('mock');
	});

	it('never leaves mock without an explicit download', () => {
		expect(selectBackend(small, caps, false)).toBe('mock');
	});

	it('is mock without a model or without capability', () => {
		expect(selectBackend(null, caps, true)).toBe('mock');
		expect(selectBackend(big, { webgpu: false, ramGb: 8 }, true)).toBe('mock');
	});

	it('2B has no wasm rung: failed webgpu probe → mock', () => {
		expect(selectBackend(big, caps, true, { webgpu: false })).toBe('mock');
	});

	it('wasm-only browsers run the 0.8B on wasm', () => {
		expect(selectBackend(small, { webgpu: false, ramGb: 8 }, true)).toBe('local-wasm');
	});
});
