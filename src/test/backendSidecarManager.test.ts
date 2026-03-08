import { afterEach, describe, expect, it } from 'vitest';
import { BackendSidecarManager } from '../../electron/main/backend-sidecar-manager';

const ORIGINAL_ENV = process.env.NOTILUS_BACKEND_PORT;

describe('BackendSidecarManager', () => {
  afterEach(() => {
    if (ORIGINAL_ENV == null) {
      delete process.env.NOTILUS_BACKEND_PORT;
    } else {
      process.env.NOTILUS_BACKEND_PORT = ORIGINAL_ENV;
    }
  });

  it('uses configured backend port from env', () => {
    process.env.NOTILUS_BACKEND_PORT = '9005';
    const manager = new BackendSidecarManager({ debug: false });
    const state = manager.getState();

    expect(state.port).toBe(9005);
    expect(state.healthUrl).toBe('http://127.0.0.1:9005/api/health');
  });

  it('falls back to default backend port when env is invalid', () => {
    process.env.NOTILUS_BACKEND_PORT = 'invalid';
    const manager = new BackendSidecarManager({ debug: false });
    const state = manager.getState();

    expect(state.port).toBe(8000);
    expect(state.healthUrl).toBe('http://127.0.0.1:8000/api/health');
  });
});
