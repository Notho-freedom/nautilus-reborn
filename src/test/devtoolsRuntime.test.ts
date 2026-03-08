import { describe, expect, it } from 'vitest';
import {
  normalizeStoragePayload,
  parseJsonPayload,
  parseRuntimeFlushPayload,
} from '@/lib/devtoolsRuntime';

describe('devtoolsRuntime helpers', () => {
  it('parses runtime flush payload safely', () => {
    const payload = parseRuntimeFlushPayload(
      JSON.stringify({
        logs: [{ id: '1', level: 'log', message: 'ok', timestamp: Date.now() }],
        requests: [{ id: 'req-1', method: 'GET', url: '/api', startTime: Date.now(), status: 'pending' }],
      })
    );

    expect(payload.logs).toHaveLength(1);
    expect(payload.requests).toHaveLength(1);
  });

  it('returns empty payload on invalid flush input', () => {
    const payload = parseRuntimeFlushPayload('not-json');
    expect(payload.logs).toEqual([]);
    expect(payload.requests).toEqual([]);
    expect(payload.inspectedElement).toBeNull();
  });

  it('normalizes storage payload keys', () => {
    const normalized = normalizeStoragePayload({
      localStorage: [{ key: 'a', value: '1', type: 'localStorage' }],
      sessionStorage: [{ key: 'b', value: '2', type: 'sessionStorage' }],
      cookies: [{ key: 'c', value: '3', type: 'cookie' }],
    });

    expect(normalized.localStorage[0].type).toBe('localStorage');
    expect(normalized.sessionStorage[0].type).toBe('sessionStorage');
    expect(normalized.cookie[0].type).toBe('cookie');
  });

  it('parses json payload from string and fallback', () => {
    expect(parseJsonPayload('{"ok":true}', { ok: false })).toEqual({ ok: true });
    expect(parseJsonPayload('nope', { ok: false })).toEqual({ ok: false });
  });
});
