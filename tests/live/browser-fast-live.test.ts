import { describe, test, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { runBrowserMode } from '../../src/browser/index.js';
import { acquireLiveTestLock, releaseLiveTestLock } from './liveLock.js';
import { getCookies } from '@steipete/sweet-cookie';

const LIVE = process.env.TRIANGULATOR_LIVE_TEST === '1' || process.env.ORACLE_LIVE_TEST === '1';
const FAST = process.env.TRIANGULATOR_LIVE_TEST_FAST === '1' || process.env.ORACLE_LIVE_TEST_FAST === '1';

async function hasPerplexitySession(): Promise<boolean> {
  try {
    const { cookies } = await getCookies({
      url: 'https://www.perplexity.ai',
      origins: ['https://www.perplexity.ai'],
      browsers: ['chrome'],
      mode: 'merge',
      chromeProfile: 'Default',
      timeoutMs: 5_000,
    });
    return cookies.length > 0;
  } catch {
    return false;
  }
}

(LIVE && FAST ? describe : describe.skip)('Perplexity browser fast live', () => {
  test(
    'falls back when a project URL is missing',
    async () => {
      if (!(await hasPerplexitySession())) {
        console.warn('Skipping fast live test (missing Perplexity session cookie).');
        return;
      }
      await acquireLiveTestLock('perplexity-browser');
      try {
        const promptToken = `fast fallback ${Date.now()}`;
        const result = await runBrowserMode({
          prompt: `${promptToken}\nReply with OK only.`,
          config: {
            url: 'https://www.perplexity.ai/spaces/does-not-exist',
            timeoutMs: 180_000,
            inputTimeoutMs: 20_000,
          },
        });
        expect(result.answerText.toLowerCase()).toContain('ok');
      } finally {
        await releaseLiveTestLock('perplexity-browser');
      }
    },
    6 * 60 * 1000,
  );

  test(
    'uploads attachments and sends the prompt (gpt-5.2)',
    async () => {
      if (!(await hasPerplexitySession())) {
        console.warn('Skipping fast live test (missing Perplexity session cookie).');
        return;
      }
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'triangulator-fast-live-'));
      await acquireLiveTestLock('perplexity-browser');
      try {
        const fileA = path.join(tmpDir, 'triangulator-fast-a.txt');
        const fileB = path.join(tmpDir, 'triangulator-fast-b.txt');
        await writeFile(fileA, `fast file a ${Date.now()}`);
        await writeFile(fileB, `fast file b ${Date.now()}`);
        const [statA, statB] = await Promise.all([stat(fileA), stat(fileB)]);
        const promptToken = `fast upload ${Date.now()}`;
        const result = await runBrowserMode({
          prompt: `${promptToken}\nReply with OK only.`,
          attachments: [
            { path: fileA, displayPath: 'triangulator-fast-a.txt', sizeBytes: statA.size },
            { path: fileB, displayPath: 'triangulator-fast-b.txt', sizeBytes: statB.size },
          ],
          config: {
            timeoutMs: 240_000,
            inputTimeoutMs: 60_000,
          },
        });
        expect(result.answerText.toLowerCase()).toContain('ok');
      } finally {
        await releaseLiveTestLock('perplexity-browser');
        await rm(tmpDir, { recursive: true, force: true });
      }
    },
    8 * 60 * 1000,
  );
});
