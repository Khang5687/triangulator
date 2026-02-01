import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const LIVE = process.env.TRIANGULATOR_LIVE_TEST === '1' || process.env.ORACLE_LIVE_TEST === '1';
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const baseUrl = process.env.OPENAI_BASE_URL ?? '';
const isOpenRouterBase = baseUrl.includes('openrouter');
const OPENAI_ENV = {
  // biome-ignore lint/style/useNamingConvention: environment variable key
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  // biome-ignore lint/style/useNamingConvention: environment variable key
  OPENROUTER_API_KEY: '',
};
const MCP_CONFIG = path.join(process.cwd(), 'config', 'mcporter.json');
const TRIANGULATOR_MCP_BIN = path.join(process.cwd(), 'dist', 'bin', 'triangulator-mcp.js');

async function assertBuiltArtifacts(): Promise<void> {
  await stat(TRIANGULATOR_MCP_BIN);
}

(LIVE && hasOpenAI && !isOpenRouterBase ? describe : describe.skip)('mcporter live (stdio triangulator-mcp)', () => {
  it(
    'lists triangulator-local schema',
    async () => {
      await assertBuiltArtifacts();
      const { stdout } = await execFileAsync(
        'pnpm',
        ['exec', 'mcporter', 'list', 'triangulator-local', '--schema', '--config', MCP_CONFIG],
        {
          env: { ...process.env, ...OPENAI_ENV },
          timeout: 60_000,
        },
      );
      expect(stdout).toContain('triangulator-local');
    },
    90_000,
  );

  it(
    'invokes consult via mcporter',
    async () => {
      await assertBuiltArtifacts();
      const { stdout } = await execFileAsync(
        'pnpm',
        [
          'exec',
          'mcporter',
          'call',
          'triangulator-local.consult',
          'prompt:Say hello from mcporter live',
          'model:gpt-4.1',
          'engine:api',
          '--config',
          MCP_CONFIG,
        ],
        { env: { ...process.env, ...OPENAI_ENV }, timeout: 120_000 },
      );
      expect(stdout.toLowerCase()).toContain('mcporter');
      expect(stdout.toLowerCase()).toContain('completed');
    },
    150_000,
  );
});
