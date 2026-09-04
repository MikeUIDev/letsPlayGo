import { AiError, aiMalformedMessage, aiOfflineMessage, aiTimeoutMessage, aiUnavailableMessage } from './errors';
import type { GoAI } from './types';

export type AiFailureSimKind = 'offline' | 'timeout' | 'unavailable' | 'malformed';

const STORAGE_KEY = 'letsplaygo.dev.aiFailure';
const VALID_KINDS: readonly AiFailureSimKind[] = ['offline', 'timeout', 'unavailable', 'malformed'];

const listeners = new Set<() => void>();

/** Dev/test only. Production builds compile this to false and strip sim UI. */
export function isAiFailureSimAllowed(): boolean {
  return Boolean(import.meta.env.DEV) || import.meta.env.MODE === 'test';
}

export function isAiFailureSimKind(value: string | null | undefined): value is AiFailureSimKind {
  return value === 'offline' || value === 'timeout' || value === 'unavailable' || value === 'malformed';
}

function readStoredKind(): AiFailureSimKind | null {
  if (!isAiFailureSimAllowed() || typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isAiFailureSimKind(stored) ? stored : null;
  } catch {
    return null;
  }
}

let currentKind: AiFailureSimKind | null = readStoredKind();

function persist(kind: AiFailureSimKind | null): void {
  if (!isAiFailureSimAllowed() || typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (kind) {
      sessionStorage.setItem(STORAGE_KEY, kind);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function getAiFailureSim(): AiFailureSimKind | null {
  if (!isAiFailureSimAllowed()) {
    return null;
  }

  return currentKind;
}

export function setAiFailureSim(kind: AiFailureSimKind | null): void {
  if (!isAiFailureSimAllowed()) {
    return;
  }

  currentKind = kind;
  persist(kind);
  listeners.forEach((listener) => listener());
}

/** Clears sim state between unit tests. No-op outside dev/test. */
export function resetAiFailureSimForTests(): void {
  if (!isAiFailureSimAllowed()) {
    return;
  }

  currentKind = null;
  persist(null);
  listeners.forEach((listener) => listener());
}

export function subscribeAiFailureSim(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Apply `?aiFail=offline|timeout|unavailable|malformed` in development. */
export function initAiFailureSimFromUrl(search = typeof window === 'undefined' ? '' : window.location.search): void {
  if (!isAiFailureSimAllowed()) {
    return;
  }

  const value = new URLSearchParams(search).get('aiFail');
  if (value === 'off' || value === 'none' || value === 'clear') {
    setAiFailureSim(null);
    return;
  }

  if (isAiFailureSimKind(value)) {
    setAiFailureSim(value);
  }
}

export function createSimulatedAiError(kind: AiFailureSimKind): AiError {
  switch (kind) {
    case 'offline':
      return new AiError('offline', aiOfflineMessage());
    case 'timeout':
      return new AiError('timeout', aiTimeoutMessage());
    case 'unavailable':
      return new AiError('unavailable', aiUnavailableMessage());
    case 'malformed':
      return new AiError('invalid_response', aiMalformedMessage());
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export async function applyDevAiFailureSim(signal?: AbortSignal): Promise<void> {
  if (!isAiFailureSimAllowed()) {
    return;
  }

  const kind = getAiFailureSim();
  if (!kind) {
    return;
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  throw createSimulatedAiError(kind);
}

export function wrapGoAIWithDevFailureSim(ai: GoAI): GoAI {
  if (!isAiFailureSimAllowed()) {
    return ai;
  }

  return {
    generateMove: async (request, options) => {
      await applyDevAiFailureSim(options?.signal);
      return ai.generateMove(request, options);
    },
  };
}

export const AI_FAILURE_SIM_KINDS = VALID_KINDS;
