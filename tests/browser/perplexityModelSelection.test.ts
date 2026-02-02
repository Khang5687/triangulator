import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { ChromeClient } from '../../src/browser/types.js';
import { ensureModelSelection } from '../../src/browser/actions/modelSelection.js';

const logger = vi.fn();

beforeEach(() => {
  logger.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureModelSelection (Perplexity)', () => {
  test('logs when model already selected', async () => {
    const runtime = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ result: { value: 'perplexity.ai' } })
        .mockResolvedValueOnce({ result: { value: { status: 'already-selected', label: 'GPT-5.2' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensureModelSelection(runtime, 'GPT-5.2', logger)).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Model picker: GPT-5.2');
  });

  test('falls back when desired model unavailable', async () => {
    const runtime = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ result: { value: 'perplexity.ai' } })
        .mockResolvedValueOnce({ result: { value: { status: 'option-not-found', available: ['Best'] } } })
        .mockResolvedValueOnce({ result: { value: { status: 'selected', label: 'Sonar' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(
      ensureModelSelection(runtime, 'Claude Opus 4.5', logger, 'select', { fallback: 'Sonar' }),
    ).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Model picker: "Claude Opus 4.5" unavailable; falling back to "Sonar".');
    expect(logger).toHaveBeenCalledWith('Model picker: Sonar');
  });

  test('throws with guidance when model disabled and no fallback', async () => {
    const runtime = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ result: { value: 'perplexity.ai' } })
        .mockResolvedValueOnce({
          result: { value: { status: 'disabled', label: 'Claude Opus 4.5', reason: 'Model disabled (plan restriction)' } },
        }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensureModelSelection(runtime, 'Claude Opus 4.5', logger)).rejects.toThrow(
      /Perplexity model "Claude Opus 4.5" unavailable/,
    );
  });

  test('skips when strategy=ignore', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValueOnce({ result: { value: 'perplexity.ai' } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensureModelSelection(runtime, 'GPT-5.2', logger, 'ignore')).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Model picker: skipped (strategy=ignore)');
    expect(runtime.evaluate).toHaveBeenCalledTimes(1);
  });
});
