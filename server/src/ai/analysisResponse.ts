import { REVIEW_ANALYSIS } from './reviewConfig.js';
import { sortMoveInfosByRank } from './beginnerMoveSelection.js';
import { gtpVertexToGrid } from '../katago/coordinates.js';
import type { AnalysisMoveInfo, AnalysisResponse } from '../katago/protocol.js';
import type { StoneColor } from '../katago/types.js';

const TIED_SCORE_THRESHOLD = 0.05;

export type DomainVariationMove =
  | { color: StoneColor; position: { x: number; y: number } }
  | { color: StoneColor; position: 'pass' };

export type DomainWinRate = {
  black: number;
  white: number;
};

export type DomainScoreLead = {
  leader: StoneColor;
  points: number;
};

export type DomainAnalysisCandidate =
  | {
      type: 'play';
      position: { x: number; y: number };
      winRate: number;
      scoreLead: number;
      visits: number;
      variation?: DomainVariationMove[];
    }
  | {
      type: 'pass';
      winRate: number;
      scoreLead: number;
      visits: number;
      variation?: DomainVariationMove[];
    };

export type DomainAnalysisResponse = {
  winRate: DomainWinRate;
  scoreLead: DomainScoreLead;
  candidates: DomainAnalysisCandidate[];
};

function clampWinRate(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/** KataGo win rates are from the player to move; normalize to black/white. */
export function normalizeWinRate(
  playerWinRate: number,
  colorToMove: StoneColor,
): DomainWinRate {
  const clamped = clampWinRate(playerWinRate);
  if (colorToMove === 'black') {
    return { black: clamped, white: 1 - clamped };
  }
  return { black: 1 - clamped, white: clamped };
}

/** KataGo scoreLead is from the player to move; normalize to leader + magnitude. */
export function normalizeScoreLead(
  scoreLead: number | undefined,
  colorToMove: StoneColor,
): DomainScoreLead {
  if (scoreLead === undefined || !Number.isFinite(scoreLead)) {
    return { leader: 'black', points: 0 };
  }

  const magnitude = roundScore(Math.abs(scoreLead));
  if (magnitude < TIED_SCORE_THRESHOLD) {
    return { leader: 'black', points: 0 };
  }

  if (scoreLead > 0) {
    return { leader: colorToMove, points: magnitude };
  }

  return { leader: colorToMove === 'black' ? 'white' : 'black', points: magnitude };
}

/** Convert player-perspective score lead to black-positive points. */
export function scoreLeadFromBlackPerspective(
  scoreLead: number,
  colorToMove: StoneColor,
): number {
  return colorToMove === 'black' ? scoreLead : -scoreLead;
}

function extractPlayerWinRate(
  response: AnalysisResponse,
  colorToMove: StoneColor,
): number | null {
  if (typeof response.rootInfo?.winrate === 'number' && Number.isFinite(response.rootInfo.winrate)) {
    return response.rootInfo.winrate;
  }

  const best = sortMoveInfosByRank(response.moveInfos ?? [])[0];
  if (typeof best?.winrate === 'number' && Number.isFinite(best.winrate)) {
    return best.winrate;
  }

  return colorToMove === 'black' ? 0.5 : 0.5;
}

function extractPlayerScoreLead(response: AnalysisResponse): number | undefined {
  if (typeof response.rootInfo?.scoreLead === 'number' && Number.isFinite(response.rootInfo.scoreLead)) {
    return response.rootInfo.scoreLead;
  }

  const best = sortMoveInfosByRank(response.moveInfos ?? [])[0];
  if (typeof best?.scoreLead === 'number' && Number.isFinite(best.scoreLead)) {
    return best.scoreLead;
  }

  return undefined;
}

function opponentColor(color: StoneColor): StoneColor {
  return color === 'black' ? 'white' : 'black';
}

export function normalizeVariation(
  pv: string[] | undefined,
  boardSize: number,
  colorToMove: StoneColor,
): DomainVariationMove[] | undefined {
  if (!pv || pv.length === 0) {
    return undefined;
  }

  const variation: DomainVariationMove[] = [];

  for (let index = 0; index < pv.length && variation.length < REVIEW_ANALYSIS.maxVariationMoves; index += 1) {
    const vertex = pv[index]?.trim();
    if (!vertex) {
      continue;
    }

    const color = index % 2 === 0 ? colorToMove : opponentColor(colorToMove);

    if (vertex.toLowerCase() === 'pass') {
      variation.push({ color, position: 'pass' });
      continue;
    }

    try {
      const grid = gtpVertexToGrid(vertex, boardSize);
      if (grid === 'pass') {
        variation.push({ color, position: 'pass' });
        continue;
      }

      variation.push({ color, position: grid });
    } catch {
      continue;
    }
  }

  return variation.length > 0 ? variation : undefined;
}

function mapCandidate(
  info: AnalysisMoveInfo,
  boardSize: number,
  colorToMove: StoneColor,
): DomainAnalysisCandidate | null {
  if (!info.move) {
    return null;
  }

  const winRate =
    typeof info.winrate === 'number' && Number.isFinite(info.winrate)
      ? normalizeWinRate(info.winrate, colorToMove).black
      : 0.5;
  const scoreLead =
    typeof info.scoreLead === 'number' && Number.isFinite(info.scoreLead)
      ? roundScore(scoreLeadFromBlackPerspective(info.scoreLead, colorToMove))
      : 0;
  const visits =
    typeof info.visits === 'number' && Number.isFinite(info.visits) ? info.visits : 0;
  const variation = normalizeVariation(info.pv, boardSize, colorToMove);

  if (info.move.trim().toLowerCase() === 'pass') {
    return { type: 'pass', winRate, scoreLead, visits, variation };
  }

  try {
    const position = gtpVertexToGrid(info.move, boardSize);
    if (position === 'pass') {
      return { type: 'pass', winRate, scoreLead, visits, variation };
    }

    return {
      type: 'play',
      position,
      winRate,
      scoreLead,
      visits,
      variation,
    };
  } catch {
    return null;
  }
}

export function mapAnalysisResponse(
  response: AnalysisResponse,
  boardSize: number,
  colorToMove: StoneColor,
): DomainAnalysisResponse {
  if (response.error) {
    throw new Error('analysis_error');
  }

  const playerWinRate = extractPlayerWinRate(response, colorToMove);
  const playerScoreLead = extractPlayerScoreLead(response);

  const sorted = sortMoveInfosByRank(response.moveInfos ?? []);
  const candidates: DomainAnalysisCandidate[] = [];

  for (const info of sorted) {
    const mapped = mapCandidate(info, boardSize, colorToMove);
    if (mapped) {
      candidates.push(mapped);
    }
    if (candidates.length >= REVIEW_ANALYSIS.maxCandidates) {
      break;
    }
  }

  return {
    winRate: normalizeWinRate(playerWinRate ?? 0.5, colorToMove),
    scoreLead: normalizeScoreLead(playerScoreLead, colorToMove),
    candidates,
  };
}
