import { getAiApiRuntimeConfig, getAiProvider, type AiProvider } from '../api/config';
import { ApiGoAI } from './ApiGoAI';
import { wrapGoAIWithDevFailureSim } from './devAiFailureSim';
import { MockGoAI } from './MockGoAI';
import type { GoAI } from './types';

export function createGoAI(): GoAI {
  const config = getAiApiRuntimeConfig();
  const ai = config
    ? new ApiGoAI({
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      })
    : new MockGoAI();

  // Production: never wrap. DEV/test: optional failure injection via wrap.
  if (import.meta.env.PROD) {
    return ai;
  }

  return wrapGoAIWithDevFailureSim(ai);
}

export { getAiProvider, type AiProvider };
