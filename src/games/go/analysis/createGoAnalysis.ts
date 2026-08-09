import { ApiGoAnalysis } from './ApiGoAnalysis';
import type { GoAnalysisService } from './types';

export function createGoAnalysis(): GoAnalysisService {
  return new ApiGoAnalysis();
}
