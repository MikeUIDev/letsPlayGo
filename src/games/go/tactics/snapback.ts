import type { VariationMove } from '../analysis/types';
import { positionsEqual } from '../engine/board';
import { getLegalMoves } from '../engine/legalMoves';
import { violatesKo } from '../engine/ko';
import type { GameState, Move, Position, StoneColor } from '../engine/types';
import { OPPONENT } from '../engine/types';
import { createSimulationState, tryPlay } from './simulate';
import { TACTICAL_SEARCH_LIMITS, type SnapbackReadResult } from './types';

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
  if (sacrificeMove.type !== 'play') {
    return null;
  }

  const sacrificer = sacrificeMove.color;
  const opponent = OPPONENT[sacrificer];
  const sacrificePoint = sacrificeMove.position;
  const state = createSimulationState(afterState.board, opponent, afterState.config);

  for (const capturePoint of getLegalMoves(state)) {
    const captureState = tryPlay(state, capturePoint);
    if (!captureState) {
      continue;
    }

    const captureMove = captureState.history[captureState.history.length - 1]?.move;
    if (
      captureMove?.type !== 'play' ||
      !(captureMove.captured ?? []).some((stone) => positionsEqual(stone, sacrificePoint))
    ) {
      continue;
    }

    if (captureState.currentPlayer !== sacrificer) {
      continue;
    }

    if (violatesKo(captureState, capturePoint)) {
      continue;
    }

    const recaptureState = tryPlay(captureState, capturePoint);
    if (!recaptureState) {
      continue;
    }

    const recaptureMove = recaptureState.history[recaptureState.history.length - 1]?.move;
    const recaptureCount = recaptureMove?.type === 'play' ? recaptureMove.captured?.length ?? 0 : 0;
    if (recaptureCount <= 1) {
      continue;
    }

    return {
      outcome: 'success',
      sacrificedCount: 1,
      recaptureCount,
      sequence: [
        { color: sacrificer, position: sacrificePoint },
        { color: opponent, position: capturePoint },
        { color: sacrificer, position: capturePoint },
      ].slice(0, TACTICAL_SEARCH_LIMITS.snapbackMaxDepth),
      sacrificePoint,
      recapturePoint: capturePoint,
    };
  }

  return null;
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
