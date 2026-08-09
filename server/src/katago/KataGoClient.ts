import type { AiMoveRequest, GenerateMoveResult } from './types.js';
import { selectBeginnerMoveFromAnalysis } from '../ai/beginnerMoveSelection.js';
import { mapAnalysisResponse } from '../ai/analysisResponse.js';
import type { DomainAnalysisResponse } from '../ai/analysisResponse.js';
import type { AnalyzeRequest } from '../validation/analyzeRequest.js';
import { buildAnalysisQuery, buildReviewAnalysisQuery, selectBestMoveFromAnalysis } from './protocol.js';
import type { KataGoProcessLike } from './KataGoProcess.js';

let clientRequestCounter = 0;

function nextClientRequestId(): string {
  clientRequestCounter += 1;
  return `move-${clientRequestCounter}`;
}

export class KataGoClient {
  constructor(private readonly process: KataGoProcessLike) {}

  async generateMove(request: AiMoveRequest, timeoutMs: number): Promise<GenerateMoveResult> {
    if (!this.process.isReady()) {
      throw new Error('katago_not_ready');
    }

    const query = buildAnalysisQuery(request, nextClientRequestId());
    const response = await this.process.sendQuery(query, timeoutMs);

    if (request.difficulty === 'beginner') {
      return selectBeginnerMoveFromAnalysis(response, request.boardSize);
    }

    return selectBestMoveFromAnalysis(response, request.boardSize);
  }

  async analyze(request: AnalyzeRequest, timeoutMs: number): Promise<DomainAnalysisResponse> {
    if (!this.process.isReady()) {
      throw new Error('katago_not_ready');
    }

    const query = buildReviewAnalysisQuery(request, nextClientRequestId());
    const response = await this.process.sendQuery(query, timeoutMs);
    return mapAnalysisResponse(response, request.boardSize, request.colorToMove);
  }
}
