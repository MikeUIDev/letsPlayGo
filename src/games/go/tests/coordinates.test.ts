import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getColumnLabels,
  getDefaultShowCoordinates,
  getRowLabels,
  goCoordinateToPosition,
  GO_COLUMNS,
  positionToGoCoordinate,
  resolveShowCoordinates,
} from '../coordinates';
import { loadCoordinatesPreference, saveCoordinatesPreference } from '../coordinates/preferences';

describe('positionToGoCoordinate', () => {
  it('maps 9x9 corners correctly', () => {
    expect(positionToGoCoordinate({ row: 0, col: 0 }, 9)).toBe('A9');
    expect(positionToGoCoordinate({ row: 0, col: 8 }, 9)).toBe('J9');
    expect(positionToGoCoordinate({ row: 8, col: 0 }, 9)).toBe('A1');
    expect(positionToGoCoordinate({ row: 8, col: 8 }, 9)).toBe('J1');
  });

  it('maps interior points correctly on 9x9', () => {
    expect(positionToGoCoordinate({ row: 5, col: 3 }, 9)).toBe('D4');
    expect(positionToGoCoordinate({ row: 4, col: 4 }, 9)).toBe('E5');
  });

  it('maps 13x13 corners correctly', () => {
    expect(positionToGoCoordinate({ row: 0, col: 12 }, 13)).toBe('N13');
    expect(positionToGoCoordinate({ row: 12, col: 12 }, 13)).toBe('N1');
  });

  it('maps 19x19 corners correctly', () => {
    expect(positionToGoCoordinate({ row: 0, col: 18 }, 19)).toBe('T19');
    expect(positionToGoCoordinate({ row: 18, col: 18 }, 19)).toBe('T1');
    expect(positionToGoCoordinate({ row: 9, col: 9 }, 19)).toBe('K10');
  });

  it('never uses the letter I', () => {
    expect(GO_COLUMNS.includes('I' as never)).toBe(false);
    expect(getColumnLabels(9)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J']);
    expect(getColumnLabels(9).includes('I')).toBe(false);
  });
});

describe('goCoordinateToPosition', () => {
  it('parses valid coordinates case-insensitively', () => {
    expect(goCoordinateToPosition('A1', 9)).toEqual({ row: 8, col: 0 });
    expect(goCoordinateToPosition('d4', 9)).toEqual({ row: 5, col: 3 });
    expect(goCoordinateToPosition('J9', 9)).toEqual({ row: 0, col: 8 });
    expect(goCoordinateToPosition('N13', 13)).toEqual({ row: 0, col: 12 });
    expect(goCoordinateToPosition('T19', 19)).toEqual({ row: 0, col: 18 });
  });

  it('rejects invalid coordinates', () => {
    expect(goCoordinateToPosition('I5', 9)).toBeNull();
    expect(goCoordinateToPosition('A0', 9)).toBeNull();
    expect(goCoordinateToPosition('A10', 9)).toBeNull();
    expect(goCoordinateToPosition('T20', 19)).toBeNull();
    expect(goCoordinateToPosition('Z5', 9)).toBeNull();
    expect(goCoordinateToPosition('', 9)).toBeNull();
    expect(goCoordinateToPosition('bad', 9)).toBeNull();
  });

  it('round-trips positions through notation', () => {
    const samples = [
      { row: 0, col: 0 },
      { row: 0, col: 8 },
      { row: 8, col: 8 },
      { row: 4, col: 4 },
      { row: 0, col: 18 },
      { row: 18, col: 18 },
    ];

    for (const position of samples) {
      const size = position.row === 18 || position.col === 18 ? 19 : 9;
      const notation = positionToGoCoordinate(position, size);
      expect(goCoordinateToPosition(notation, size)).toEqual(position);
    }
  });
});

describe('board coordinate labels', () => {
  it('provides the correct number of labels per board size', () => {
    expect(getColumnLabels(9)).toHaveLength(9);
    expect(getColumnLabels(13)).toHaveLength(13);
    expect(getColumnLabels(19)).toHaveLength(19);
    expect(getRowLabels(9)).toEqual(['9', '8', '7', '6', '5', '4', '3', '2', '1']);
    expect(getRowLabels(19)[0]).toBe('19');
    expect(getRowLabels(19)[18]).toBe('1');
  });
});

describe('coordinate display defaults', () => {
  it('defaults beginner AI and review/coach contexts to ON', () => {
    expect(
      getDefaultShowCoordinates({ mode: 'ai', aiDifficulty: 'beginner', isReviewing: false }),
    ).toBe(true);
    expect(getDefaultShowCoordinates({ mode: 'local', isReviewing: true })).toBe(true);
  });

  it('defaults other AI difficulties and local play to OFF', () => {
    expect(
      getDefaultShowCoordinates({ mode: 'ai', aiDifficulty: 'casual', isReviewing: false }),
    ).toBe(false);
    expect(
      getDefaultShowCoordinates({ mode: 'ai', aiDifficulty: 'strong', isReviewing: false }),
    ).toBe(false);
    expect(
      getDefaultShowCoordinates({ mode: 'ai', aiDifficulty: 'expert', isReviewing: false }),
    ).toBe(false);
    expect(getDefaultShowCoordinates({ mode: 'local', isReviewing: false })).toBe(false);
  });

  it('respects explicit user overrides over defaults', () => {
    const reviewContext = { mode: 'local' as const, isReviewing: true };
    expect(resolveShowCoordinates('off', reviewContext)).toBe(false);
    expect(resolveShowCoordinates('on', { mode: 'ai', aiDifficulty: 'expert', isReviewing: false })).toBe(
      true,
    );
  });
});

describe('coordinate preference persistence', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it('loads and saves show coordinate preference', () => {
    saveCoordinatesPreference('on');
    expect(loadCoordinatesPreference()).toBe('on');
    saveCoordinatesPreference('off');
    expect(loadCoordinatesPreference()).toBe('off');
    saveCoordinatesPreference('default');
    expect(loadCoordinatesPreference()).toBe('default');
  });
});

describe('formatCoordinate compatibility', () => {
  it('keeps the legacy formatter alias aligned with positionToGoCoordinate', async () => {
    const { formatCoordinate } = await import('../utils/coordinates');
    expect(formatCoordinate({ row: 0, col: 3 }, 9)).toBe('D9');
    expect(formatCoordinate({ row: 8, col: 3 }, 9)).toBe('D1');
  });
});
