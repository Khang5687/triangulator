import { describe, expect, test, vi } from 'vitest';
import { startAttachmentNetworkMonitor } from '../../src/browser/attachmentNetwork.js';
import type { BrowserAttachment, ChromeClient } from '../../src/browser/types.js';

type NetworkHandlers = {
  requestWillBeSent?: (params: any) => void;
  responseReceived?: (params: any) => void;
  loadingFailed?: (params: any) => void;
  loadingFinished?: (params: any) => void;
};

const attachments: BrowserAttachment[] = [
  { path: '/tmp/large.pdf', displayPath: 'large.pdf' },
  { path: '/tmp/small.txt', displayPath: 'small.txt' },
];

const buildNetworkStub = () => {
  const handlers: NetworkHandlers = {};
  const getResponseBody = vi.fn();
  const network = {
    requestWillBeSent: (cb: NetworkHandlers['requestWillBeSent']) => {
      handlers.requestWillBeSent = cb ?? undefined;
    },
    responseReceived: (cb: NetworkHandlers['responseReceived']) => {
      handlers.responseReceived = cb ?? undefined;
    },
    loadingFailed: (cb: NetworkHandlers['loadingFailed']) => {
      handlers.loadingFailed = cb ?? undefined;
    },
    loadingFinished: (cb: NetworkHandlers['loadingFinished']) => {
      handlers.loadingFinished = cb ?? undefined;
    },
    getResponseBody,
  };
  return { network: network as unknown as ChromeClient['Network'], handlers, getResponseBody };
};

describe('startAttachmentNetworkMonitor', () => {
  test('captures JSON parse failures and matches attachment names', async () => {
    const { network, handlers, getResponseBody } = buildNetworkStub();
    getResponseBody.mockResolvedValue({
      body: JSON.stringify({ error: 'Failed to parse file large.pdf.' }),
      base64Encoded: false,
    });

    const monitor = startAttachmentNetworkMonitor(network, {
      attachmentNames: attachments.map((entry) => entry.displayPath),
    });

    handlers.requestWillBeSent?.({
      requestId: '1',
      request: { url: 'https://www.perplexity.ai/upload', method: 'POST' },
      type: 'XHR',
    });
    handlers.responseReceived?.({
      requestId: '1',
      response: {
        status: 200,
        mimeType: 'application/json',
        headers: { 'content-type': 'application/json' },
        url: 'https://www.perplexity.ai/upload',
      },
    });
    handlers.loadingFinished?.({ requestId: '1' });

    const result = await monitor.stop();
    expect(result).not.toBeNull();
    expect(result?.failures).toHaveLength(1);
    expect(result?.failed).toEqual(['large.pdf']);
    expect(result?.ambiguous).toBe(false);
  });

  test('flags ambiguous failures when no attachment match is available', async () => {
    const { network, handlers } = buildNetworkStub();
    const monitor = startAttachmentNetworkMonitor(network, {
      attachmentNames: attachments.map((entry) => entry.displayPath),
    });

    handlers.requestWillBeSent?.({
      requestId: '2',
      request: { url: 'https://www.perplexity.ai/upload', method: 'POST' },
      type: 'XHR',
    });
    handlers.loadingFailed?.({ requestId: '2', errorText: 'net::ERR_FAILED' });

    const result = await monitor.stop();
    expect(result).not.toBeNull();
    expect(result?.ambiguous).toBe(true);
    expect(result?.failed).toEqual([]);
  });
});
