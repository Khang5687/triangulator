import { describe, expect, test } from 'vitest';
import {
  detectAttachmentParseFailures,
  planAttachmentResponseRetry,
} from '../../src/browser/attachmentRetry.js';
import type { BrowserAttachment } from '../../src/browser/types.js';

const attachments: BrowserAttachment[] = [
  { path: '/tmp/large.pdf', displayPath: 'large.pdf' },
  { path: '/tmp/small.txt', displayPath: 'small.txt' },
  { path: '/tmp/notes.md', displayPath: 'notes.md' },
];

const attachmentNames = attachments.map((entry) => entry.displayPath);

describe('detectAttachmentParseFailures', () => {
  test('detects explicit file parse failure', () => {
    const text = 'Failed to parse file large.pdf. Please try again.';
    const result = detectAttachmentParseFailures(text, attachmentNames);
    expect(result).not.toBeNull();
    expect(result?.failed).toEqual(['large.pdf']);
    expect(result?.ambiguous).toBe(false);
  });

  test('detects parse failures without extensions', () => {
    const text = 'Could not parse file Large.';
    const result = detectAttachmentParseFailures(text, attachmentNames);
    expect(result).not.toBeNull();
    expect(result?.failed).toEqual(['large.pdf']);
  });

  test('flags ambiguous parse errors as all attachments', () => {
    const text = 'Unable to parse uploaded file.';
    const result = detectAttachmentParseFailures(text, attachmentNames);
    expect(result).not.toBeNull();
    expect(result?.failed.sort()).toEqual([...attachmentNames].sort());
    expect(result?.ambiguous).toBe(true);
  });

  test('returns null when there is no parse error', () => {
    const text = 'All good. Attachments processed successfully.';
    const result = detectAttachmentParseFailures(text, attachmentNames);
    expect(result).toBeNull();
  });
});

describe('planAttachmentResponseRetry', () => {
  test('plans retry for detected failures when attempts remain', () => {
    const text = 'Failed to parse file large.pdf.';
    const plan = planAttachmentResponseRetry({
      answerText: text,
      attachments,
      attempt: 0,
      maxAttempts: 1,
      uiConfirmed: false,
    });
    expect(plan.shouldRetry).toBe(true);
    expect(plan.failedAttachments.map((entry) => entry.displayPath)).toEqual(['large.pdf']);
  });

  test('skips retry once max attempts are exhausted', () => {
    const text = 'Failed to parse file large.pdf.';
    const plan = planAttachmentResponseRetry({
      answerText: text,
      attachments,
      attempt: 1,
      maxAttempts: 1,
      uiConfirmed: false,
    });
    expect(plan.shouldRetry).toBe(false);
  });

  test('skips retry when no parse error is detected', () => {
    const plan = planAttachmentResponseRetry({
      answerText: 'Everything looks good.',
      attachments,
      attempt: 0,
      maxAttempts: 1,
    });
    expect(plan.shouldRetry).toBe(false);
  });

  test('skips parse-failure retry when UI is healthy and no network failure', () => {
    const text = 'Failed to parse file large.pdf.';
    const plan = planAttachmentResponseRetry({
      answerText: text,
      attachments,
      attempt: 0,
      maxAttempts: 1,
      uiConfirmed: true,
      uploadTimedOut: false,
      inputOnly: false,
      userTurnVerified: true,
    });
    expect(plan.shouldRetry).toBe(false);
  });

  test('retries when network monitor reports failures even without parse error', () => {
    const plan = planAttachmentResponseRetry({
      answerText: 'Everything looks good.',
      attachments,
      attempt: 0,
      maxAttempts: 1,
      networkResult: {
        failed: ['small.txt'],
        ambiguous: false,
        failures: [{ requestId: '1', url: 'https://perplexity.ai/upload', reason: 'http-500' }],
      },
    });
    expect(plan.shouldRetry).toBe(true);
    expect(plan.failedAttachments.map((entry) => entry.displayPath)).toEqual(['small.txt']);
  });
});
