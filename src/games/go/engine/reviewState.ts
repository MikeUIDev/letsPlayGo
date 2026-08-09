import { getStone, positionKey } from './board';
import { configToSetup } from './gameConfig';
import {
  createGameFromSetup,
  dispatch,
  getMoveList,
} from './gameState';
import type { Board, GameAction, GameState, Move, Position } from './types';

export function getReviewMoveCount(state: GameState): number {
  return state.history.length;
}

function moveToAction(move: Move): GameAction | null {
  if (move.type === 'pass') {
    return { type: 'pass' };
  }

  if (move.type === 'resign') {
    return null;
  }

  return { type: 'play', position: move.position };
}

/** Reconstruct the historical game state after `moveIndex` moves without mutating source. */
export function reconstructStateAtIndex(sourceState: GameState, moveIndex: number): GameState {
  const totalMoves = getReviewMoveCount(sourceState);
  if (moveIndex < 0 || moveIndex > totalMoves) {
    throw new Error('invalid_move_index');
  }

  const setup = configToSetup(sourceState.config);
  let state = createGameFromSetup(setup);
  const moves = getMoveList(sourceState);

  for (let index = 0; index < moveIndex; index += 1) {
    const action = moveToAction(moves[index]);
    if (!action) {
      continue;
    }

    const result = dispatch(state, action);
    if (!result.ok) {
      throw new Error(`replay_failed:${result.error}`);
    }
    state = result.state;
  }

  return state;
}

export function getLastMoveAtIndex(sourceState: GameState, moveIndex: number): Position | null {
  if (moveIndex <= 0) {
    return null;
  }

  const moves = getMoveList(sourceState);
  for (let index = moveIndex - 1; index >= 0; index -= 1) {
    const move = moves[index];
    if (move.type === 'play') {
      return move.position;
    }
  }

  return null;
}

export function buildAnalysisRequest(sourceState: GameState, moveIndex: number) {
  const reviewState = reconstructStateAtIndex(sourceState, moveIndex);
  const moves = getMoveList(sourceState).slice(0, moveIndex);

  return {
    boardSize: sourceState.config.size,
    komi: sourceState.config.komi,
    colorToMove: reviewState.currentPlayer,
    moves,
    state: reviewState,
  };
}

export function getCandidateMarkers(
  board: Board,
  candidates: Array<{ type: 'play'; position: Position } | { type: 'pass' }>,
): Map<string, number> {
  const markers = new Map<string, number>();

  candidates.forEach((candidate, index) => {
    if (candidate.type !== 'play') {
      return;
    }

    if (getStone(board, candidate.position) !== null) {
      return;
    }

    markers.set(positionKey(candidate.position), index + 1);
  });

  return markers;
}

export type ReviewNavigation = {
  moveIndex: number;
  moveCount: number;
  canGoFirst: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canGoLast: boolean;
};

export function getReviewNavigation(moveIndex: number, moveCount: number): ReviewNavigation {
  return {
    moveIndex,
    moveCount,
    canGoFirst: moveIndex > 0,
    canGoPrevious: moveIndex > 0,
    canGoNext: moveIndex < moveCount,
    canGoLast: moveIndex < moveCount,
  };
}

export function clampReviewMoveIndex(moveIndex: number, moveCount: number): number {
  return Math.max(0, Math.min(moveCount, moveIndex));
}

import type { AnalysisResult } from '../analysis/types';

export class ReviewAnalysisCache {
  private readonly cache = new Map<number, AnalysisResult>();
  private generation = 0;

  get(index: number) {
    return this.cache.get(index);
  }

  set(index: number, result: AnalysisResult) {
    this.cache.set(index, result);
  }

  has(index: number) {
    return this.cache.has(index);
  }

  beginRequest(): number {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(requestGeneration: number): boolean {
    return requestGeneration === this.generation;
  }
}
