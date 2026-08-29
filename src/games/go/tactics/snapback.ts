import type { VariationMove } from '../analysis/types';
import { positionsEqual } from '../engine/board';
import type { GameState, Move, Position, StoneColor } from '../engine/types';
import { OPPONENT } from '../engine/types';
import { readSnapbackOpportunityLocal } from './snapbackLocal';
import type { SnapbackReadResult } from './types';

function opponentLabel(color: StoneColor): string {
  return color === 'black' ? 'White' : 'Black';
}

export function readHistoricalSnapback(
  historyMoves: Move[],
  currentMove: Move,
): SnapbackReadResult | null {
  if (currentMove.type !== 'play') {
    return null;
  }

  const recaptureCount = currentMove.captured?.length ?? 0;
  if (recaptureCount <= 1) {
    return null;
  }

  const previous = historyMoves[historyMoves.length - 2];
  if (!previous || previous.type !== 'play') {
    return null;
  }

  const sacrificedCount = previous.captured?.length ?? 0;
  if (sacrificedCount !== 1) {
    return null;
  }

  if (!positionsEqual(previous.position, currentMove.position)) {
    return null;
  }

  if (recaptureCount <= sacrificedCount) {
    return null;
  }

  const sequence: VariationMove[] = [
    { color: previous.color, position: previous.position },
    { color: currentMove.color, position: currentMove.position },
  ];

  return {
    outcome: 'success',
    sacrificedCount,
    recaptureCount,
    sequence,
    sacrificePoint: previous.position,
    recapturePoint: currentMove.position,
  };
}

export function readSnapbackTrap(
  _beforeState: GameState,
  captureMove: Move,
  recaptureMove: Move,
): SnapbackReadResult | null {
  if (captureMove.type !== 'play' || recaptureMove.type !== 'play') {
    return null;
  }

  const sacrificedCount = captureMove.captured?.length ?? 0;
  const recaptureCount = recaptureMove.captured?.length ?? 0;

  if (sacrificedCount !== 1 || recaptureCount <= 1) {
    return null;
  }

  if (!positionsEqual(captureMove.position, recaptureMove.position)) {
    return null;
  }

  if (recaptureMove.color !== OPPONENT[captureMove.color]) {
    return null;
  }

  const sequence: VariationMove[] = [
    { color: captureMove.color, position: captureMove.position },
    { color: recaptureMove.color, position: recaptureMove.position },
  ];

  return {
    outcome: 'success',
    sacrificedCount,
    recaptureCount,
    sequence,
    sacrificePoint: captureMove.position,
    recapturePoint: recaptureMove.position,
  };
}

export function readSnapbackOpportunity(
  afterState: GameState,
  sacrificeMove: Move,
): SnapbackReadResult | null {
  const local = readSnapbackOpportunityLocal(afterState, sacrificeMove);
  return local.outcome === 'success' ? local : null;
}

export function buildSnapbackTeachingLine(
  player: StoneColor,
  recaptureCount: number,
  sacrificedCount: number,
  isTrap: boolean,
): string {
  const opponent = opponentLabel(player);

  if (isTrap) {
    return 'This capture allows a snapback.';
  }

  if (recaptureCount > sacrificedCount) {
    return `The single stone can be sacrificed because the recapture takes a larger ${opponent} group.`;
  }

  return 'This is a snapback.';
}

export function buildSnapbackRelatedPositions(
  sacrificePoint: Position,
  capturedStones: Position[],
): Position[] {
  return [sacrificePoint, ...capturedStones.slice(0, 4)];
}

export { opponentLabel as snapbackOpponentLabel };
