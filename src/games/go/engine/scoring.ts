import { getNeighbors, getStone } from './board';
import type { Board, GameResult, StoneColor } from './types';

interface TerritoryResult {
  blackTerritory: number;
  whiteTerritory: number;
  blackStones: number;
  whiteStones: number;
}

/**
 * Chinese area scoring:
 *   score = stones on board + empty territory surrounded by that color.
 * Prisoners from captures during play are not added separately in area scoring.
 */
export function calculateChineseScore(board: Board): TerritoryResult {
  const { size } = board;
  let blackStones = 0;
  let whiteStones = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const stone = getStone(board, { row, col });
      if (stone === 'black') blackStones++;
      if (stone === 'white') whiteStones++;
    }
  }

  const visited = new Set<string>();
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = `${row},${col}`;
      if (getStone(board, { row, col }) !== null || visited.has(key)) continue;

      const region = floodEmptyRegion(board, { row, col });
      for (const pos of region.positions) {
        visited.add(`${pos.row},${pos.col}`);
      }

      if (region.touchesBlack && !region.touchesWhite) {
        blackTerritory += region.positions.length;
      } else if (region.touchesWhite && !region.touchesBlack) {
        whiteTerritory += region.positions.length;
      }
    }
  }

  return { blackTerritory, whiteTerritory, blackStones, whiteStones };
}

function floodEmptyRegion(
  board: Board,
  start: { row: number; col: number },
): {
  positions: { row: number; col: number }[];
  touchesBlack: boolean;
  touchesWhite: boolean;
} {
  const positions: { row: number; col: number }[] = [];
  const queue = [start];
  const visited = new Set<string>();
  let touchesBlack = false;
  let touchesWhite = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (getStone(board, current) !== null) {
      const stone = getStone(board, current);
      if (stone === 'black') touchesBlack = true;
      if (stone === 'white') touchesWhite = true;
      continue;
    }

    positions.push(current);

    for (const neighbor of getNeighbors(board, current)) {
      const neighborStone = getStone(board, neighbor);
      if (neighborStone === 'black') touchesBlack = true;
      else if (neighborStone === 'white') touchesWhite = true;
      else if (!visited.has(`${neighbor.row},${neighbor.col}`)) {
        queue.push(neighbor);
      }
    }
  }

  return { positions, touchesBlack, touchesWhite };
}

/** Determine winner using Chinese area scoring. White receives +0.5 komi on odd boards. */
export function scoreGame(board: Board, komi = 6.5): GameResult {
  const { blackTerritory, whiteTerritory, blackStones, whiteStones } =
    calculateChineseScore(board);

  const blackScore = blackStones + blackTerritory;
  const whiteScore = whiteStones + whiteTerritory + komi;

  let winner: StoneColor | 'draw' | null;
  if (blackScore > whiteScore) winner = 'black';
  else if (whiteScore > blackScore) winner = 'white';
  else winner = 'draw';

  return {
    winner,
    blackScore,
    whiteScore,
    reason: 'score',
  };
}

/** Komi by board size (standard values; configurable later). */
export function defaultKomi(size: Board['size']): number {
  switch (size) {
    case 9:
      return 6.5;
    case 13:
      return 6.5;
    case 19:
      return 7.5;
  }
}
