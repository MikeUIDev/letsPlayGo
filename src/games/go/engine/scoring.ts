import { getNeighbors, getStone, positionKey, withoutStone } from './board';
import type { Board, GameResult, Position, StoneColor } from './types';

export interface ScoreOptions {
  komi: number;
  /** Intersections marked dead during scoring; removed before territory counting. */
  deadStones?: readonly Position[];
}

export interface ScoreBreakdown {
  blackStones: number;
  whiteStones: number;
  blackTerritory: number;
  whiteTerritory: number;
  blackTotal: number;
  whiteTotal: number;
  komi: number;
}

export type TerritoryOwner = 'black' | 'white' | 'neutral';

export interface EmptyRegion {
  positions: Position[];
  touchesBlack: boolean;
  touchesWhite: boolean;
  owner: TerritoryOwner;
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

/** Classify territory ownership from bordering stone colors. */
export function classifyTerritoryOwner(
  touchesBlack: boolean,
  touchesWhite: boolean,
): TerritoryOwner {
  if (touchesBlack && !touchesWhite) return 'black';
  if (touchesWhite && !touchesBlack) return 'white';
  return 'neutral';
}

/** Flood-fill a connected empty region and record bordering colors. */
export function floodEmptyRegion(
  board: Board,
  start: Position,
): EmptyRegion {
  const positions: Position[] = [];
  const queue = [start];
  const visited = new Set<string>();
  let touchesBlack = false;
  let touchesWhite = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = positionKey(current);
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
      else if (!visited.has(positionKey(neighbor))) {
        queue.push(neighbor);
      }
    }
  }

  return {
    positions,
    touchesBlack,
    touchesWhite,
    owner: classifyTerritoryOwner(touchesBlack, touchesWhite),
  };
}

/** All connected empty regions on the effective scoring board. */
export function getEmptyRegions(
  board: Board,
  deadStones: readonly Position[] = [],
): EmptyRegion[] {
  const scoringBoard = boardForScoring(board, deadStones);
  const { size } = scoringBoard;
  const visited = new Set<string>();
  const regions: EmptyRegion[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = positionKey({ row, col });
      if (getStone(scoringBoard, { row, col }) !== null || visited.has(key)) continue;

      const region = floodEmptyRegion(scoringBoard, { row, col });
      for (const pos of region.positions) {
        visited.add(positionKey(pos));
      }
      regions.push(region);
    }
  }

  return regions;
}

/** Map empty intersection keys to territory owner for visualization. */
export function getTerritoryOwnershipMap(
  board: Board,
  deadStones: readonly Position[] = [],
): Map<string, TerritoryOwner> {
  const map = new Map<string, TerritoryOwner>();
  for (const region of getEmptyRegions(board, deadStones)) {
    for (const pos of region.positions) {
      map.set(positionKey(pos), region.owner);
    }
  }
  return map;
}

/**
 * Chinese area scoring:
 *   score = stones on board + empty territory surrounded by that color.
 * Captured prisoners are not added to the score in Chinese rules.
 */
export function calculateChineseScore(
  board: Board,
  deadStones: readonly Position[] = [],
): Omit<ScoreBreakdown, 'blackTotal' | 'whiteTotal' | 'komi'> {
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

  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (const region of getEmptyRegions(board, deadStones)) {
    if (region.owner === 'black') blackTerritory += region.positions.length;
    else if (region.owner === 'white') whiteTerritory += region.positions.length;
  }

  return { blackTerritory, whiteTerritory, blackStones, whiteStones };
}

/** Full score breakdown including komi and totals. */
export function calculateScoreBreakdown(
  board: Board,
  komi: number,
  deadStones: readonly Position[] = [],
): ScoreBreakdown {
  const counts = calculateChineseScore(board, deadStones);
  return {
    ...counts,
    komi,
    blackTotal: counts.blackStones + counts.blackTerritory,
    whiteTotal: counts.whiteStones + counts.whiteTerritory + komi,
  };
}

/** Determine winner using Chinese area scoring. */
export function scoreGame(board: Board, options: ScoreOptions): GameResult {
  const { komi, deadStones = [] } = options;
  const breakdown = calculateScoreBreakdown(board, komi, deadStones);

  let winner: StoneColor | 'draw' | null;
  if (breakdown.blackTotal > breakdown.whiteTotal) winner = 'black';
  else if (breakdown.whiteTotal > breakdown.blackTotal) winner = 'white';
  else winner = 'draw';

  return {
    winner,
    blackScore: breakdown.blackTotal,
    whiteScore: breakdown.whiteTotal,
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

/** Winning margin for display (0 for draws). */
export function scoreMargin(result: GameResult): number {
  return Math.abs(result.blackScore - result.whiteScore);
}
