import type { PerplexityMode, PerplexityRecency } from './types.js';

export function parseCommaList(value?: string | string[] | null): string[] | null {
  if (!value) return null;
  const entries = Array.isArray(value) ? value : value.split(',');
  const normalized = entries
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized.length ? normalized : null;
}

export function normalizePerplexityMode(value?: string | null): PerplexityMode | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'search') return 'search';
  if (['deep', 'research', 'deep-research', 'deep_research', 'deep research'].includes(normalized)) {
    return 'deep_research';
  }
  if (
    ['create', 'create-files', 'create_files', 'files', 'apps', 'labs', 'studio'].includes(normalized)
  ) {
    return 'create_files';
  }
  return undefined;
}

export function normalizePerplexityRecency(value?: string | null): PerplexityRecency | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['all', 'any', 'anytime', 'all time', 'all-time'].includes(normalized)) return 'all';
  if (['day', 'today', '24h', '24hrs', '24 hours'].includes(normalized)) return 'day';
  if (['week', 'last week', '7d', '7 days'].includes(normalized)) return 'week';
  if (['month', 'last month', '30d', '30 days'].includes(normalized)) return 'month';
  if (['year', 'last year', '12m', '12 months'].includes(normalized)) return 'year';
  return undefined;
}

export function normalizePerplexitySources(input?: string[] | string | null): string[] | null {
  const entries = parseCommaList(input);
  if (!entries) return null;
  const mapped = entries
    .map((entry) => entry.toLowerCase())
    .map((entry) => {
      if (entry.startsWith('web')) return 'web';
      if (entry.startsWith('acad')) return 'academic';
      if (entry.startsWith('social')) return 'social';
      return '';
    })
    .filter(Boolean);
  return mapped.length ? Array.from(new Set(mapped)) : null;
}

export function normalizePerplexityConnectors(input?: string[] | string | null): string[] | null {
  const entries = parseCommaList(input);
  if (!entries) return null;
  const normalized = entries.map((entry) => entry.toLowerCase());
  return normalized.length ? Array.from(new Set(normalized)) : null;
}
