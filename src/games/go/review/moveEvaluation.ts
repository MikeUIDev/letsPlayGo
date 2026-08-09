import type { AnalysisCandidate, AnalysisResult } from '../analysis/types';
import type { Move, StoneColor } from '../engine/types';
import { classifyMoveQuality } from './moveQuality';
import { roundScoreLoss, signedScoreFromPerspective } from './scorePerspective';

export type MoveQuality = import('./moveQuality').MoveQuality;

export type MoveEvaluation = {
  /** Position index after this move (move 1 → index 1). */
  moveIndex: number;
  player: StoneColor;
  playedMove: Move;
  quality: MoveQuality;
  scoreLoss: number;
  winRateLoss?: number;
  bestCandidates: AnalysisCandidate[];
  playedBestMove: boolean;
};

export function getEvaluableMoveIndices(moves: Move[]): number[] {
  const indices: number[] = [];

  for (let index = 0; index < moves.length; index += 1) {
    if (moves[index].type === 'resign') {
      break;
    }

    indices.push(index + 1);
  }

  return indices;
}

function candidateMatchesMove(candidate: AnalysisCandidate, move: Move): boolean {
  if (move.type === 'pass') {
    return candidate.type === 'pass';
  }

  if (move.type !== 'play' || candidate.type !== 'play') {
    return false;
  }

  return (
    move.position.row === candidate.position.row &&
    move.position.col === candidate.position.col
  );
}

export function isPlayedBestMove(playedMove: Move, beforeAnalysis: AnalysisResult): boolean {
  const best = beforeAnalysis.candidates[0];
  if (!best) {
    return false;
  }

  return candidateMatchesMove(best, playedMove);
}

/**
 * Evaluate move N by comparing analysis at position N-1 (before) and N (after).
 * Position 0 is the empty board; move 1 produces position 1.
 */
export function evaluateMove(
  moveIndex: number,
  playedMove: Move,
  beforeAnalysis: AnalysisResult,
  afterAnalysis: AnalysisResult,
): MoveEvaluation | null {
  if (moveIndex < 1 || playedMove.type === 'resign') {
    return null;
  }

  const player = playedMove.color;
  const beforeScore = signedScoreFromPerspective(beforeAnalysis.scoreLead, player);
  const afterScore = signedScoreFromPerspective(afterAnalysis.scoreLead, player);
  const rawLoss = beforeScore - afterScore;
  const scoreLoss = roundScoreLoss(Math.max(0, rawLoss));

  const beforeWinRate = player === 'black' ? beforeAnalysis.winRate.black : beforeAnalysis.winRate.white;
  const afterWinRate = player === 'black' ? afterAnalysis.winRate.black : afterAnalysis.winRate.white;
  const winRateLoss = roundScoreLoss(Math.max(0, (beforeWinRate - afterWinRate) * 100));

  return {
    moveIndex,
    player,
    playedMove,
    quality: classifyMoveQuality(scoreLoss),
    scoreLoss,
    winRateLoss,
    bestCandidates: beforeAnalysis.candidates.slice(0, 3),
    playedBestMove: isPlayedBestMove(playedMove, beforeAnalysis),
  };
}

export function getMistakeMoveIndices(evaluations: Map<number, MoveEvaluation>): number[] {
  return [...evaluations.values()]
    .filter((evaluation) => evaluation.quality !== 'good')
    .sort((left, right) => left.moveIndex - right.moveIndex)
    .map((evaluation) => evaluation.moveIndex);
}

export function getMistakeNavigation(
  moveIndex: number,
  mistakeIndices: number[],
): {
  mistakeIndex: number;
  mistakeCount: number;
  canGoPreviousMistake: boolean;
  canGoNextMistake: boolean;
} {
  const mistakeIndex = mistakeIndices.indexOf(moveIndex);

  return {
    mistakeIndex: mistakeIndex >= 0 ? mistakeIndex + 1 : 0,
    mistakeCount: mistakeIndices.length,
    canGoPreviousMistake: mistakeIndex > 0,
    canGoNextMistake: mistakeIndex >= 0 && mistakeIndex < mistakeIndices.length - 1,
  };
}

export function getPreviousMistakeIndex(
  moveIndex: number,
  mistakeIndices: number[],
): number | null {
  const previous = mistakeIndices.filter((index) => index < moveIndex).at(-1);
  return previous ?? null;
}

export function getNextMistakeIndex(
  moveIndex: number,
  mistakeIndices: number[],
): number | null {
  return mistakeIndices.find((index) => index > moveIndex) ?? null;
}
