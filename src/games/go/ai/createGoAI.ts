import { ApiGoAI } from './ApiGoAI';
import { MockGoAI } from './MockGoAI';
import type { GoAI } from './types';

export type AiProvider = 'mock' | 'api';

export function getAiProvider(): AiProvider {
  const provider = import.meta.env.VITE_AI_PROVIDER;
  console.log('AI provider:', provider);
  return provider === 'api' ? 'api' : 'mock';
}

export function createGoAI(): GoAI {
  if (getAiProvider() === 'api') {
    return new ApiGoAI();
  }

  return new MockGoAI();
}
