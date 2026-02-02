import { describe, expect, it } from 'vitest';
import {
  normalizePerplexityMode,
  normalizePerplexityRecency,
  normalizePerplexitySources,
  normalizePerplexityConnectors,
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
});
