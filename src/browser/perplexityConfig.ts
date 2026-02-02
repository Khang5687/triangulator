import type { PerplexityMode, PerplexityRecency } from './types.js';

const PERPLEXITY_MODEL_LABELS = [
  'Best',
  'Sonar',
  'Gemini 3 Flash',
  'Gemini 3 Pro',
  'GPT-5.2',
  'Claude Sonnet 4.5',
  'Claude Opus 4.5',
  'Grok 4.1',
  'Kimi K2.5',
] as const;

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

export function normalizePerplexityModelLabel(value?: string | null): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'Best';
  }
  const clean = normalized.replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const has = (needle: string) => clean.includes(needle);
  const hasVersion = (major: number, minor: number) =>
    new RegExp(`\\b${major}\\s*\\.?\\s*${minor}\\b`).test(clean);

  if (has('best') || has('auto')) return 'Best';
  if (has('sonar')) return 'Sonar';
  const hasGemini3 = hasVersion(3, 0) || /\b3\b/.test(clean);
  if (has('gemini') && hasGemini3 && has('flash')) return 'Gemini 3 Flash';
  if (has('gemini') && hasGemini3 && has('pro')) return 'Gemini 3 Pro';
  if (has('gpt') && hasVersion(5, 2)) return 'GPT-5.2';
  if ((has('claude') || has('sonnet')) && hasVersion(4, 5) && has('sonnet')) return 'Claude Sonnet 4.5';
  if ((has('claude') || has('opus')) && hasVersion(4, 5) && has('opus')) return 'Claude Opus 4.5';
  if (has('grok') && hasVersion(4, 1)) return 'Grok 4.1';
  if (has('kimi') && (has('k2') || hasVersion(2, 5))) return 'Kimi K2.5';

  return 'Best';
}

export function listPerplexityModelLabels(): string[] {
  return [...PERPLEXITY_MODEL_LABELS];
}
