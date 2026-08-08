import type { GridPosition } from './types.js';

const MAX_BOARD_SIZE = 19;

/** Convert grid column index to a GTP column letter (skipping I). */
export function colToGtpLetter(col: number): string {
  if (!Number.isInteger(col) || col < 0 || col >= MAX_BOARD_SIZE) {
    throw new Error('invalid_col');
  }

  let code = 'a'.charCodeAt(0) + col;
  if (col >= 8) {
    code += 1;
  }

  return String.fromCharCode(code);
}

/** Convert a GTP column letter to a zero-based column index. */
export function gtpLetterToCol(letter: string): number {
  const normalized = letter.toLowerCase();
  if (normalized.length !== 1 || normalized < 'a' || normalized > 's' || normalized === 'i') {
    throw new Error('invalid_gtp_letter');
  }

  let col = normalized.charCodeAt(0) - 'a'.charCodeAt(0);
  if (col >= 8) {
    col -= 1;
  }

  return col;
}

/** Frontend/API rows are zero-indexed from the top; GTP rows count from the bottom. */
export function rowToGtpNumber(row: number, boardSize: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= boardSize) {
    throw new Error('invalid_row');
  }

  return boardSize - row;
}

export function gtpNumberToRow(rowNumber: number, boardSize: number): number {
  if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > boardSize) {
    throw new Error('invalid_gtp_row');
  }

  return boardSize - rowNumber;
}

export function gridToGtpVertex(position: GridPosition, boardSize: number): string {
  return `${colToGtpLetter(position.x)}${rowToGtpNumber(position.y, boardSize)}`;
}

export function gtpVertexToGrid(vertex: string, boardSize: number): GridPosition | 'pass' {
  const trimmed = vertex.trim();
  if (trimmed.toLowerCase() === 'pass') {
    return 'pass';
  }

  const match = /^([A-Za-z])(\d+)$/.exec(trimmed);
  if (!match) {
    throw new Error('invalid_gtp_vertex');
  }

  const x = gtpLetterToCol(match[1]);
  const y = gtpNumberToRow(Number(match[2]), boardSize);

  if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) {
    throw new Error('vertex_out_of_bounds');
  }

  return { x, y };
}

export function colorToGtpToken(color: 'black' | 'white'): 'B' | 'W' {
  return color === 'black' ? 'B' : 'W';
}
