import type CDP from 'chrome-remote-interface';
import type Protocol from 'devtools-protocol';
import type { BrowserRuntimeMetadata } from '../sessionStore.js';
import type { ThinkingTimeLevel } from '../oracle/types.js';

export type ChromeClient = Awaited<ReturnType<typeof CDP>>;
export type CookieParam = Protocol.Network.CookieParam;
export type BrowserModelStrategy = 'select' | 'current' | 'ignore';
export type PerplexityMode = 'search' | 'deep_research' | 'create_files';
export type PerplexityRecency = 'all' | 'day' | 'week' | 'month' | 'year';

export type BrowserLogger = ((message: string) => void) & {
  verbose?: boolean;
  sessionLog?: (message: string) => void;
};

export interface BrowserAttachment {
  path: string;
  displayPath: string;
  sizeBytes?: number;
}

export interface BrowserAutomationConfig {
  chromeProfile?: string | null;
  chromePath?: string | null;
  chromeCookiePath?: string | null;
  url?: string;
  perplexityUrl?: string | null;
  /** Legacy config key (Oracle). */
  chatgptUrl?: string | null;
  timeoutMs?: number;
  debugPort?: number | null;
  inputTimeoutMs?: number;
  cookieSync?: boolean;
  cookieNames?: string[] | null;
  cookieSyncWaitMs?: number;
  inlineCookies?: CookieParam[] | null;
  inlineCookiesSource?: string | null;
  headless?: boolean;
  keepBrowser?: boolean;
  hideWindow?: boolean;
  desiredModel?: string | null;
  modelStrategy?: BrowserModelStrategy;
  debug?: boolean;
  allowCookieErrors?: boolean;
  remoteChrome?: { host: string; port: number } | null;
  manualLogin?: boolean;
  manualLoginProfileDir?: string | null;
  manualLoginCookieSync?: boolean;
  /** Thinking time intensity level for Thinking/Pro models: light, standard, extended, heavy */
  thinkingTime?: ThinkingTimeLevel;
  /** Perplexity-only: choose the Space mode. */
  perplexityMode?: PerplexityMode;
  /** Perplexity-only: toggle thinking when supported by the model. */
  perplexityThinking?: boolean;
  /** Perplexity-only: search recency filter. */
  perplexityRecency?: PerplexityRecency;
  /** Perplexity-only: sources to enable (web, academic, social). */
  perplexitySources?: string[] | null;
  /** Perplexity-only: connectors to enable (e.g., github, asana). */
  perplexityConnectors?: string[] | null;
  /** If true, skip unavailable sources/connectors; otherwise abort. */
  skipFailedSources?: boolean;
  /** Optional model fallback if requested model is unavailable. */
  modelFallback?: string | null;
}

export interface BrowserRunOptions {
  prompt: string;
  attachments?: BrowserAttachment[];
  /**
   * Optional secondary submission to try if the initial prompt is rejected by the browser composer
   * (e.g. inline file paste exceeds composer limits). Intended for auto inline->upload fallback.
   */
  fallbackSubmission?: { prompt: string; attachments: BrowserAttachment[] };
  config?: BrowserAutomationConfig;
  log?: BrowserLogger;
  heartbeatIntervalMs?: number;
  verbose?: boolean;
  /** Optional hook to persist runtime info (port/url/target) as soon as Chrome is ready. */
  runtimeHintCb?: (hint: BrowserRuntimeMetadata) => void | Promise<void>;
}

export interface BrowserRunResult {
  answerText: string;
  answerMarkdown: string;
  answerHtml?: string;
  tookMs: number;
  answerTokens: number;
  answerChars: number;
  chromePid?: number;
  chromePort?: number;
  chromeHost?: string;
  userDataDir?: string;
  chromeTargetId?: string;
  tabUrl?: string;
  controllerPid?: number;
}

export type ResolvedBrowserConfig = Required<
  Omit<
    BrowserAutomationConfig,
    'chromeProfile' | 'chromePath' | 'chromeCookiePath' | 'desiredModel' | 'remoteChrome' | 'thinkingTime' | 'modelStrategy'
  >
> & {
  chromeProfile?: string | null;
  chromePath?: string | null;
  chromeCookiePath?: string | null;
  desiredModel?: string | null;
  modelStrategy?: BrowserModelStrategy;
  thinkingTime?: ThinkingTimeLevel;
  debugPort?: number | null;
  inlineCookiesSource?: string | null;
  remoteChrome?: { host: string; port: number } | null;
  manualLogin?: boolean;
  manualLoginProfileDir?: string | null;
  manualLoginCookieSync?: boolean;
};
