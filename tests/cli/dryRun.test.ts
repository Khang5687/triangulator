import { describe, expect, test, vi } from 'vitest';
import { runDryRunSummary } from '../../src/cli/dryRun.js';
import type { RunOracleOptions } from '../../src/oracle.js';

const baseRunOptions: RunOracleOptions = {
  prompt: 'Explain the issue',
  model: 'gpt-5.2-pro',
  file: [],
};

describe('runDryRunSummary', () => {
  test('prints API token summary and file stats', async () => {
    const log = vi.fn();
    await runDryRunSummary(
      {
        engine: 'api',
        runOptions: { ...baseRunOptions, file: ['notes.md'] },
        cwd: '/repo',
        version: '1.2.3',
        log,
      },
      {
        readFilesImpl: async () => [{ path: '/repo/notes.md', content: 'console.log("dry run")' }],
      },
    );
    const header = log.mock.calls.find(([entry]) => String(entry).includes('would call gpt-5.2-pro'));
    expect(header?.[0]).toContain('[dry-run]');
    expect(log.mock.calls.some(([entry]) => String(entry).includes('File Token Usage'))).toBe(true);
  });

  test('prints browser attachment summary', async () => {
    const log = vi.fn();
    await runDryRunSummary(
      {
        engine: 'browser',
        runOptions: { ...baseRunOptions, file: ['report.txt'] },
        cwd: '/repo',
        version: '2.0.0',
        log,
        browserConfig: {
          cookieSync: true,
          cookieNames: ['pplx_session'],
          inlineCookies: null,
          inlineCookiesSource: null,
          chromeProfile: 'Default',
          chromePath: null,
          url: 'https://www.perplexity.ai/',
          timeoutMs: 1_200_000,
          inputTimeoutMs: 30_000,
          headless: false,
          keepBrowser: false,
          hideWindow: false,
          desiredModel: null,
          debug: false,
          allowCookieErrors: false,
        },
      },
      {
        assembleBrowserPromptImpl: async () => ({
          markdown: 'bundle',
          composerText: 'prompt',
          estimatedInputTokens: 77,
          attachments: [{ path: '/repo/report.txt', displayPath: 'report.txt', sizeBytes: 2048 }],
          inlineFileCount: 0,
          tokenEstimateIncludesInlineFiles: false,
          attachmentsPolicy: 'auto',
          attachmentMode: 'upload',
          fallback: null,
        }),
      },
    );
    const header = log.mock.calls.find(([entry]) => String(entry).includes('would launch browser mode'));
    expect(header?.[0]).toContain('browser mode');
    expect(log.mock.calls.some(([entry]) => String(entry).includes('Attachments to upload'))).toBe(true);
    expect(log.mock.calls.some(([entry]) => String(entry).includes('report.txt'))).toBe(true);
    expect(log.mock.calls.some(([entry]) => String(entry).includes('Cookies: copy from Chrome'))).toBe(true);
  });

  test('logs inline cookie strategy', async () => {
    const log = vi.fn();
    await runDryRunSummary(
      {
        engine: 'browser',
        runOptions: { ...baseRunOptions, model: 'gpt-5.1' },
        cwd: '/repo',
        version: '3.0.0',
        log,
        browserConfig: {
          cookieSync: true,
          cookieNames: null,
          inlineCookies: [
            { name: 'pplx_session', value: 'token', domain: 'perplexity.ai' },
            { name: 'pplx_user', value: 'personal', domain: 'perplexity.ai' },
          ],
          inlineCookiesSource: 'inline-file',
          chromeProfile: 'Default',
          chromePath: null,
          url: 'https://www.perplexity.ai/',
          timeoutMs: 1_200_000,
          inputTimeoutMs: 30_000,
          headless: false,
          keepBrowser: false,
          hideWindow: false,
          desiredModel: null,
          debug: false,
          allowCookieErrors: false,
        },
      },
      {
        assembleBrowserPromptImpl: async () => ({
          markdown: 'bundle',
          composerText: 'prompt',
          estimatedInputTokens: 10,
          attachments: [],
          inlineFileCount: 0,
          tokenEstimateIncludesInlineFiles: false,
          attachmentsPolicy: 'auto',
          attachmentMode: 'inline',
          fallback: null,
        }),
      },
    );
    expect(log.mock.calls.some(([entry]) => String(entry).includes('Cookies: inline payload'))).toBe(true);
  });
});
