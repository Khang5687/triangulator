import { describe, expect, it } from 'vitest';
import {
  normalizePerplexityMode,
  normalizePerplexityRecency,
  normalizePerplexitySources,
  normalizePerplexityConnectors,
  normalizePerplexityModelLabel,
  parseCommaList,
} from '../../src/browser/perplexityConfig.js';

describe('perplexityConfig', () => {
  it('normalizes mode values', () => {
    expect(normalizePerplexityMode('search')).toBe('search');
    expect(normalizePerplexityMode('Deep research')).toBe('deep_research');
    expect(normalizePerplexityMode('labs')).toBe('create_files');
    expect(normalizePerplexityMode('create-files')).toBe('create_files');
    expect(normalizePerplexityMode('unknown')).toBeUndefined();
  });

  it('normalizes recency values', () => {
    expect(normalizePerplexityRecency('all time')).toBe('all');
    expect(normalizePerplexityRecency('today')).toBe('day');
    expect(normalizePerplexityRecency('last week')).toBe('week');
    expect(normalizePerplexityRecency('last month')).toBe('month');
    expect(normalizePerplexityRecency('last year')).toBe('year');
    expect(normalizePerplexityRecency('n/a')).toBeUndefined();
  });

  it('parses comma lists', () => {
    expect(parseCommaList('web, academic, social')).toEqual(['web', 'academic', 'social']);
    expect(parseCommaList(['web', 'academic'])).toEqual(['web', 'academic']);
    expect(parseCommaList('')).toBeNull();
  });

  it('normalizes sources/connectors', () => {
    expect(normalizePerplexitySources('web, academic, social')).toEqual(['web', 'academic', 'social']);
    expect(normalizePerplexitySources('web,unknown')).toEqual(['web']);
    expect(normalizePerplexityConnectors('GitHub,asana')).toEqual(['github', 'asana']);
  });

  it('normalizes model labels with fallback', () => {
    expect(normalizePerplexityModelLabel('Best')).toBe('Best');
    expect(normalizePerplexityModelLabel('sonar')).toBe('Sonar');
    expect(normalizePerplexityModelLabel('gemini-3-flash')).toBe('Gemini 3 Flash');
    expect(normalizePerplexityModelLabel('Gemini 3 Pro')).toBe('Gemini 3 Pro');
    expect(normalizePerplexityModelLabel('gpt-5.2-pro')).toBe('GPT-5.2');
    expect(normalizePerplexityModelLabel('Claude Sonnet 4.5')).toBe('Claude Sonnet 4.5');
    expect(normalizePerplexityModelLabel('claude opus 4.5 max')).toBe('Claude Opus 4.5');
    expect(normalizePerplexityModelLabel('grok-4.1')).toBe('Grok 4.1');
    expect(normalizePerplexityModelLabel('kimi k2.5')).toBe('Kimi K2.5');
    expect(normalizePerplexityModelLabel('unknown-model')).toBe('Best');
  });
});
