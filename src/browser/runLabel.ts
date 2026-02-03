import type { BrowserSessionConfig } from '../sessionStore.js';
import type { PerplexityMode, PerplexityRecency } from './types.js';

const PERPLEXITY_MODE_LABELS: Record<PerplexityMode, string> = {
  search: 'search',
  deep_research: 'deep research',
  create_files: 'create files',
};

const PERPLEXITY_RECENCY_LABELS: Record<PerplexityRecency, string> = {
  all: 'all',
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

export interface BrowserRunLabel {
  modelLabel: string;
  detailLabel?: string;
}

export function formatBrowserRunLabel(model: string, config?: BrowserSessionConfig): BrowserRunLabel {
  const modelLabel = config?.desiredModel?.trim() || model;
  const details: string[] = [];

  if (config?.perplexityMode) {
    details.push(`mode=${PERPLEXITY_MODE_LABELS[config.perplexityMode] ?? config.perplexityMode}`);
  }
  if (config?.perplexitySources && config.perplexitySources.length > 0) {
    details.push(`sources=${config.perplexitySources.join(',')}`);
  }
  if (config?.perplexityRecency) {
    details.push(`recency=${PERPLEXITY_RECENCY_LABELS[config.perplexityRecency] ?? config.perplexityRecency}`);
  }
  if (config?.perplexityThinking !== undefined) {
    details.push(`thinking=${config.perplexityThinking ? 'on' : 'off'}`);
  }
  if (config?.perplexityConnectors && config.perplexityConnectors.length > 0) {
    details.push(`connectors=${config.perplexityConnectors.join(',')}`);
  }

  return {
    modelLabel,
    detailLabel: details.length > 0 ? details.join(' · ') : undefined,
  };
}
