import fs from 'node:fs/promises';
import path from 'node:path';
import JSON5 from 'json5';
import os from 'node:os';
import { getTriangulatorHomeDir } from './oracleHome.js';
import type { BrowserModelStrategy } from './browser/types.js';
import type { ThinkingTimeLevel } from './oracle/types.js';

export type EnginePreference = 'api' | 'browser';

export interface NotifyConfig {
  enabled?: boolean;
  sound?: boolean;
  muteIn?: Array<'CI' | 'SSH'>;
}

export interface BrowserConfigDefaults {
  chromeProfile?: string | null;
  chromePath?: string | null;
  chromeCookiePath?: string | null;
  perplexityUrl?: string | null;
  /** Legacy config key (Oracle). */
  chatgptUrl?: string | null;
  /** Legacy alias (Oracle). */
  url?: string;
  /** Perplexity-only: mode (search, deep_research, create_files). */
  perplexityMode?: string | null;
  /** Perplexity-only: thinking toggle (true/false). */
  perplexityThinking?: boolean;
  /** Perplexity-only: recency filter (all/day/week/month/year). */
  perplexityRecency?: string | null;
  /** Perplexity-only: sources to enable (web, academic, social). */
  perplexitySources?: string[] | null;
  /** Perplexity-only: connectors to enable. */
  perplexityConnectors?: string[] | null;
  /** Skip unavailable sources/connectors (default true). */
  skipFailedSources?: boolean;
  /** Optional model fallback when requested model is unavailable. */
  modelFallback?: string | null;
  /** Delegate browser automation to a remote `triangulator serve` instance (host:port). */
  remoteHost?: string | null;
  /** Access token clients must provide to the remote `triangulator serve` instance. */
  remoteToken?: string | null;
  /** Optional metadata for the SSH reverse-tunnel that makes remoteHost reachable. */
  remoteViaSshReverseTunnel?: RemoteViaSshReverseTunnelConfig | null;
  timeoutMs?: number;
  debugPort?: number | null;
  inputTimeoutMs?: number;
  cookieSyncWaitMs?: number;
  headless?: boolean;
  hideWindow?: boolean;
  keepBrowser?: boolean;
  modelStrategy?: BrowserModelStrategy;
  /** Thinking time intensity: 'light', 'standard', 'extended', 'heavy' */
  thinkingTime?: ThinkingTimeLevel;
  /** Skip cookie sync and reuse a persistent automation profile (waits for manual login). */
  manualLogin?: boolean;
  /** Manual-login profile directory override (also available via TRIANGULATOR_BROWSER_PROFILE_DIR). */
  manualLoginProfileDir?: string | null;
}

export interface AzureConfig {
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

export interface RemoteViaSshReverseTunnelConfig {
  ssh?: string;
  remotePort?: number;
  localPort?: number;
  identity?: string;
  extraArgs?: string;
}

export interface UserConfig {
  engine?: EnginePreference;
  model?: string;
  search?: 'on' | 'off';
  notify?: NotifyConfig;
  browser?: BrowserConfigDefaults;
  heartbeatSeconds?: number;
  filesReport?: boolean;
  background?: boolean;
  promptSuffix?: string;
  apiBaseUrl?: string;
  azure?: AzureConfig;
  sessionRetentionHours?: number;
}

function resolveConfigPath(): string {
  return path.join(getTriangulatorHomeDir(), 'config.json');
}

function resolveLegacyConfigPath(): string {
  const legacyHome = process.env.ORACLE_HOME_DIR ?? path.join(os.homedir(), '.oracle');
  return path.join(legacyHome, 'config.json');
}

async function migrateLegacyConfigIfNeeded(nextPath: string, legacyPath: string): Promise<void> {
  try {
    await fs.stat(nextPath);
    return;
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') {
      throw error;
    }
  }

  let legacyStat;
  try {
    legacyStat = await fs.stat(legacyPath);
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (!legacyStat?.isFile?.()) {
    return;
  }

  await fs.mkdir(path.dirname(nextPath), { recursive: true, mode: 0o700 });
  await fs.copyFile(legacyPath, nextPath);
  if (process.platform !== 'win32') {
    await fs.chmod(nextPath, legacyStat.mode & 0o777).catch(() => undefined);
  }
}

export interface LoadConfigResult {
  config: UserConfig;
  path: string;
  loaded: boolean;
}

export async function loadUserConfig(): Promise<LoadConfigResult> {
  const CONFIG_PATH = resolveConfigPath();
  const LEGACY_PATH = resolveLegacyConfigPath();
  await migrateLegacyConfigIfNeeded(CONFIG_PATH, LEGACY_PATH).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to migrate legacy config (${LEGACY_PATH}): ${message}`);
  });
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON5.parse(raw) as UserConfig;
    return { config: parsed ?? {}, path: CONFIG_PATH, loaded: true };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ENOENT') {
      return { config: {}, path: CONFIG_PATH, loaded: false };
    }
    console.warn(`Failed to read ${CONFIG_PATH}: ${error instanceof Error ? error.message : String(error)}`);
    return { config: {}, path: CONFIG_PATH, loaded: false };
  }
}
export function configPath(): string {
  return resolveConfigPath();
}
