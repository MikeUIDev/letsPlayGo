import { BEGINNER_TUNING } from './beginnerConfig.js';
import { gtpVertexToGrid } from '../katago/coordinates.js';
import {
  selectBestMoveFromAnalysis,
  type AnalysisMoveInfo,
  type AnalysisResponse,
} from '../katago/protocol.js';
import type { GenerateMoveResult } from '../katago/types.js';

export type RandomFn = () => number;

export type BeginnerCandidate = {
  moveInfo: AnalysisMoveInfo;
  /** 1-based rank among eligible candidates (best eligible = 1). */
  eligibleRank: number;
  isPass: boolean;
  position?: { x: number; y: number };
};

export function isPassMove(move: string): boolean {
  return move.trim().toLowerCase() === 'pass';
}

export function sortMoveInfosByRank(moveInfos: AnalysisMoveInfo[]): AnalysisMoveInfo[] {
  return [...moveInfos].sort((left, right) => (left.order ?? 999) - (right.order ?? 999));
}

export function getBestScoreLead(moveInfos: readonly AnalysisMoveInfo[]): number | null {
  let best: number | null = null;

  for (const info of moveInfos) {
    if (typeof info.scoreLead === 'number' && Number.isFinite(info.scoreLead)) {
      if (best === null || info.scoreLead > best) {
        best = info.scoreLead;
      }
    }
  }

  return best;
}

export function passesScoreCutoff(
  candidate: AnalysisMoveInfo,
  bestScoreLead: number | null,
  maxScoreLoss: number = BEGINNER_TUNING.maxScoreLoss,
): boolean {
  if (bestScoreLead === null) {
    return true;
  }

  if (typeof candidate.scoreLead !== 'number' || !Number.isFinite(candidate.scoreLead)) {
    return true;
  }

  return bestScoreLead - candidate.scoreLead <= maxScoreLoss;
}

export function buildBeginnerCandidates(
  response: AnalysisResponse,
  boardSize: number,
): BeginnerCandidate[] {
  const sorted = sortMoveInfosByRank(response.moveInfos ?? []);
  const topCandidates = sorted.slice(0, BEGINNER_TUNING.maxCandidateCount);
  const bestScoreLead = getBestScoreLead(topCandidates);
  const eligible: Omit<BeginnerCandidate, 'eligibleRank'>[] = [];

  for (const info of topCandidates) {
    if (!info.move) {
      continue;
    }

    if (!passesScoreCutoff(info, bestScoreLead)) {
      continue;
    }

    if (isPassMove(info.move)) {
      eligible.push({
        moveInfo: info,
        isPass: true,
      });
      continue;
    }

    try {
      const position = gtpVertexToGrid(info.move, boardSize);
      if (position === 'pass') {
        continue;
      }

      eligible.push({
        moveInfo: info,
        isPass: false,
        position,
      });
    } catch {
      continue;
    }
  }

  return eligible.map((candidate, index) => ({
    ...candidate,
    eligibleRank: index + 1,
  }));
}

export function filterPassWhenBoardMovesExist(candidates: BeginnerCandidate[]): BeginnerCandidate[] {
  if (BEGINNER_TUNING.allowPassWhenBoardMovesExist) {
    return candidates;
  }

  const boardMoves = candidates.filter((candidate) => !candidate.isPass);
  return boardMoves.length > 0 ? boardMoves : candidates;
}

export function weightForEligibleRank(eligibleRank: number): number {
  const index = eligibleRank - 1;
  const weights = BEGINNER_TUNING.rankWeights;
  return weights[Math.min(index, weights.length - 1)] ?? weights[weights.length - 1];
}

export function selectWeightedCandidate(
  candidates: BeginnerCandidate[],
  randomFn: RandomFn,
): BeginnerCandidate {
  const weights = candidates.map((candidate) => weightForEligibleRank(candidate.eligibleRank));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return candidates[0];
  }

  let roll = randomFn() * total;

  for (let index = 0; index < candidates.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return candidates[index];
    }
  }

  return candidates[candidates.length - 1];
}

export function candidateToMoveResult(candidate: BeginnerCandidate): GenerateMoveResult {
  if (candidate.isPass) {
    return { type: 'pass' };
  }

  if (!candidate.position) {
    throw new Error('empty_candidate_position');
  }

  return { type: 'play', position: candidate.position };
}

export function selectBeginnerMoveFromAnalysis(
  response: AnalysisResponse,
  boardSize: number,
  randomFn: RandomFn = Math.random,
): GenerateMoveResult {
  if (response.error) {
    throw new Error('analysis_error');
  }

  const moveInfos = response.moveInfos ?? [];
  if (moveInfos.length === 0) {
    return { type: 'pass' };
  }

  let candidates = buildBeginnerCandidates(response, boardSize);
  candidates = filterPassWhenBoardMovesExist(candidates);

  if (candidates.length === 0) {
    return selectBestMoveFromAnalysis(response, boardSize);
  }

  if (candidates.length === 1) {
    return candidateToMoveResult(candidates[0]);
  }

  return candidateToMoveResult(selectWeightedCandidate(candidates, randomFn));
}
