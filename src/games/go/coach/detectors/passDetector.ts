import type { AnalysisCandidate } from '../../analysis/types';
import type { Move } from '../../engine/types';
import type { CoachInsight } from '../types';
import { MOVE_QUALITY_THRESHOLDS } from '../../review/moveQuality';
import { formatEstimatedScoreLoss } from '../../review/scorePerspective';

export function detectPrematurePass(options: {
  playedMove: Move;
  beforeCandidates: AnalysisCandidate[];
  scoreLoss: number;
}): CoachInsight | null {
  const { playedMove, beforeCandidates, scoreLoss } = options;

  if (playedMove.type !== 'pass') {
    return null;
  }

  const best = beforeCandidates[0];
  if (!best || best.type === 'pass') {
    return null;
  }

  if (scoreLoss < MOVE_QUALITY_THRESHOLDS.inaccuracy) {
    return null;
  }

  const lossText = formatEstimatedScoreLoss(scoreLoss).replace('Lost about ', '').replace(' points', '');

  return {
    type: 'premature_pass',
    severity: scoreLoss >= MOVE_QUALITY_THRESHOLDS.mistake ? 'critical' : 'warning',
    title: 'There was still value on the board',
    explanation: `KataGo preferred continuing play. Passing here gave up about ${lossText} points.`,
  };
}
