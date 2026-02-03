import path from 'node:path';
import type { BrowserLogger, ChromeClient } from './types.js';

export interface AttachmentNetworkFailure {
  requestId: string;
  url: string;
  status?: number;
  reason: string;
  matchedAttachments?: string[];
}

export interface AttachmentNetworkResult {
  failed: string[];
  ambiguous: boolean;
  failures: AttachmentNetworkFailure[];
}

export interface AttachmentNetworkMonitor {
  stop: () => Promise<AttachmentNetworkResult | null>;
}

const ERROR_PATTERNS = [
  /failed to parse/i,
  /could not parse/i,
  /couldn't parse/i,
  /unable to parse/i,
  /failed to read/i,
  /could not read/i,
  /couldn't read/i,
  /unable to read/i,
  /failed to process/i,
  /could not process/i,
  /couldn't process/i,
  /unable to process/i,
  /failed to upload/i,
  /upload failed/i,
  /unsupported file/i,
  /invalid file/i,
  /file too large/i,
  /payload too large/i,
  /corrupt/i,
  /virus/i,
  /malware/i,
  /timeout/i,
  /permission/i,
  /access denied/i,
  /\berror\b/i,
];

const URL_TOKENS = ['upload', 'attachment', 'file', 'document', 'parse', 'extract', 'ingest', 'asset'];

const normalizeText = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

const normalizeAttachmentName = (value: string): string =>
  normalizeText(path.basename(value).toLowerCase());

const findAttachmentMatches = (text: string, attachments: string[]): string[] => {
  const matches = new Set<string>();
  for (const name of attachments) {
    if (!name) continue;
    if (text.includes(name)) {
      matches.add(name);
      continue;
    }
    const noExt = name.replace(/\.[a-z0-9]{1,10}$/i, '');
    if (noExt.length >= 4 && text.includes(noExt)) {
      matches.add(name);
    }
  }
  return Array.from(matches);
};

const extractJsonError = (value: unknown): { hasError: boolean; messages: string[] } => {
  const messages: string[] = [];
  let hasError = false;

  const visit = (node: unknown, depth: number): void => {
    if (!node || depth > 4) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;
    const recordString = (raw: unknown) => {
      if (typeof raw === 'string' && raw.trim()) {
        messages.push(raw.trim());
        if (ERROR_PATTERNS.some((pattern) => pattern.test(raw))) {
          hasError = true;
        }
      }
    };
    for (const [key, raw] of Object.entries(node)) {
      const lowered = key.toLowerCase();
      if (lowered === 'success' && raw === false) {
        hasError = true;
      }
      if (lowered === 'ok' && raw === false) {
        hasError = true;
      }
      if (lowered === 'status' && typeof raw === 'string') {
        const normalized = raw.toLowerCase();
        if (['error', 'failed', 'failure'].includes(normalized)) {
          hasError = true;
          messages.push(raw);
        }
      }
      if (['error', 'errors', 'message', 'detail', 'reason'].includes(lowered)) {
        if (raw) {
          hasError = true;
        }
        if (Array.isArray(raw)) {
          raw.forEach((entry) => {
            if (typeof entry === 'string') {
              recordString(entry);
            } else {
              visit(entry, depth + 1);
            }
          });
        } else if (typeof raw === 'string') {
          recordString(raw);
        } else if (typeof raw === 'object') {
          visit(raw, depth + 1);
        }
      } else if (typeof raw === 'object') {
        visit(raw, depth + 1);
      } else if (typeof raw === 'string') {
        if (ERROR_PATTERNS.some((pattern) => pattern.test(raw))) {
          hasError = true;
          messages.push(raw.trim());
        }
      }
    }
  };

  visit(value, 0);
  return { hasError, messages };
};

const detectFailureFromBody = (
  bodyText: string,
  normalizedAttachments: string[],
): { matched: string[]; reason: string } | null => {
  const normalizedBody = bodyText.toLowerCase();
  const matched = findAttachmentMatches(normalizedBody, normalizedAttachments);
  const hasErrorPattern = ERROR_PATTERNS.some((pattern) => pattern.test(normalizedBody));
  let hasStructuredError = false;
  let structuredMessages: string[] = [];

  const trimmed = bodyText.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(bodyText);
      const parsedError = extractJsonError(parsed);
      if (parsedError.hasError) {
        hasStructuredError = true;
        structuredMessages = parsedError.messages;
      }
    } catch {
      // ignore JSON parse failures
    }
  }

  const hasFileHint =
    normalizedBody.includes('file') ||
    normalizedBody.includes('attachment') ||
    normalizedBody.includes('upload') ||
    normalizedBody.includes('parse') ||
    matched.length > 0;

  if (!hasStructuredError && !(hasErrorPattern && hasFileHint)) {
    return null;
  }

  const reason =
    structuredMessages.find((message) => Boolean(message)) ??
    (hasErrorPattern ? 'attachment processing error' : 'attachment error');
  return { matched, reason };
};

const normalizeHosts = (hosts: string[] | undefined): string[] =>
  (hosts ?? [])
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

export function startAttachmentNetworkMonitor(
  Network: ChromeClient['Network'],
  args: {
    attachmentNames: string[];
    logger?: BrowserLogger;
    allowedHosts?: string[];
    maxBodies?: number;
    maxBodyBytes?: number;
  },
): AttachmentNetworkMonitor {
  const logger = args.logger;
  const allowedHosts = normalizeHosts(args.allowedHosts);
  const attachmentNames = args.attachmentNames.map((name) => path.basename(name));
  const normalizedAttachments = attachmentNames.map((name) => normalizeAttachmentName(name));
  const failures: AttachmentNetworkFailure[] = [];
  const requestMeta = new Map<
    string,
    { url: string; method?: string; type?: string; initiator?: string }
  >();
  const responseMeta = new Map<
    string,
    { status?: number; mimeType?: string; headers?: Record<string, string>; url?: string }
  >();
  const pendingBodies = new Set<Promise<void>>();
  let inspectedBodies = 0;
  let active = true;
  const maxBodies = args.maxBodies ?? 12;
  const maxBodyBytes = args.maxBodyBytes ?? 200_000;

  const isAllowedHost = (url: string): boolean => {
    if (allowedHosts.length === 0) return true;
    try {
      const host = new URL(url).host.toLowerCase();
      return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    } catch {
      return false;
    }
  };

  const isCandidateRequest = (
    info: { url: string; method?: string; type?: string } | undefined,
  ): boolean => {
    if (!info) return false;
    const url = info.url ?? '';
    if (!url || !isAllowedHost(url)) return false;
    const lowerUrl = url.toLowerCase();
    const tokenHit = URL_TOKENS.some((token) => lowerUrl.includes(token));
    const method = (info.method ?? 'GET').toUpperCase();
    const type = (info.type ?? '').toLowerCase();
    const methodHit = method !== 'GET' && (type === 'xhr' || type === 'fetch');
    return tokenHit || methodHit;
  };

  const recordFailure = (
    requestId: string,
    url: string,
    reason: string,
    matchedAttachments?: string[],
    status?: number,
  ) => {
    failures.push({
      requestId,
      url,
      status,
      reason,
      matchedAttachments: matchedAttachments && matchedAttachments.length > 0 ? matchedAttachments : undefined,
    });
  };

  Network.requestWillBeSent((params) => {
    if (!active) return;
    requestMeta.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      type: params.type,
      initiator: params.initiator?.type,
    });
  });

  Network.responseReceived((params) => {
    if (!active) return;
    responseMeta.set(params.requestId, {
      status: params.response.status,
      mimeType: params.response.mimeType,
      headers: params.response.headers as Record<string, string> | undefined,
      url: params.response.url,
    });
  });

  Network.loadingFailed((params) => {
    if (!active) return;
    const info = requestMeta.get(params.requestId);
    if (!isCandidateRequest(info)) return;
    recordFailure(params.requestId, info?.url ?? '', params.errorText || 'request-failed');
  });

  Network.loadingFinished((params) => {
    if (!active) return;
    const info = requestMeta.get(params.requestId);
    if (!isCandidateRequest(info)) return;
    const response = responseMeta.get(params.requestId);
    const status = response?.status;
    const url = response?.url ?? info?.url ?? '';
    if (typeof status === 'number' && status >= 400) {
      recordFailure(params.requestId, url, `http-${status}`, undefined, status);
      return;
    }
    if (!response || inspectedBodies >= maxBodies) return;
    const mimeType = response.mimeType ?? '';
    const contentType = response.headers?.['content-type'] ?? response.headers?.['Content-Type'] ?? '';
    const canInspect =
      mimeType.includes('json') ||
      mimeType.includes('text') ||
      contentType.includes('json') ||
      contentType.includes('text');
    if (!canInspect) return;
    inspectedBodies += 1;
    const task = (async () => {
      try {
        const body = await Network.getResponseBody({ requestId: params.requestId });
        if (!body?.body) return;
        const buffer = body.base64Encoded ? Buffer.from(body.body, 'base64') : Buffer.from(body.body);
        if (buffer.length > maxBodyBytes) {
          return;
        }
        const text = buffer.toString('utf8');
        const failure = detectFailureFromBody(text, normalizedAttachments);
        if (failure) {
          recordFailure(params.requestId, url, failure.reason, failure.matched, status);
        }
      } catch (error) {
        if (logger?.verbose) {
          logger(`Attachment network monitor failed to read response body: ${error instanceof Error ? error.message : error}`);
        }
      }
    })();
    pendingBodies.add(task);
    task.finally(() => {
      pendingBodies.delete(task);
    });
  });

  return {
    stop: async () => {
      active = false;
      if (pendingBodies.size > 0) {
        await Promise.allSettled(Array.from(pendingBodies));
      }
      if (failures.length === 0) {
        return null;
      }
      const matched = new Set<string>();
      let ambiguous = false;
      for (const failure of failures) {
        if (failure.matchedAttachments && failure.matchedAttachments.length > 0) {
          failure.matchedAttachments.forEach((name) => matched.add(name));
        } else {
          ambiguous = true;
        }
      }
      const failed = matched.size > 0 ? attachmentNames.filter((name) => matched.has(normalizeAttachmentName(name))) : [];
      if (failed.length === 0 && failures.length > 0) {
        ambiguous = true;
      }
      return { failed, ambiguous, failures };
    },
  };
}
