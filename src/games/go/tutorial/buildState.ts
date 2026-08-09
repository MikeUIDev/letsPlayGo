import { createEmptyBoard, withStone } from '../engine/board';
import { createSimulationState } from '../tactics/simulate';
import type { Board, BoardSize, GameState, Position, StoneColor } from '../engine/types';
import type { TutorialStone } from './types';

export function pos(row: number, col: number): Position {
  return { row, col };
}

export function buildBoard(size: BoardSize, stones: TutorialStone[]): Board {
  let board = createEmptyBoard(size);

  for (const stone of stones) {
    board = withStone(board, { row: stone.row, col: stone.col }, stone.color);
  }

  return board;
}

export function buildTutorialState(
  size: BoardSize,
  stones: TutorialStone[],
  currentPlayer: StoneColor,
): GameState {
  return createSimulationState(buildBoard(size, stones), currentPlayer);
}
