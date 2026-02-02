import { describe, expect, test } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdtemp, rm, writeFile, stat, access, readFile } from 'node:fs/promises';
import { runBrowserMode } from '../../src/browser/index.js';
import type { BrowserAttachment } from '../../src/browser/types.js';
import { acquireLiveTestLock, releaseLiveTestLock } from './liveLock.js';
import { getCookies } from '@steipete/sweet-cookie';

const LIVE = process.env.TRIANGULATOR_LIVE_TEST === '1' || process.env.ORACLE_LIVE_TEST === '1';
const SPACE_URL =
  process.env.TRIANGULATOR_PERPLEXITY_SPACE_URL ??
  'https://www.perplexity.ai/spaces/triangulator-0U6ZuYXTRQCTHPmLdhgWhQ';
const FITNESS_ROOT =
  process.env.TRIANGULATOR_FITUP_ROOT ??
  '/Users/khangnguyen/working/projects/fitup/fitness';

const MODES = ['search', 'deep_research'] as const;

async function loadLocalBrowserConfig(): Promise<{
  chromeProfile?: string;
  chromeCookiePath?: string;
  chromePath?: string;
}> {
  const homeDir = process.env.TRIANGULATOR_HOME ?? path.join(os.homedir(), '.triangulator');
  const configPath = process.env.TRIANGULATOR_CONFIG_PATH ?? path.join(homeDir, 'config.json');
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { browser?: Record<string, unknown> };
    const browser = parsed.browser ?? {};
    return {
      chromeProfile: typeof browser.chromeProfile === 'string' ? browser.chromeProfile : undefined,
      chromeCookiePath: typeof browser.chromeCookiePath === 'string' ? browser.chromeCookiePath : undefined,
      chromePath: typeof browser.chromePath === 'string' ? browser.chromePath : undefined,
    };
  } catch {
    return {};
  }
}

async function hasPerplexitySession(): Promise<boolean> {
  const localConfig = await loadLocalBrowserConfig();
  try {
    const { cookies } = await getCookies({
      url: 'https://www.perplexity.ai',
      origins: ['https://www.perplexity.ai'],
      browsers: ['chrome'],
      mode: 'merge',
      chromeProfile: localConfig.chromeCookiePath ?? localConfig.chromeProfile ?? 'Default',
      timeoutMs: 5_000,
    });
    return cookies.length > 0;
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function toAttachment(filePath: string): Promise<BrowserAttachment> {
  const stats = await stat(filePath);
  return {
    path: filePath,
    displayPath: path.basename(filePath),
    sizeBytes: stats.size,
  };
}

async function buildFitnessAttachments(tmpDir: string): Promise<{ attachments: BrowserAttachment[]; token: string } | null> {
  const techSpec = path.join(FITNESS_ROOT, 'docs', 'TECH_SPEC.md');
  const synergy = path.join(FITNESS_ROOT, 'docs', 'synergy.md');
  const database = path.join(FITNESS_ROOT, 'lib', 'features', 'common', 'local', 'app_database.dart');
  const workoutMedia = path.join(FITNESS_ROOT, 'lib', 'features', 'workout', 'repository', 'workout_media_store.dart');

  const required = [techSpec, synergy, database, workoutMedia];
  for (const entry of required) {
    if (!(await fileExists(entry))) {
      console.warn(`Skipping live attachment test; missing ${entry}`);
      return null;
    }
  }

  const token = `triangulator-live-${Date.now()}`;
  const tokenFile = path.join(tmpDir, 'triangulator-token.txt');
  await writeFile(tokenFile, `TOKEN:${token}\n`);

  const largePdf = path.join(tmpDir, 'triangulator-large.pdf');
  await writeFile(largePdf, crypto.randomBytes(6 * 1024 * 1024));

  const attachments: BrowserAttachment[] = [];
  attachments.push(await toAttachment(tokenFile));
  attachments.push(await toAttachment(techSpec));
  attachments.push(await toAttachment(synergy));
  attachments.push(await toAttachment(database));
  attachments.push(await toAttachment(workoutMedia));
  attachments.push(await toAttachment(largePdf));

  return { attachments, token };
}

(LIVE ? describe : describe.skip)('Perplexity attachment live tests', () => {
  test.each(MODES)(
    'uploads mixed attachments in %s mode and returns token',
    async (mode) => {
      if (!(await hasPerplexitySession())) {
        console.warn('Skipping Perplexity live test (missing cookies).');
        return;
      }
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'triangulator-live-attach-'));
      await acquireLiveTestLock('perplexity-browser');
      try {
        const bundle = await buildFitnessAttachments(tmpDir);
        if (!bundle) {
          return;
        }
        const { attachments, token } = bundle;
        const localConfig = await loadLocalBrowserConfig();
        const prompt = `Please read the attached files and reply with the token only: ${token}`;
        const result = await runBrowserMode({
          prompt,
          attachments,
          config: {
            url: SPACE_URL,
            perplexityMode: mode,
            perplexityThinking: true,
            desiredModel: 'GPT-5.2',
            timeoutMs: 420_000,
            inputTimeoutMs: 90_000,
            chromeProfile: localConfig.chromeProfile ?? undefined,
            chromeCookiePath: localConfig.chromeCookiePath ?? undefined,
            chromePath: localConfig.chromePath ?? undefined,
          },
        });
        expect(result.answerText.toLowerCase()).toContain(token.toLowerCase());
      } finally {
        await releaseLiveTestLock('perplexity-browser');
        await rm(tmpDir, { recursive: true, force: true });
      }
    },
    15 * 60 * 1000,
  );
});
