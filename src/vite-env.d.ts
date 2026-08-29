/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: 'mock' | 'api';
  /** HTTPS remote API base URL for production/Capacitor (no trailing slash). Dev defaults to `/api`. */
  readonly VITE_AI_API_BASE_URL?: string;
  readonly VITE_AI_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
