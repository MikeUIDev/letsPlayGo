import { isInBounds, positionsEqual } from '../engine/board';
import { isLegalPlay } from '../engine/legalMoves';
import type { GameState, Move, Position, StoneColor } from '../engine/types';
import { OPPONENT } from '../engine/types';
import { tryPlay } from './simulate';
import { readHistoricalSnapback } from './snapback';
import type { SnapbackReadResult } from './types';

export type SnapbackLocalLimitsConfig = {
  maxPlies: number;
  maxCandidateMoves: number;
  localRadius: number;
  maxElapsedMs: number;
};

export const SNAPBACK_LOCAL_LIMITS: SnapbackLocalLimitsConfig = {
  maxPlies: 4,
  maxCandidateMoves: 12,
  localRadius: 3,
  maxElapsedMs: 50,
};

export type SnapbackLocalSearchResult = SnapbackReadResult | { outcome: 'unknown' };

function manhattanDistance(left: Position, right: Position): number {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col);
}

function isWithinLocalRegion(center: Position, candidate: Position, radius: number): boolean {
  return manhattanDistance(center, candidate) <= radius;
}

/** Candidate replies near the sacrifice, ordered closest-first and capped. */
export function getLocalCandidateMoves(
  state: GameState,
  center: Position,
  radius = SNAPBACK_LOCAL_LIMITS.localRadius,
  maxMoves = SNAPBACK_LOCAL_LIMITS.maxCandidateMoves,
): Position[] {
  const { size } = state.board;
  const candidates: Array<{ position: Position; distance: number }> = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const position = { row, col };
      if (!isInBounds(state.board, position) || !isWithinLocalRegion(center, position, radius)) {
        continue;
      }

      if (!isLegalPlay(state, position).legal) {
        continue;
      }

      candidates.push({ position, distance: manhattanDistance(center, position) });
    }
  }

  candidates.sort((left, right) => left.distance - right.distance);
  return candidates.slice(0, maxMoves).map((entry) => entry.position);
}

function timedOut(startMs: number): boolean {
  return performance.now() - startMs >= SNAPBACK_LOCAL_LIMITS.maxElapsedMs;
}

/**
 * Bounded local snapback probe: checks whether a sacrifice can be captured once and
 * recaptured for a larger gain. Returns unknown when limits are hit or no match is found.
 */
export function readSnapbackOpportunityLocal(
  afterState: GameState,
  sacrificeMove: Move,
  limits: Partial<SnapbackLocalLimitsConfig> = {},
): SnapbackLocalSearchResult {
  if (sacrificeMove.type !== 'play') {
    return { outcome: 'unknown' };
  }

  const config = { ...SNAPBACK_LOCAL_LIMITS, ...limits };
  const startMs = performance.now();
  const sacrificer = sacrificeMove.color;
  const opponent = OPPONENT[sacrificer];
  const sacrificePoint = sacrificeMove.position;
  const opponentState = {
    ...afterState,
    currentPlayer: opponent,
  };

  const captureCandidates = getLocalCandidateMoves(
    opponentState,
    sacrificePoint,
    config.localRadius,
    config.maxCandidateMoves,
  );

  for (const capturePoint of captureCandidates) {
    if (timedOut(startMs)) {
      return { outcome: 'unknown' };
    }

    const captureState = tryPlay(opponentState, capturePoint);
    if (!captureState) {
      continue;
    }

    const captureMove = captureState.history.at(-1)?.move;
    if (
      captureMove?.type !== 'play' ||
      (captureMove.captured?.length ?? 0) !== 1 ||
      !captureMove.captured.some((stone) => positionsEqual(stone, sacrificePoint))
    ) {
      continue;
    }

    if (captureState.currentPlayer !== sacrificer) {
      continue;
    }

    if (config.maxPlies < 3) {
      continue;
    }

    const recaptureState = tryPlay(captureState, capturePoint);
    if (!recaptureState) {
      continue;
    }

    const recaptureMove = recaptureState.history.at(-1)?.move;
    const recaptureCount =
      recaptureMove?.type === 'play' ? recaptureMove.captured?.length ?? 0 : 0;

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
      ],
      sacrificePoint,
      recapturePoint: capturePoint,
    };
  }

  return { outcome: 'unknown' };
}

export function readSnapbackRecaptureFromHistory(
  historyMoves: Move[],
  recaptureMove: Move,
  minRecaptureStones = 2,
): SnapbackReadResult | { outcome: 'unknown' } {
  if (recaptureMove.type !== 'play') {
    return { outcome: 'unknown' };
  }

  const recaptureCount = recaptureMove.captured?.length ?? 0;
  if (recaptureCount < minRecaptureStones) {
    return { outcome: 'unknown' };
  }

  const historical = readHistoricalSnapback(historyMoves, recaptureMove);
  return historical ?? { outcome: 'unknown' };
}

export function matchesSnapbackScript(
  moves: Array<{ color: StoneColor; position: Position; captured: Position[] }>,
  script: {
    sacrificePoint: Position;
    opponentCapturePoint: Position;
    recapturePoint: Position;
    minRecaptureStones?: number;
  },
): boolean {
  const minStones = script.minRecaptureStones ?? 2;
  if (moves.length < 3) {
    return false;
  }

  const [sacrifice, capture, recapture] = moves.slice(-3);
  if (!positionsEqual(sacrifice.position, script.sacrificePoint)) {
    return false;
  }
  if (!positionsEqual(capture.position, script.opponentCapturePoint)) {
    return false;
  }
  if (!positionsEqual(recapture.position, script.recapturePoint)) {
    return false;
  }
  if (sacrifice.captured.length !== 0) {
    return false;
  }
  if (capture.captured.length !== 1) {
    return false;
  }
  if (!capture.captured.some((stone) => positionsEqual(stone, script.sacrificePoint))) {
    return false;
  }

  return recapture.captured.length >= minStones;
}
