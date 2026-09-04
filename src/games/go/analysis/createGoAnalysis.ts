import { ApiGoAnalysis } from './ApiGoAnalysis';
import type { GoAnalysisService } from './types';
import { getAnalysisApiRuntimeConfig } from '../api/config';

export function createGoAnalysis(): GoAnalysisService {
  const config = getAnalysisApiRuntimeConfig();
  return new ApiGoAnalysis({
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
  });
}
