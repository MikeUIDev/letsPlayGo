import type { AiMoveRequest, GenerateMoveResult } from './types.js';
import { buildAnalysisQuery, selectBestMoveFromAnalysis } from './protocol.js';
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
    return selectBestMoveFromAnalysis(response, request.boardSize);
  }
}
