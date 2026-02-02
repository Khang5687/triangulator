import path from 'node:path';
import type { BrowserAttachment } from './types.js';

export interface AttachmentParseFailure {
  failed: string[];
  ambiguous: boolean;
}

export interface AttachmentRetryPlan {
  shouldRetry: boolean;
  failedAttachments: BrowserAttachment[];
  reason?: string;
}

export function detectAttachmentParseFailures(
  answerText: string,
  attachmentNames: string[],
): AttachmentParseFailure | null {
  const normalizedText = answerText.toLowerCase();
  const lines = normalizedText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errorPatterns = [
    /failed to parse/i,
    /could not parse/i,
    /couldn't parse/i,
    /unable to parse/i,
    /failed to read/i,
    /could not read/i,
    /couldn't read/i,
    /unable to read/i,
    /failed to extract/i,
    /could not extract/i,
    /couldn't extract/i,
    /unable to extract/i,
    /parse error/i,
    /parsing error/i,
    /failed to process/i,
    /could not process/i,
    /couldn't process/i,
    /unable to process/i,
    /unsupported file/i,
  ];
  const errorLines = lines.filter((line) => errorPatterns.some((pattern) => pattern.test(line)));
  if (errorLines.length === 0) {
    return null;
  }

  const normalizedNames = attachmentNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name.toLowerCase());
  const matched = new Set<string>();
  const matchesLine = (candidate: string) => errorLines.some((line) => line.includes(candidate));
  normalizedNames.forEach((name) => {
    if (!name) return;
    if (matchesLine(name)) {
      matched.add(name);
      return;
    }
    const noExt = name.replace(/\.[a-z0-9]{1,10}$/i, '');
    if (noExt.length >= 4 && matchesLine(noExt)) {
      matched.add(name);
    }
  });

  if (matched.size === 0) {
    return { failed: attachmentNames, ambiguous: true };
  }

  const ordered = attachmentNames.filter((name) => matched.has(name.toLowerCase()));
  return { failed: ordered, ambiguous: false };
}

export function planAttachmentResponseRetry(args: {
  answerText: string;
  attachments: BrowserAttachment[];
  attempt: number;
  maxAttempts: number;
}): AttachmentRetryPlan {
  const { answerText, attachments, attempt, maxAttempts } = args;
  if (attempt >= maxAttempts) {
    return { shouldRetry: false, failedAttachments: [] };
  }
  if (!attachments || attachments.length === 0) {
    return { shouldRetry: false, failedAttachments: [] };
  }
  const attachmentNames = normalizeAttachmentNames(attachments);
  const failure = detectAttachmentParseFailures(answerText, attachmentNames);
  if (!failure) {
    return { shouldRetry: false, failedAttachments: [] };
  }
  const failedSet = new Set(failure.failed.map((name) => name.toLowerCase()));
  const failedAttachments = failure.ambiguous
    ? attachments
    : attachments.filter((attachment) => failedSet.has(path.basename(attachment.path).toLowerCase()));
  if (failedAttachments.length === 0) {
    return { shouldRetry: false, failedAttachments: [], reason: 'parse-failure-no-match' };
  }
  return {
    shouldRetry: true,
    failedAttachments,
    reason: failure.ambiguous ? 'parse-failure-ambiguous' : 'parse-failure',
  };
}

export function normalizeAttachmentNames(attachments: BrowserAttachment[]): string[] {
  return attachments.map((attachment) => path.basename(attachment.path));
}
