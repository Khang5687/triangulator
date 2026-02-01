import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, afterEach } from 'vitest';
import { buildBrowserConfig } from '../../src/cli/browserConfig.js';
import { setTriangulatorHomeDirOverrideForTest } from '../../src/oracleHome.js';

const model = 'gpt-5.1' as const;

describe('buildBrowserConfig inline cookies', () => {
  afterEach(() => {
    setTriangulatorHomeDirOverrideForTest(null);
    delete process.env.TRIANGULATOR_BROWSER_COOKIES_JSON;
    delete process.env.TRIANGULATOR_BROWSER_COOKIES_FILE;
  });

  test('loads inline cookies from explicit file flag', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'triangulator-inline-'));
    try {
      const file = path.join(tmp, 'cookies.json');
      await fs.writeFile(
        file,
        JSON.stringify([{ name: 'pplx_session', value: 'abc', domain: 'perplexity.ai' }]),
      );
      const config = await buildBrowserConfig({ browserInlineCookiesFile: file, model });
      expect(config.inlineCookies?.[0]?.name).toBe('pplx_session');
      expect(config.inlineCookiesSource).toBe('inline-file');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test('treats inline payload value as file path when it exists', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'triangulator-inline-arg-'));
    try {
      const file = path.join(tmp, 'cookies.json');
      await fs.writeFile(file, JSON.stringify([{ name: 'pplx_user', value: 'personal', domain: 'perplexity.ai' }]));
      const config = await buildBrowserConfig({ browserInlineCookies: file, model });
      expect(config.inlineCookies?.[0]?.name).toBe('pplx_user');
      expect(config.inlineCookiesSource).toBe('inline-arg');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test('ignores ~/.triangulator/cookies.json when cookie sync is enabled', async () => {
    const fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'triangulator-home-'));
    const triangulatorDir = path.join(fakeHome, '.triangulator');
    setTriangulatorHomeDirOverrideForTest(triangulatorDir);
    await fs.mkdir(triangulatorDir, { recursive: true });
    const homeFile = path.join(triangulatorDir, 'cookies.json');
    await fs.writeFile(homeFile, JSON.stringify([{ name: 'cf_clearance', value: 'token', domain: 'perplexity.ai' }]));
    const config = await buildBrowserConfig({ model });
    expect(config.inlineCookies).toBeUndefined();
    expect(config.inlineCookiesSource).toBeNull();
  });

  test('uses ~/.triangulator/cookies.json when cookie sync is disabled', async () => {
    const fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'triangulator-home-'));
    const triangulatorDir = path.join(fakeHome, '.triangulator');
    setTriangulatorHomeDirOverrideForTest(triangulatorDir);
    await fs.mkdir(triangulatorDir, { recursive: true });
    const homeFile = path.join(triangulatorDir, 'cookies.json');
    await fs.writeFile(homeFile, JSON.stringify([{ name: 'cf_clearance', value: 'token', domain: 'perplexity.ai' }]));
    const config = await buildBrowserConfig({ model, browserNoCookieSync: true });
    expect(config.inlineCookies?.[0]?.name).toBe('cf_clearance');
    expect(config.inlineCookiesSource).toBe('home:cookies.json');
  });
});
