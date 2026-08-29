import { getAiApiRuntimeConfig, getAiProvider, type AiProvider } from '../api/config';
import { ApiGoAI } from './ApiGoAI';
import { MockGoAI } from './MockGoAI';
import type { GoAI } from './types';

export function createGoAI(): GoAI {
  const config = getAiApiRuntimeConfig();
  if (config) {
    return new ApiGoAI({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
    });
  }

  return new MockGoAI();
}

export { getAiProvider, type AiProvider };
