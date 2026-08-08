import { getNeighbors, getStone, withoutStone } from './board';
import type { Board, GameResult, Position, StoneColor } from './types';

export interface ScoreOptions {
  komi: number;
  /** Intersections marked dead during scoring; removed before territory counting. */
  deadStones?: readonly Position[];
}

interface TerritoryResult {
  blackTerritory: number;
  whiteTerritory: number;
  blackStones: number;
  whiteStones: number;
}

function boardForScoring(board: Board, deadStones: readonly Position[]): Board {
  let scoringBoard = board;
  for (const pos of deadStones) {
    if (getStone(scoringBoard, pos) !== null) {
      scoringBoard = withoutStone(scoringBoard, pos);
    }
  }
  return scoringBoard;
}

/**
 * Chinese area scoring:
 *   score = stones on board + empty territory surrounded by that color.
 * Captured prisoners are not added to the score in Chinese rules.
 */
export function calculateChineseScore(
  board: Board,
  deadStones: readonly Position[] = [],
): TerritoryResult {
  const scoringBoard = boardForScoring(board, deadStones);
  const { size } = scoringBoard;
  let blackStones = 0;
  let whiteStones = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const stone = getStone(scoringBoard, { row, col });
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
      if (getStone(scoringBoard, { row, col }) !== null || visited.has(key)) continue;

      const region = floodEmptyRegion(scoringBoard, { row, col });
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
  start: Position,
): {
  positions: Position[];
  touchesBlack: boolean;
  touchesWhite: boolean;
} {
  const positions: Position[] = [];
  const queue = [start];
  const visited = new Set<string>();
  let touchesBlack = false;
  let touchesWhite = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const stone = getStone(board, current);
    if (stone !== null) {
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

/** Determine winner using Chinese area scoring. */
export function scoreGame(board: Board, options: ScoreOptions): GameResult {
  const { komi, deadStones = [] } = options;
  const { blackTerritory, whiteTerritory, blackStones, whiteStones } =
    calculateChineseScore(board, deadStones);

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

/** Default komi by board size. Override via GameConfig.komi. */
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

/** Provisional score during the scoring phase before final confirmation. */
export function calculateProvisionalScore(state: {
  board: Board;
  config: { komi: number };
  deadStones: readonly Position[];
}): GameResult {
  return scoreGame(state.board, {
    komi: state.config.komi,
    deadStones: state.deadStones,
  });
}
