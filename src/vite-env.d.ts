/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: 'mock' | 'api';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
