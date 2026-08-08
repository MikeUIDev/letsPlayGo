import { describe, expect, it } from 'vitest';
import {
  colToGtpLetter,
  gridToGtpVertex,
  gtpLetterToCol,
  gtpNumberToRow,
  gtpVertexToGrid,
  rowToGtpNumber,
} from '../src/katago/coordinates.js';

describe('coordinate conversion', () => {
  it('converts grid positions to GTP vertices on 9x9', () => {
    expect(gridToGtpVertex({ x: 0, y: 0 }, 9)).toBe('a9');
    expect(gridToGtpVertex({ x: 8, y: 8 }, 9)).toBe('j1');
    expect(gridToGtpVertex({ x: 4, y: 4 }, 9)).toBe('e5');
  });

  it('converts GTP vertices back to grid positions', () => {
    expect(gtpVertexToGrid('a9', 9)).toEqual({ x: 0, y: 0 });
    expect(gtpVertexToGrid('j1', 9)).toEqual({ x: 8, y: 8 });
    expect(gtpVertexToGrid('pass', 9)).toBe('pass');
  });

  it('handles skipped I column on larger boards', () => {
    expect(colToGtpLetter(8)).toBe('j');
    expect(gtpLetterToCol('j')).toBe(8);
    expect(rowToGtpNumber(0, 19)).toBe(19);
    expect(gtpNumberToRow(1, 19)).toBe(18);
  });
});
