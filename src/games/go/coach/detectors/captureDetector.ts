import type { AnalysisCandidate } from '../../analysis/types';
import type { Move, Position, StoneColor } from '../../engine/types';
import type { CoachInsight } from '../types';
import {
  getAvailableCaptures,
  moveCapturesOpponentGroup,
} from '../libertyAnalysis';
import type { Board } from '../../engine/types';

function candidateMatchesCapture(
  candidate: AnalysisCandidate,
  capturePoint: Position,
): boolean {
  return candidate.type === 'play' && candidate.position.row === capturePoint.row && candidate.position.col === capturePoint.col;
}

export function detectMissedCapture(options: {
  beforeBoard: Board;
  playedMove: Move;
  player: StoneColor;
  beforeCandidates: AnalysisCandidate[];
}): CoachInsight | null {
  const { beforeBoard, playedMove, player, beforeCandidates } = options;
  const captures = getAvailableCaptures(beforeBoard, player);

  if (captures.length === 0) {
    return null;
  }

  const best = beforeCandidates[0];
  if (!best) {
    return null;
  }

  for (const capture of captures) {
    const playedCapture = moveCapturesOpponentGroup(
      beforeBoard,
      playedMove,
      capture.capturePoint,
    );

    if (playedCapture) {
      return null;
    }

    if (!candidateMatchesCapture(best, capture.capturePoint)) {
      continue;
    }

    const opponent = player === 'black' ? 'White' : 'Black';
    const stoneWord = capture.capturedCount === 1 ? 'stone' : 'stones';

    return {
      type: 'missed_capture',
      severity: 'warning',
      title: 'You had a capture available',
      explanation: `A nearby ${opponent} group had one liberty remaining. Playing here would have captured ${capture.capturedCount} ${stoneWord}.`,
      relatedPositions: [capture.capturePoint, ...capture.group.stones.slice(0, 3)],
      concept: 'missed_capture',
    };
  }

  return null;
}
