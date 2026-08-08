import { describe, expect, it } from 'vitest';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import { positionToSgf, sgfToPosition } from '../sgf/coordinates';
import { exportSgf } from '../sgf/exportSgf';
import { importSgf } from '../sgf/importSgf';
import { parseSgfGame } from '../sgf/parseSgf';

describe('SGF coordinates', () => {
  it('converts board positions to and from SGF coordinates', () => {
    expect(positionToSgf({ row: 0, col: 0 })).toBe('aa');
    expect(positionToSgf({ row: 0, col: 1 })).toBe('ba');
    expect(positionToSgf({ row: 1, col: 0 })).toBe('ab');
    expect(sgfToPosition('dd', 9)).toEqual({ row: 3, col: 3 });
  });

  it('rejects invalid coordinates', () => {
    expect(sgfToPosition('zz', 9)).toBeNull();
    expect(sgfToPosition('a', 9)).toBeNull();
  });
});

describe('SGF export', () => {
  it('exports 9x9, 13x13, and 19x19 games', () => {
    for (const size of [9, 13, 19] as const) {
      const state = createGameFromSetup({ size, komi: 6.5, firstPlayer: 'black' });
      const exported = exportSgf(state);
      expect(exported.content).toContain(`SZ[${size}]`);
      expect(exported.content).toContain('FF[4]');
      expect(exported.filename.endsWith('.sgf')).toBe(true);
    }
  });

  it('exports komi, passes, and finished results', () => {
    let state = createGameFromSetup({ size: 9, komi: 6.5, firstPlayer: 'black' });
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;

    const confirmed = dispatch(state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    state = confirmed.state;

    const exported = exportSgf(state);
    expect(exported.content).toContain('KM[6.5]');
    expect(exported.content).toContain('B[cc]');
    expect(exported.content).toContain('B[]');
    expect(exported.content).toContain('W[]');
    expect(exported.content).toMatch(/RE\[/);
  });

  it('exports resignation results', () => {
    const state = createGameFromSetup({ size: 9, komi: 6.5, firstPlayer: 'black' });
    const resigned = dispatch(state, { type: 'resign' });
    if (!resigned.ok) throw new Error('resign failed');

    const exported = exportSgf(resigned.state);
    expect(exported.content).toContain('RE[W+R]');
  });
});

describe('SGF import', () => {
  it('parses and replays a simple SGF', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]KM[6.5]
;B[cc]
;W[dd]
;B[])`;

    const imported = importSgf(sgf);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.history).toHaveLength(3);
      expect(imported.state.board.intersections[2][2]).toBe('black');
      expect(imported.state.board.intersections[3][3]).toBe('white');
    }
  });

  it('round-trips an exported game', () => {
    let state = createGameFromSetup({ size: 9, komi: 6.5, firstPlayer: 'black' });
    const played = dispatch(state, { type: 'play', position: { row: 4, col: 4 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;
    const passed = dispatch(state, { type: 'pass' });
    if (!passed.ok) throw new Error('pass failed');
    state = passed.state;

    const exported = exportSgf(state);
    const imported = importSgf(exported.content);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.history).toHaveLength(2);
      expect(imported.state.board.intersections[4][4]).toBe('black');
    }
  });

  it('rejects unsupported variations', () => {
    const sgf = `(;GM[1]FF[4]SZ[9](;B[aa])(;B[bb]))`;
    const parsed = parseSgfGame(sgf);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe('unsupported_variations');
    }
  });

  it('rejects invalid coordinates and illegal moves', () => {
    expect(parseSgfGame('(;GM[1]FF[4]SZ[9];B[zz])').ok).toBe(false);
    expect(importSgf('(;GM[1]FF[4]SZ[9];B[aa];B[bb])').ok).toBe(false);
  });

  it('imports finished score results', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]KM[6.5];B[cc];W[dd]RE[B+4.5])`;
    const imported = importSgf(sgf);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.phase).toBe('ended');
      expect(imported.state.result?.winner).toBe('black');
    }
  });

  it('imports SGF with harmless player and event metadata', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]KM[6.5]PB[Alice]PW[Bob]BR[1d]WR[2k];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with date metadata', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]DT[2026-08-07];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with rules metadata', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]RU[Chinese];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with game and place metadata', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]GN[Club Game]PC[San Francisco];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with comments', () => {
    const sgf = `(;GM[1]FF[4]SZ[9];B[cc]{good shape};W[dd]{answer})`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with harmless board markup', () => {
    const sgf = `(;GM[1]FF[4]SZ[9];LB[cc:A];CR[dd];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('imports SGF with time and overtime metadata', () => {
    const sgf = `(;GM[1]FF[4]SZ[9]TM[600]OT[5x30];B[cc];W[dd])`;
    expect(importSgf(sgf).ok).toBe(true);
  });

  it('rejects setup stones and handicap properties', () => {
    expect(importSgf('(;GM[1]FF[4]SZ[9]AB[aa][bb];B[cc])').ok).toBe(false);
    expect(importSgf('(;GM[1]FF[4]SZ[9]AW[aa];B[cc])').ok).toBe(false);
    expect(importSgf('(;GM[1]FF[4]SZ[9]HA[4];B[cc])').ok).toBe(false);
    expect(importSgf('(;GM[1]FF[4]SZ[9]PL[W];B[cc])').ok).toBe(false);
  });

  it('rejects unsupported board sizes', () => {
    expect(parseSgfGame('(;GM[1]FF[4]SZ[7];B[cc])').ok).toBe(false);
  });
});
