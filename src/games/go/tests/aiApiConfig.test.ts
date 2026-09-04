import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getAiApiRuntimeConfig,
  getAiProvider,
  isProductionApiMisconfigured,
  resolveAiApiBaseUrl,
  resolveAiApiTimeoutMs,
} from '../api/config';

describe('ai api config', () => {
  const env = import.meta.env;

  beforeEach(() => {
    vi.stubEnv('VITE_AI_PROVIDER', undefined);
    vi.stubEnv('VITE_AI_API_BASE_URL', undefined);
    vi.stubEnv('VITE_AI_TIMEOUT_MS', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to mock provider', () => {
    expect(getAiProvider()).toBe('mock');
    expect(getAiApiRuntimeConfig()).toBeNull();
  });

  it('selects api provider from env', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'api');
    expect(getAiProvider()).toBe('api');
    // Dev resolves missing base URL to `/api` (Vite proxy); production returns null instead.
    expect(getAiApiRuntimeConfig()?.provider).toBe(env.DEV ? 'api' : undefined);
  });

  it('uses configured HTTPS base URL without trailing slash', () => {
    vi.stubEnv('VITE_AI_API_BASE_URL', 'https://go-api.example.com/v1/');
    expect(resolveAiApiBaseUrl()).toBe('https://go-api.example.com/v1');
  });

  it('parses timeout from env', () => {
    vi.stubEnv('VITE_AI_TIMEOUT_MS', '45000');
    expect(resolveAiApiTimeoutMs()).toBe(45000);
  });

  it('flags missing production base URL when api provider is selected', () => {
    vi.stubEnv('VITE_AI_PROVIDER', 'api');
    if (env.DEV) {
      expect(isProductionApiMisconfigured()).toBe(false);
      expect(getAiApiRuntimeConfig()?.baseUrl).toBe('/api');
    } else {
      vi.stubEnv('VITE_AI_API_BASE_URL', '');
      expect(isProductionApiMisconfigured()).toBe(true);
      expect(getAiApiRuntimeConfig()).toBeNull();
    }
  });
});
