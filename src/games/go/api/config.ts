export type AiProvider = 'mock' | 'api';

export type AiApiRuntimeConfig = {
  provider: AiProvider;
  /** API origin + optional path prefix, without trailing slash (e.g. `/api` or `https://api.example.com`). */
  baseUrl: string;
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return parsed;
}

/** Which AI implementation the client should use for opponent moves. */
export function getAiProvider(): AiProvider {
  return import.meta.env.VITE_AI_PROVIDER === 'api' ? 'api' : 'mock';
}

/**
 * Resolve the HTTPS-ready API base URL for move + analysis requests.
 * - Dev: defaults to `/api` (Vite proxy → local Node/KataGo).
 * - Production: set `VITE_AI_API_BASE_URL` to a remote HTTPS endpoint (never localhost).
 */
export function resolveAiApiBaseUrl(): string {
  const configured = import.meta.env.VITE_AI_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return '/api';
  }

  return '';
}

export function resolveAiApiTimeoutMs(): number {
  return parseTimeoutMs(import.meta.env.VITE_AI_TIMEOUT_MS);
}

/** Runtime config when using the HTTP AI backend; null when mock AI is selected. */
export function getAiApiRuntimeConfig(): AiApiRuntimeConfig | null {
  if (getAiProvider() !== 'api') {
    return null;
  }

  const baseUrl = resolveAiApiBaseUrl();
  if (!baseUrl) {
    console.warn(
      '[ai] VITE_AI_PROVIDER=api requires VITE_AI_API_BASE_URL for production builds (HTTPS remote API).',
    );
  }

  return {
    provider: 'api',
    baseUrl: baseUrl || '/api',
    timeoutMs: resolveAiApiTimeoutMs(),
  };
}

/** Base URL for analysis requests (independent of mock opponent AI). */
export function getAnalysisApiRuntimeConfig(): Pick<AiApiRuntimeConfig, 'baseUrl' | 'timeoutMs'> {
  const baseUrl = resolveAiApiBaseUrl();
  return {
    baseUrl: baseUrl || (import.meta.env.DEV ? '/api' : ''),
    timeoutMs: resolveAiApiTimeoutMs(),
  };
}

export function isProductionApiMisconfigured(): boolean {
  return getAiProvider() === 'api' && !import.meta.env.DEV && !resolveAiApiBaseUrl();
}

/** True when opponent moves require the remote HTTP AI backend. */
export function usesRemoteAiBackend(): boolean {
  return getAiProvider() === 'api';
}
