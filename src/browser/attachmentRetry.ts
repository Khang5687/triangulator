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
  _answerText: string,
  _attachmentNames: string[],
): AttachmentParseFailure | null {
  return null;
}

export function planAttachmentResponseRetry(args: {
  answerText: string;
  attachments: BrowserAttachment[];
  attempt: number;
  maxAttempts: number;
}): AttachmentRetryPlan {
  return {
    shouldRetry: false,
    failedAttachments: [],
  };
}

export function normalizeAttachmentNames(attachments: BrowserAttachment[]): string[] {
  return attachments.map((attachment) => path.basename(attachment.path));
}
