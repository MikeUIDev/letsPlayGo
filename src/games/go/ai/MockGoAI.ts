import { getLegalMoves } from '../engine/legalMoves';
import type { GoAI, GenerateMoveRequest, GenerateMoveResult, MockGoAIOptions } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class MockGoAI implements GoAI {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly random: () => number;

  constructor(options: MockGoAIOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 300;
    this.maxDelayMs = options.maxDelayMs ?? 700;
    this.random = options.random ?? Math.random;
  }

  async generateMove(request: GenerateMoveRequest): Promise<GenerateMoveResult> {
    if (this.maxDelayMs > 0) {
      const span = Math.max(0, this.maxDelayMs - this.minDelayMs);
      const waitMs = this.minDelayMs + Math.floor(this.random() * (span + 1));
      if (waitMs > 0) {
        await delay(waitMs);
      }
    }

    const legalMoves = getLegalMoves(request.state);

    if (legalMoves.length === 0) {
      return { type: 'pass' };
    }

    const index = Math.floor(this.random() * legalMoves.length);
    return { type: 'play', position: legalMoves[index] };
  }
}
