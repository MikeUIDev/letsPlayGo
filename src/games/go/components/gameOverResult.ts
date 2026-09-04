import { scoreMargin } from '../engine/scoring';
import type { GameResult } from '../engine/types';

export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Visible result reason: resignation vs scored margin. Does not change engine scores. */
export function formatGameOverReasonLine(result: GameResult): string {
  if (result.reason === 'resign') {
    return 'by resignation';
  }

  if (result.winner === 'draw' || result.winner === null) {
    return 'Scores are tied';
  }

  const margin = scoreMargin(result);
  return `by ${formatPoints(margin)} points`;
}
