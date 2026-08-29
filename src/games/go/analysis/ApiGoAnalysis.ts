import { AiApiClient, ApiTransportError } from '../api/client';
import { AI_ANALYZE_PATH } from '../api/contracts';
import {
  AnalysisError,
  analysisTimeoutMessage,
  analysisUnavailableMessage,
} from './errors';
import { serializeAnalyzeRequest } from './serializeRequest';
import type { AnalysisRequest, AnalysisResult, GoAnalysisService } from './types';
import type { BoardSize, StoneColor } from '../engine/types';
import { formatCoordinate } from '../utils/coordinates';

type ApiAnalysisResponse = {
  winRate?: {
    black?: number;
    white?: number;
  };
  scoreLead?: {
    leader?: StoneColor;
    points?: number;
  };
  candidates?: Array<
    | {
        type?: 'play';
        position?: { x?: number; y?: number };
        winRate?: number;
        scoreLead?: number;
        visits?: number;
        variation?: Array<{
          color?: StoneColor;
          position?: { x?: number; y?: number } | 'pass';
        }>;
      }
    | {
        type?: 'pass';
        winRate?: number;
        scoreLead?: number;
        visits?: number;
        variation?: Array<{
          color?: StoneColor;
          position?: { x?: number; y?: number } | 'pass';
        }>;
      }
  >;
};

export interface ApiGoAnalysisOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class ApiGoAnalysis implements GoAnalysisService {
  private readonly client: AiApiClient;

  constructor(options: ApiGoAnalysisOptions) {
    this.client = new AiApiClient({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs ?? 30_000,
      fetchImpl: options.fetchImpl,
    });
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const payload = await this.client.postJson<unknown>({
        path: AI_ANALYZE_PATH,
        body: serializeAnalyzeRequest(request),
      });
      return parseAnalysisResponse(payload);
    } catch (error) {
      throw toAnalysisError(error);
    }
  }
}

function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) {
    return error;
  }

  if (error instanceof ApiTransportError) {
    const code =
      error.code === 'invalid_move' ? 'invalid_response' : error.code;
    return new AnalysisError(code, error.message);
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new AnalysisError('timeout', analysisTimeoutMessage());
  }

  if (error instanceof SyntaxError) {
    return new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  return new AnalysisError('network', analysisUnavailableMessage());
}

export function parseAnalysisResponse(payload: unknown): AnalysisResult {
  if (!payload || typeof payload !== 'object') {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  const body = payload as ApiAnalysisResponse;

  if (!body.winRate || typeof body.winRate !== 'object') {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  if (!body.scoreLead || typeof body.scoreLead !== 'object') {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  if (!Array.isArray(body.candidates)) {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  const black = body.winRate.black;
  const white = body.winRate.white;
  if (typeof black !== 'number' || typeof white !== 'number') {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  const leader = body.scoreLead.leader;
  const points = body.scoreLead.points;
  if ((leader !== 'black' && leader !== 'white') || typeof points !== 'number') {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  return {
    winRate: { black, white },
    scoreLead: { leader, points },
    candidates: body.candidates.map(parseCandidate),
  };
}

function parseVariation(
  variation: NonNullable<
    NonNullable<ApiAnalysisResponse['candidates']>[number]['variation']
  >,
): import('./types').VariationMove[] {
  const moves: import('./types').VariationMove[] = [];

  for (const entry of variation) {
    if (entry.color !== 'black' && entry.color !== 'white') {
      continue;
    }

    if (entry.position === 'pass') {
      moves.push({ color: entry.color, position: 'pass' });
      continue;
    }

    const position = entry.position;
    if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
      continue;
    }

    moves.push({
      color: entry.color,
      position: { row: position.y as number, col: position.x as number },
    });
  }

  return moves;
}

function parseCandidate(
  candidate: NonNullable<ApiAnalysisResponse['candidates']>[number],
): AnalysisResult['candidates'][number] {
  const winRate = typeof candidate.winRate === 'number' ? candidate.winRate : 0;
  const scoreLead = typeof candidate.scoreLead === 'number' ? candidate.scoreLead : 0;
  const visits = typeof candidate.visits === 'number' ? candidate.visits : 0;
  const variation =
    'variation' in candidate && Array.isArray(candidate.variation)
      ? parseVariation(candidate.variation)
      : undefined;

  if (candidate.type === 'pass') {
    return { type: 'pass', winRate, scoreLead, visits, variation };
  }

  const position = 'position' in candidate ? candidate.position : undefined;
  if (!position) {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  const x = position.x;
  const y = position.y;
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new AnalysisError('invalid_response', analysisUnavailableMessage());
  }

  return {
    type: 'play',
    position: {
      row: y as number,
      col: x as number,
    },
    winRate,
    scoreLead,
    visits,
    variation,
  };
}

export function formatWinRatePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatScoreLeadLabel(scoreLead: AnalysisResult['scoreLead']): string {
  if (scoreLead.points < 0.05) {
    return 'Even';
  }

  const leader = scoreLead.leader === 'black' ? 'Black' : 'White';
  return `${leader} +${scoreLead.points.toFixed(1)}`;
}

export function formatCandidateLabel(
  candidate: AnalysisResult['candidates'][number],
  boardSize: BoardSize,
): string {
  if (candidate.type === 'pass') {
    return 'Pass';
  }

  return formatCoordinate(candidate.position, boardSize);
}
