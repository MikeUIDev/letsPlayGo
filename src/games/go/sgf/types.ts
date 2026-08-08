import type { BoardSize, GameResult, GameState, Position, StoneColor } from '../engine/types';

export type SgfMove =
  | { type: 'play'; color: StoneColor; position: Position }
  | { type: 'pass'; color: StoneColor };

export interface ParsedSgfResult {
  size: BoardSize;
  komi: number;
  moves: SgfMove[];
  result: ParsedSgfGameResult | null;
}

export type ParsedSgfGameResult =
  | { kind: 'score'; winner: StoneColor; margin: number }
  | { kind: 'resign'; winner: StoneColor }
  | { kind: 'draw' };

export type ParseSgfResult =
  | { ok: true; data: ParsedSgfResult }
  | { ok: false; error: SgfErrorCode };

export type ImportSgfResult =
  | { ok: true; state: GameState }
  | { ok: false; error: SgfErrorCode };

export type SgfErrorCode =
  | 'invalid_sgf'
  | 'unsupported_variations'
  | 'unsupported_features'
  | 'unsupported_board_size'
  | 'invalid_coordinate'
  | 'illegal_move'
  | 'move_order'
  | 'empty_file';

export interface ExportedSgfResult {
  content: string;
  filename: string;
}

export function sgfErrorMessage(code: SgfErrorCode): string {
  switch (code) {
    case 'invalid_sgf':
      return 'Unable to import this SGF.';
    case 'unsupported_variations':
      return 'This SGF uses features not supported yet.';
    case 'unsupported_features':
      return 'This SGF uses features not supported yet.';
    case 'unsupported_board_size':
      return 'This SGF board size is not supported.';
    case 'invalid_coordinate':
      return 'The file contains an invalid coordinate.';
    case 'illegal_move':
      return 'The file contains an illegal move.';
    case 'move_order':
      return 'The file contains moves in an unexpected order.';
    case 'empty_file':
      return 'Unable to import this SGF.';
  }
}

export function applyParsedResultToState(
  state: GameState,
  result: ParsedSgfGameResult,
): GameState {
  if (result.kind === 'draw') {
    return {
      ...state,
      phase: 'ended',
      result: {
        winner: 'draw',
        blackScore: 0,
        whiteScore: state.config.komi,
        reason: 'score',
      },
    };
  }

  if (result.kind === 'resign') {
    const winner = result.winner;
    return {
      ...state,
      phase: 'ended',
      result: {
        winner,
        blackScore: winner === 'black' ? 1 : 0,
        whiteScore: winner === 'white' ? 1 : 0,
        reason: 'resign',
      },
    };
  }

  const { winner, margin } = result;
  const blackScore = winner === 'black' ? margin : 0;
  const whiteScore = winner === 'white' ? margin + state.config.komi : state.config.komi;

  return {
    ...state,
    phase: 'ended',
    result: {
      winner,
      blackScore,
      whiteScore,
      reason: 'score',
    },
  };
}

export function gameResultToSgfRe(result: GameResult): string | null {
  if (result.reason === 'resign') {
    if (result.winner === 'black') return 'B+R';
    if (result.winner === 'white') return 'W+R';
    return null;
  }

  if (result.winner === 'draw') return '0';

  const margin = Math.abs(result.blackScore - result.whiteScore);
  const formatted = Number.isInteger(margin) ? String(margin) : margin.toFixed(1);
  if (result.winner === 'black') return `B+${formatted}`;
  if (result.winner === 'white') return `W+${formatted}`;
  return null;
}
