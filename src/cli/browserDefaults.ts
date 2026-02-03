import { normalizePerplexityUrl, PERPLEXITY_URL } from '../browserMode.js';
import type { UserConfig } from '../config.js';
import type { ThinkingTimeLevel } from '../oracle.js';
import type { BrowserModelStrategy } from '../browser/types.js';

export interface BrowserDefaultsOptions {
  perplexityUrl?: string;
  chatgptUrl?: string;
  browserUrl?: string;
  browserChromeProfile?: string;
  browserChromePath?: string;
  browserCookiePath?: string;
  browserTimeout?: string | number;
  browserInputTimeout?: string | number;
  browserCookieWait?: string | number;
  browserPort?: number;
  browserHeadless?: boolean;
  browserHideWindow?: boolean;
  browserKeepBrowser?: boolean;
  browserModelStrategy?: BrowserModelStrategy;
  browserThinkingTime?: ThinkingTimeLevel;
  browserManualLogin?: boolean;
  browserManualLoginProfileDir?: string | null;
  browserNoSubmit?: boolean;
  perplexityMode?: string;
  perplexityThinking?: boolean;
  perplexityRecency?: string;
  perplexitySources?: string;
  perplexityConnectors?: string;
  skipFailedSources?: boolean;
  modelFallback?: string;
}

type SourceGetter = (key: keyof BrowserDefaultsOptions) => string | undefined;

export function applyBrowserDefaultsFromConfig(
  options: BrowserDefaultsOptions,
  config: UserConfig,
  getSource: SourceGetter,
): void {
  const browser = config.browser;
  if (!browser) return;
  const browserAny = browser as Record<string, unknown>;

  const isUnset = (key: keyof BrowserDefaultsOptions): boolean => {
    const source = getSource(key);
    return source === undefined || source === 'default';
  };

  const configuredPerplexityUrl = browser.perplexityUrl ?? browser.chatgptUrl ?? browser.url;
  const cliUrlSet =
    options.perplexityUrl !== undefined || options.chatgptUrl !== undefined || options.browserUrl !== undefined;
  if (isUnset('perplexityUrl') && !cliUrlSet && configuredPerplexityUrl !== undefined) {
    options.perplexityUrl = normalizePerplexityUrl(configuredPerplexityUrl ?? '', PERPLEXITY_URL);
  }

  if (isUnset('browserChromeProfile') && browser.chromeProfile !== undefined) {
    options.browserChromeProfile = browser.chromeProfile ?? undefined;
  }
  if (isUnset('browserChromePath') && browser.chromePath !== undefined) {
    options.browserChromePath = browser.chromePath ?? undefined;
  }
  if (isUnset('browserCookiePath') && browser.chromeCookiePath !== undefined) {
    options.browserCookiePath = browser.chromeCookiePath ?? undefined;
  }
  if (isUnset('browserUrl') && options.browserUrl === undefined && browser.url !== undefined) {
    options.browserUrl = browser.url;
  }
  if (isUnset('browserTimeout') && typeof browser.timeoutMs === 'number') {
    options.browserTimeout = String(browser.timeoutMs);
  }
  if (isUnset('browserPort') && typeof browser.debugPort === 'number') {
    options.browserPort = browser.debugPort;
  }
  if (isUnset('browserInputTimeout') && typeof browser.inputTimeoutMs === 'number') {
    options.browserInputTimeout = String(browser.inputTimeoutMs);
  }
  if (isUnset('browserCookieWait') && typeof browser.cookieSyncWaitMs === 'number') {
    options.browserCookieWait = String(browser.cookieSyncWaitMs);
  }
  if (isUnset('browserHeadless') && browser.headless !== undefined) {
    options.browserHeadless = browser.headless;
  }
  if (isUnset('browserHideWindow') && browser.hideWindow !== undefined) {
    options.browserHideWindow = browser.hideWindow;
  }
  if (isUnset('browserKeepBrowser') && browser.keepBrowser !== undefined) {
    options.browserKeepBrowser = browser.keepBrowser;
  }
  if (isUnset('browserModelStrategy') && browser.modelStrategy !== undefined) {
    options.browserModelStrategy = browser.modelStrategy;
  }
  if (isUnset('browserThinkingTime') && browser.thinkingTime !== undefined) {
    options.browserThinkingTime = browser.thinkingTime;
  }
  if (isUnset('browserManualLogin') && browser.manualLogin !== undefined) {
    options.browserManualLogin = browser.manualLogin;
  }
  if (isUnset('browserManualLoginProfileDir') && browser.manualLoginProfileDir !== undefined) {
    options.browserManualLoginProfileDir = browser.manualLoginProfileDir;
  }
  if (isUnset('browserNoSubmit') && (browser as { noSubmit?: boolean }).noSubmit !== undefined) {
    options.browserNoSubmit = (browser as { noSubmit?: boolean }).noSubmit;
  }
  if (isUnset('browserNoSubmit') && browserAny.no_submit !== undefined) {
    options.browserNoSubmit = Boolean(browserAny.no_submit);
  }
  if (isUnset('perplexityMode') && browser.perplexityMode !== undefined) {
    options.perplexityMode = browser.perplexityMode ?? undefined;
  }
  if (isUnset('perplexityMode') && browserAny.perplexity_mode !== undefined) {
    options.perplexityMode = String(browserAny.perplexity_mode);
  }
  if (isUnset('perplexityThinking') && browser.perplexityThinking !== undefined) {
    options.perplexityThinking = browser.perplexityThinking;
  }
  if (isUnset('perplexityThinking') && browserAny.perplexity_thinking !== undefined) {
    options.perplexityThinking = Boolean(browserAny.perplexity_thinking);
  }
  if (isUnset('perplexityRecency') && browser.perplexityRecency !== undefined) {
    options.perplexityRecency = browser.perplexityRecency ?? undefined;
  }
  if (isUnset('perplexityRecency') && browserAny.perplexity_recency !== undefined) {
    options.perplexityRecency = String(browserAny.perplexity_recency);
  }
  if (isUnset('perplexitySources') && browser.perplexitySources !== undefined) {
    options.perplexitySources = Array.isArray(browser.perplexitySources)
      ? browser.perplexitySources.join(',')
      : browser.perplexitySources ?? undefined;
  }
  if (isUnset('perplexitySources') && browserAny.perplexity_sources !== undefined) {
    options.perplexitySources = Array.isArray(browserAny.perplexity_sources)
      ? (browserAny.perplexity_sources as string[]).join(',')
      : String(browserAny.perplexity_sources);
  }
  if (isUnset('perplexityConnectors') && browser.perplexityConnectors !== undefined) {
    options.perplexityConnectors = Array.isArray(browser.perplexityConnectors)
      ? browser.perplexityConnectors.join(',')
      : browser.perplexityConnectors ?? undefined;
  }
  if (isUnset('perplexityConnectors') && browserAny.perplexity_connectors !== undefined) {
    options.perplexityConnectors = Array.isArray(browserAny.perplexity_connectors)
      ? (browserAny.perplexity_connectors as string[]).join(',')
      : String(browserAny.perplexity_connectors);
  }
  if (isUnset('skipFailedSources') && browser.skipFailedSources !== undefined) {
    options.skipFailedSources = browser.skipFailedSources;
  }
  if (isUnset('skipFailedSources') && browserAny.skip_failed_sources !== undefined) {
    options.skipFailedSources = Boolean(browserAny.skip_failed_sources);
  }
  if (isUnset('modelFallback') && browser.modelFallback !== undefined) {
    options.modelFallback = browser.modelFallback ?? undefined;
  }
  if (isUnset('modelFallback') && browserAny.model_fallback !== undefined) {
    options.modelFallback = String(browserAny.model_fallback);
  }
}
