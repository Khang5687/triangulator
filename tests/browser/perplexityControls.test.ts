import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ChromeClient } from '../../src/browser/types.js';
import {
  ensurePerplexityMode,
  ensurePerplexityRecency,
  ensurePerplexitySources,
  ensurePerplexityThinking,
} from '../../src/browser/actions/perplexityControls.js';

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: fsMocks,
  mkdir: fsMocks.mkdir,
  writeFile: fsMocks.writeFile,
}));

const logger = vi.fn();

beforeEach(() => {
  logger.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ensurePerplexityMode', () => {
  test('logs when mode already selected', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({ result: { value: { status: 'already-selected', label: 'Search' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensurePerplexityMode(runtime, 'search', logger)).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Perplexity mode: Search');
  });

  test('throws when mode controls missing', async () => {
    const runtime = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ result: { value: { status: 'missing' } } })
        .mockResolvedValue({ result: { value: null } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensurePerplexityMode(runtime, 'search', logger)).rejects.toThrow(
      /Unable to locate Perplexity mode controls/i,
    );
  });
});

describe('ensurePerplexityRecency', () => {
  test('logs when recency selected', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({ result: { value: { status: 'selected', label: 'Last Year' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensurePerplexityRecency(runtime, 'year', logger)).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Recency: Last Year');
  });

  test('throws after timeout when selection fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({ result: { value: { status: 'option-missing' } } }),
    } as unknown as ChromeClient['Runtime'];

    const promise = ensurePerplexityRecency(runtime, 'month', logger);
    const assertion = expect(promise).rejects.toThrow(/Unable to select Perplexity recency filter/i);
    await vi.advanceTimersByTimeAsync(8_000);
    await assertion;
  });
});

describe('ensurePerplexitySources', () => {
  test('logs when sources toggled', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({
        result: { value: { status: 'ok', missing: [], disabled: [], toggled: ['web'], already: [] } },
      }),
    } as unknown as ChromeClient['Runtime'];

    await expect(
      ensurePerplexitySources(runtime, logger, { sources: ['web'], connectors: null }),
    ).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Sources updated: web');
  });

  test('logs and skips unavailable sources when skipFailedSources is true', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({
        result: { value: { status: 'ok', missing: ['github'], disabled: ['asana'], toggled: [], already: [] } },
      }),
    } as unknown as ChromeClient['Runtime'];

    await expect(
      ensurePerplexitySources(runtime, logger, { sources: ['github'], connectors: ['asana'], skipFailedSources: true }),
    ).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Sources skipped (unavailable): github, asana');
  });

  test('throws and writes debug log when skipFailedSources is false', async () => {
    const mkdirSpy = fsMocks.mkdir;
    const writeSpy = fsMocks.writeFile;
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({
        result: {
          value: {
            status: 'ok',
            missing: ['github'],
            disabled: ['asana'],
            toggled: [],
            already: [],
            snapshot: { sample: 'snapshot', candidates: ['web'] },
          },
        },
      }),
    } as unknown as ChromeClient['Runtime'];

    await expect(
      ensurePerplexitySources(runtime, logger, { sources: ['github'], connectors: ['asana'], skipFailedSources: false }),
    ).rejects.toThrow(/Unable to enable Perplexity sources\/connectors/);
    expect(mkdirSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalled();
  });
});

describe('ensurePerplexityThinking', () => {
  test('logs unsupported toggle and continues', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({ result: { value: { status: 'unsupported' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensurePerplexityThinking(runtime, true, logger)).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Thinking toggle: unsupported; continuing with default.');
  });

  test('logs when toggle updated', async () => {
    const runtime = {
      evaluate: vi.fn().mockResolvedValue({ result: { value: { status: 'toggled' } } }),
    } as unknown as ChromeClient['Runtime'];

    await expect(ensurePerplexityThinking(runtime, false, logger)).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Thinking toggle: updated');
  });
});
