import { cloneBoard, createEmptyBoard, withStone, withoutStone } from '../engine/board';
import { createInitialState } from '../engine/gameState';
import type { GameState, HistoryEntry } from '../engine/types';

const SNAPBACK_POINT = { row: 2, col: 2 } as const;

/**
 * Curated snapback recapture position: White is in atari with a single liberty at (2, 2).
 * History records the sacrifice and capture that set up the snapback recapture.
 */
export function buildSnapbackRecaptureDemoState(): GameState {
  let board = createEmptyBoard(9);

  for (const stone of [
    { row: 1, col: 2, color: 'white' as const },
    { row: 2, col: 1, color: 'white' as const },
    { row: 2, col: 3, color: 'white' as const },
  ]) {
    board = withStone(board, stone, stone.color);
  }

  for (const stone of [
    { row: 1, col: 1, color: 'black' as const },
    { row: 1, col: 3, color: 'black' as const },
    { row: 3, col: 1, color: 'black' as const },
    { row: 3, col: 3, color: 'black' as const },
    { row: 0, col: 2, color: 'black' as const },
    { row: 2, col: 0, color: 'black' as const },
    { row: 3, col: 2, color: 'black' as const },
    { row: 1, col: 0, color: 'black' as const },
    { row: 0, col: 1, color: 'black' as const },
  ]) {
    board = withStone(board, stone, stone.color);
  }

  const beforeSacrifice = cloneBoard(board);
  const afterSacrifice = withStone(cloneBoard(beforeSacrifice), SNAPBACK_POINT, 'black');
  const afterCapture = withoutStone(cloneBoard(afterSacrifice), SNAPBACK_POINT);

  const sacrificeEntry: HistoryEntry = {
    move: {
      type: 'play',
      color: 'black',
      position: SNAPBACK_POINT,
      captured: [],
    },
    board: beforeSacrifice,
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    currentPlayer: 'white',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  const captureEntry: HistoryEntry = {
    move: {
      type: 'play',
      color: 'white',
      position: SNAPBACK_POINT,
      captured: [SNAPBACK_POINT],
    },
    board: afterSacrifice,
    captures: { black: 0, white: 1 },
    consecutivePasses: 0,
    currentPlayer: 'black',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  return {
    ...createInitialState(9),
    board: afterCapture,
    currentPlayer: 'black',
    captures: { black: 0, white: 1 },
    history: [sacrificeEntry, captureEntry],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
    phase: 'playing',
  };
}

export const SNAPBACK_RECAPTURE_POINT = SNAPBACK_POINT;
