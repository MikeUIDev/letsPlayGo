import type { AiMoveRequest, GenerateMoveResult } from './types.js';
import {
  colorToGtpToken,
  gridToGtpVertex,
  gtpVertexToGrid,
} from './coordinates.js';
import type { ApiMove } from './types.js';

export const DEFAULT_MAX_VISITS = 100;

export type AnalysisMoveInfo = {
  move: string;
  order?: number;
  visits?: number;
  winrate?: number;
  scoreLead?: number;
};

export type AnalysisResponse = {
  id?: string;
  action?: string;
  error?: string;
  isDuringSearch?: boolean;
  turnNumber?: number;
  moveInfos?: AnalysisMoveInfo[];
  version?: string;
  git_hash?: string;
};

export function buildSpawnArgs(binaryPath: string, modelPath: string, configPath: string): string[] {
  return ['analysis', '-model', modelPath, '-config', configPath];
}

export function buildQueryVersionQuery(id: string): Record<string, unknown> {
  return { id, action: 'query_version' };
}

export function apiMoveToKataGoMove(
  move: ApiMove,
  boardSize: number,
): ['B' | 'W', string] {
  const color = colorToGtpToken(move.color);
  if ('type' in move && move.type === 'pass') {
    return [color, 'pass'];
  }

  const playMove = move as { color: ApiMove['color']; x: number; y: number };
  const vertex = gridToGtpVertex({ x: playMove.x, y: playMove.y }, boardSize).toUpperCase();
  return [color, vertex];
}

export function buildAnalysisQuery(
  request: AiMoveRequest,
  id: string,
  maxVisits = DEFAULT_MAX_VISITS,
): Record<string, unknown> {
  const moves = request.moves.map((move) => apiMoveToKataGoMove(move, request.boardSize));
  const turnNumber = request.moves.length;

  return {
    id,
    moves,
    rules: 'chinese',
    komi: request.komi,
    boardXSize: request.boardSize,
    boardYSize: request.boardSize,
    analyzeTurns: [turnNumber],
    maxVisits,
    ...(turnNumber === 0 ? { initialPlayer: colorToGtpToken(request.colorToMove) } : {}),
  };
}

export function serializeQueryLine(query: Record<string, unknown>): string {
  const line = JSON.stringify(query);
  if (line.includes('\n') || line.includes('\r')) {
    throw new Error('invalid_query');
  }
  return line;
}

export function parseJsonLine(line: string): unknown {
  const trimmed = line.trim();
  if (!trimmed) {
    throw new Error('empty_line');
  }

  return JSON.parse(trimmed) as unknown;
}

export function splitBufferedLines(buffer: string): { lines: string[]; remainder: string } {
  const lines: string[] = [];
  let rest = buffer;

  while (true) {
    const newlineIndex = rest.indexOf('\n');
    if (newlineIndex === -1) {
      break;
    }

    const line = rest.slice(0, newlineIndex).replace(/\r$/, '');
    rest = rest.slice(newlineIndex + 1);
    if (line.trim()) {
      lines.push(line);
    }
  }

  return { lines, remainder: rest };
}

export function isFinalAnalysisResponse(response: AnalysisResponse): boolean {
  if (response.action === 'query_version') {
    return true;
  }

  if (response.error) {
    return true;
  }

  return response.isDuringSearch !== true;
}

export function selectBestMoveFromAnalysis(
  response: AnalysisResponse,
  boardSize: number,
): GenerateMoveResult {
  if (response.error) {
    throw new Error('analysis_error');
  }

  const moveInfos = response.moveInfos ?? [];
  if (moveInfos.length === 0) {
    return { type: 'pass' };
  }

  const best =
    moveInfos.find((info) => info.order === 0) ??
    [...moveInfos].sort((left, right) => (left.order ?? 999) - (right.order ?? 999))[0];

  if (!best?.move) {
    throw new Error('empty_move_infos');
  }

  if (best.move.toLowerCase() === 'pass') {
    return { type: 'pass' };
  }

  const position = gtpVertexToGrid(best.move, boardSize);
  if (position === 'pass') {
    return { type: 'pass' };
  }

  return { type: 'play', position };
}
