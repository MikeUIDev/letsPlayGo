import type { AnalysisScoreLead } from '../analysis/types';
import type { StoneColor } from '../engine/types';

/** Convert domain score lead into a signed value from the given player's perspective. */
export function signedScoreFromPerspective(
  scoreLead: AnalysisScoreLead,
  player: StoneColor,
): number {
  if (scoreLead.points < 0.05) {
    return 0;
  }

  if (scoreLead.leader === player) {
    return scoreLead.points;
  }

  return -scoreLead.points;
}

export function roundScoreLoss(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatEstimatedScoreLoss(scoreLoss: number): string {
  const rounded = roundScoreLoss(scoreLoss);
  if (rounded <= 0) {
    return 'Minimal loss';
  }

  return `Lost about ${rounded.toFixed(1)} points`;
}
