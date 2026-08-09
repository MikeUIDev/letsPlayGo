import { createEmptyBoard, withStone } from '../../engine/board';
import type { BoardSize, GameState } from '../../engine/types';
import type { DiagramSize, DiagramStone } from '../types';

export function buildDiagramState(size: DiagramSize, stones: DiagramStone[]): GameState {
  let board = createEmptyBoard(size as BoardSize);

  for (const stone of stones) {
    board = withStone(board, { row: stone.row, col: stone.col }, stone.color);
  }

  return {
    board,
    config: {
      mode: 'local',
      size: size as BoardSize,
      komi: 6.5,
      firstPlayer: 'black',
    },
    currentPlayer: 'black',
    phase: 'ended',
    captures: { black: 0, white: 0 },
    history: [],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
  };
}

export function highlightKeys(highlights: Array<{ row: number; col: number }> = []): Set<string> {
  return new Set(highlights.map((point) => `${point.row},${point.col}`));
}
