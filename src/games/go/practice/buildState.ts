import { createEmptyBoard, withStone } from '../engine/board';
import { createSimulationState } from '../tactics/simulate';
import { buildKoRecaptureDemoState } from '../tutorial/koLessonState';
import { buildSnapbackRecaptureDemoState } from '../tutorial/snapbackLessonState';
import type { BoardSize, GameState, Position } from '../engine/types';
import type { GoPuzzle, PuzzleStone } from './types';

export function pos(row: number, col: number): Position {
  return { row, col };
}

export function buildBoard(size: BoardSize, stones: PuzzleStone[]) {
  let board = createEmptyBoard(size);

  for (const stone of stones) {
    board = withStone(board, { row: stone.row, col: stone.col }, stone.color);
  }

  return board;
}

export function buildPuzzleState(puzzle: GoPuzzle): GameState {
  if (puzzle.presetState === 'ko-recapture-demo') {
    return buildKoRecaptureDemoState();
  }

  if (puzzle.presetState === 'snapback-recapture-demo') {
    return buildSnapbackRecaptureDemoState();
  }

  return createSimulationState(buildBoard(puzzle.boardSize, puzzle.stones), puzzle.playerToMove);
}
