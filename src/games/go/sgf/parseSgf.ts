import type { BoardSize, StoneColor } from '../engine/types';
import { sgfToPosition } from './coordinates';
import type {
  ParsedSgfGameResult,
  ParsedSgfResult,
  ParseSgfResult,
  SgfMove,
} from './types';

const SUPPORTED_BOARD_SIZES: BoardSize[] = [9, 13, 19];

function stripSgfComments(text: string): string {
  return text.replace(/\{[^}]*\}/g, '');
}

function isLinearSgf(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return false;
  const inner = trimmed.slice(1, -1);
  return !inner.includes('(');
}

function parsePropertyValue(text: string, key: string): string | null {
  const pattern = new RegExp(`${key}\\[([^\\]]*)\\]`, 'i');
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function parseBoardSize(text: string): BoardSize | null {
  const value = parsePropertyValue(text, 'SZ');
  if (!value) return null;
  const size = Number(value);
  return SUPPORTED_BOARD_SIZES.includes(size as BoardSize) ? (size as BoardSize) : null;
}

function parseKomi(text: string): number {
  const value = parsePropertyValue(text, 'KM');
  if (!value) return 6.5;
  const komi = Number(value);
  return Number.isFinite(komi) ? komi : 6.5;
}

function parseGameType(text: string): boolean {
  const gm = parsePropertyValue(text, 'GM');
  return gm === null || gm === '1';
}

function parseResult(text: string): ParsedSgfGameResult | null {
  const value = parsePropertyValue(text, 'RE');
  if (!value) return null;

  if (value === '0' || value.toLowerCase() === 'draw') {
    return { kind: 'draw' };
  }

  const resignMatch = value.match(/^([BW])\+R$/i);
  if (resignMatch) {
    return {
      kind: 'resign',
      winner: resignMatch[1].toUpperCase() === 'B' ? 'black' : 'white',
    };
  }

  const scoreMatch = value.match(/^([BW])\+(\d+(?:\.\d+)?)$/i);
  if (scoreMatch) {
    return {
      kind: 'score',
      winner: scoreMatch[1].toUpperCase() === 'B' ? 'black' : 'white',
      margin: Number(scoreMatch[2]),
    };
  }

  return null;
}

function parseMoves(text: string, size: BoardSize): { ok: true; moves: SgfMove[] } | { ok: false; error: 'invalid_coordinate' | 'move_order' } {
  const moves: SgfMove[] = [];
  const pattern = /;([BW])\[([a-z]{0,2})?\]/gi;
  let match: RegExpExecArray | null;
  let expected: StoneColor = 'black';

  while ((match = pattern.exec(text)) !== null) {
    const color: StoneColor = match[1].toUpperCase() === 'B' ? 'black' : 'white';
    if (color !== expected) {
      return { ok: false, error: 'move_order' };
    }

    const coordinate = match[2] ?? '';
    if (coordinate.length === 0) {
      moves.push({ type: 'pass', color });
    } else {
      const position = sgfToPosition(coordinate, size);
      if (!position) {
        return { ok: false, error: 'invalid_coordinate' };
      }
      moves.push({ type: 'play', color, position });
    }

    expected = color === 'black' ? 'white' : 'black';
  }

  return { ok: true, moves };
}

/** Properties that would change the starting board or move order beyond linear replay. */
function hasUnsupportedReconstructionProperties(text: string): boolean {
  return /\b(AB|AW|AE|PL|HA)\[/i.test(text);
}

/** Parse a simple linear SGF game record. */
export function parseSgf(text: string): ParseSgfResult {
  if (!text.trim()) {
    return { ok: false, error: 'empty_file' };
  }

  const cleaned = stripSgfComments(text.trim());

  if (!isLinearSgf(cleaned)) {
    return { ok: false, error: 'unsupported_variations' };
  }

  if (hasUnsupportedReconstructionProperties(cleaned)) {
    return { ok: false, error: 'unsupported_features' };
  }

  if (!parseGameType(cleaned)) {
    return { ok: false, error: 'unsupported_features' };
  }

  const size = parseBoardSize(cleaned);
  if (!size) {
    return { ok: false, error: 'unsupported_board_size' };
  }

  const moveResult = parseMoves(cleaned, size);
  if (!moveResult.ok) {
    return { ok: false, error: moveResult.error };
  }

  return {
    ok: true,
    data: {
      size,
      komi: parseKomi(cleaned),
      moves: moveResult.moves,
      result: parseResult(cleaned),
    },
  };
}

/** Parse SGF and return the extracted game data. */
export function parseSgfGame(text: string): ParseSgfResult {
  try {
    return parseSgf(text);
  } catch {
    return { ok: false, error: 'invalid_sgf' };
  }
}

export type { ParsedSgfResult };
