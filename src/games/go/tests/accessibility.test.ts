import { describe, expect, it } from 'vitest';
import { moveRovingFocus, defaultGridFocus } from '../../../accessibility/rovingGrid';
import {
  buildGameAnnouncement,
  formatGameResultAnnouncement,
  formatHistoryEntryAnnouncement,
} from '../accessibility/formatGameAnnouncement';
import { createGameFromSetup } from '../engine/gameState';
import { dispatch } from '../engine/gameState';
import { createAiSetup } from '../utils/gameSetup';

describe('roving grid navigation', () => {
  it('starts focus at the last move when available', () => {
    expect(defaultGridFocus(19, { row: 3, col: 4 })).toEqual({ row: 3, col: 4 });
  });

  it('moves focus with arrow keys within bounds', () => {
    expect(moveRovingFocus({ row: 1, col: 1 }, 'ArrowRight', { rows: 9, cols: 9 })).toEqual({
      row: 1,
      col: 2,
    });
    expect(moveRovingFocus({ row: 0, col: 0 }, 'ArrowUp', { rows: 9, cols: 9 })).toEqual({
      row: 0,
      col: 0,
    });
    expect(moveRovingFocus({ row: 8, col: 8 }, 'ArrowDown', { rows: 9, cols: 9 })).toEqual({
      row: 8,
      col: 8,
    });
  });

  it('jumps rows with page keys', () => {
    expect(moveRovingFocus({ row: 10, col: 2 }, 'PageUp', { rows: 19, cols: 19 })).toEqual({
      row: 5,
      col: 2,
    });
  });
});

describe('game announcements', () => {
  it('describes a played move with coordinates', () => {
    const state = createGameFromSetup(createAiSetup());
    const played = dispatch(state, { type: 'play', position: { row: 3, col: 3 } });
    expect(played.ok).toBe(true);
    if (!played.ok) {
      return;
    }

    const entry = played.state.history.at(-1)!;
    expect(formatHistoryEntryAnnouncement(entry, 9, played.state.config)).toContain('played at');
  });

  it('announces scoring phase transitions', () => {
    const state = createGameFromSetup(createAiSetup());
    const firstPass = dispatch(state, { type: 'pass' });
    expect(firstPass.ok).toBe(true);
    if (!firstPass.ok) {
      return;
    }

    const secondPass = dispatch(firstPass.state, { type: 'pass' });
    expect(secondPass.ok).toBe(true);
    if (!secondPass.ok) {
      return;
    }

    const announcement = buildGameAnnouncement({
      previous: firstPass.state,
      current: secondPass.state,
      aiStatus: 'idle',
      previousAiStatus: 'idle',
      error: null,
      previousError: null,
    });

    expect(announcement?.message).toContain('Mark dead stones');
  });

  it('formats game results for screen readers', () => {
    expect(
      formatGameResultAnnouncement({
        winner: 'black',
        blackScore: 12.5,
        whiteScore: 8.5,
        reason: 'score',
      }),
    ).toContain('Black wins');
  });
});
