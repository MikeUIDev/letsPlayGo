import { positionsEqual } from './board';
import type { GameState, Position } from './types';

/**
 * Simple ko: if exactly one stone was captured, forbid recapture at that point
 * on the immediately following turn.
 */
export function computeKoPoint(captured: Position[]): Position | null {
  if (captured.length !== 1) return null;
  return captured[0];
}

/** True when playing at `pos` violates the current ko restriction. */
export function violatesKo(state: GameState, pos: Position): boolean {
  if (state.koPoint === null) return false;
  return positionsEqual(state.koPoint, pos);
}
