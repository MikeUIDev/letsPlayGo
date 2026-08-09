import { cloneBoard, createEmptyBoard, withStone, withoutStone } from '../engine/board';
import { createInitialState } from '../engine/gameState';
import type { GameState, HistoryEntry } from '../engine/types';

/** Ko lesson: position immediately before Black captures at (8,7). */
export function buildKoCaptureStartState(): GameState {
  let board = createEmptyBoard(9);
  board = withStone(board, { row: 7, col: 7 }, 'white');
  board = withStone(board, { row: 8, col: 6 }, 'white');
  board = withStone(board, { row: 8, col: 8 }, 'white');
  board = withStone(board, { row: 6, col: 7 }, 'black');
  board = withStone(board, { row: 7, col: 6 }, 'black');
  board = withStone(board, { row: 7, col: 8 }, 'black');

  return {
    ...createInitialState(9),
    board,
    currentPlayer: 'black',
    history: [],
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    deadStones: [],
    result: null,
    phase: 'playing',
  };
}

/** Ko lesson: position after capture, with history required for ko detection. */
export function buildKoRecaptureDemoState(): GameState {
  let beforeBlack = createEmptyBoard(9);
  beforeBlack = withStone(beforeBlack, { row: 7, col: 7 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 8, col: 6 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 8, col: 8 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 6, col: 7 }, 'black');
  beforeBlack = withStone(beforeBlack, { row: 7, col: 6 }, 'black');
  beforeBlack = withStone(beforeBlack, { row: 7, col: 8 }, 'black');

  let afterBlack = withoutStone(cloneBoard(beforeBlack), { row: 7, col: 7 });
  afterBlack = withStone(afterBlack, { row: 8, col: 7 }, 'black');

  const whiteMove: HistoryEntry = {
    move: { type: 'play', color: 'white', position: { row: 7, col: 7 }, captured: [] },
    board: withoutStone(
      withoutStone(withoutStone(cloneBoard(beforeBlack), { row: 7, col: 7 }), { row: 8, col: 6 }),
      { row: 8, col: 8 },
    ),
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    currentPlayer: 'white',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  const blackCaptureMove: HistoryEntry = {
    move: {
      type: 'play',
      color: 'black',
      position: { row: 8, col: 7 },
      captured: [{ row: 7, col: 7 }],
    },
    board: beforeBlack,
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    currentPlayer: 'black',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  return {
    ...createInitialState(9),
    board: afterBlack,
    currentPlayer: 'white',
    captures: { black: 1, white: 0 },
    history: [whiteMove, blackCaptureMove],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
    phase: 'playing',
  };
}
