import type { VariationMove } from '../analysis/types';
import { cloneBoard } from '../engine/board';
import { dispatch } from '../engine/gameState';
import type { Board, GameState, Position, StoneColor } from '../engine/types';
import type { SimulatedMove } from './types';

/** Immutable simulation state derived from a board position. */
export function createSimulationState(
  board: Board,
  currentPlayer: StoneColor,
  config?: GameState['config'],
): GameState {
  return {
    board: cloneBoard(board),
    config: config ?? {
      mode: 'local',
      size: board.size,
      komi: 6.5,
      firstPlayer: 'black',
    },
    currentPlayer,
    phase: 'playing',
    captures: { black: 0, white: 0 },
    history: [],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
  };
}

export function tryPlay(state: GameState, position: Position): GameState | null {
  const result = dispatch(state, { type: 'play', position });
  return result.ok ? result.state : null;
}

export function simulateMoves(
  startState: GameState,
  moves: SimulatedMove[],
): { state: GameState; sequence: VariationMove[]; played: number } {
  let state = startState;
  const sequence: VariationMove[] = [];

  for (const move of moves) {
    if (state.currentPlayer !== move.color) {
      break;
    }

    const next = tryPlay(state, move.position);
    if (!next) {
      break;
    }

    state = next;
    sequence.push({ color: move.color, position: move.position });
  }

  return { state, sequence, played: sequence.length };
}

export function simulateFromState(
  startState: GameState,
  moves: VariationMove[],
  maxMoves: number,
): { state: GameState; sequence: VariationMove[] } {
  let state = startState;
  const sequence: VariationMove[] = [];

  for (const move of moves.slice(0, maxMoves)) {
    if (move.position === 'pass') {
      const result = dispatch(state, { type: 'pass' });
      if (!result.ok) {
        break;
      }
      state = result.state;
      sequence.push(move);
      continue;
    }

    if (state.currentPlayer !== move.color) {
      break;
    }

    const next = tryPlay(state, move.position);
    if (!next) {
      break;
    }

    state = next;
    sequence.push(move);
  }

  return { state, sequence };
}
