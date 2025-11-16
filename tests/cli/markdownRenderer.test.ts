import { describe, expect, test } from 'vitest';
import { renderMarkdownAnsi } from '../../src/cli/markdownRenderer.ts';

describe('renderMarkdownAnsi', () => {
  test('does not throw and returns a string', () => {
    const output = renderMarkdownAnsi('Hello *world*');
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });
});

