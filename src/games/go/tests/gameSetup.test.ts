import { describe, expect, it } from 'vitest';
import {
  createGameFromSetup,
  createInitialState,
  dispatch,
} from '../engine/gameState';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import { isValidKomi, parseKomiInput, createAiSetup, createLocalSetup } from '../utils/gameSetup';

describe('createGameFromSetup', () => {
  it('creates a 9x9 board', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    expect(state.board.size).toBe(9);
    expect(state.board.intersections).toHaveLength(9);
  });

  it('creates a 13x13 board', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 13, komi: 6.5, firstPlayer: 'black' }));
    expect(state.board.size).toBe(13);
    expect(state.board.intersections).toHaveLength(13);
  });

  it('creates a 19x19 board', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 19, komi: 6.5, firstPlayer: 'black' }));
    expect(state.board.size).toBe(19);
    expect(state.board.intersections).toHaveLength(19);
  });

  it('stores custom komi correctly', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 7.5, firstPlayer: 'black' }));
    expect(state.config.komi).toBe(7.5);
  });

  it('starts with Black by default', () => {
    const state = createInitialState();
    expect(state.currentPlayer).toBe('black');
    expect(state.config.mode).toBe('local');
    if (state.config.mode === 'local') {
      expect(state.config.firstPlayer).toBe('black');
    }
  });

  it('allows White to be configured as the first player', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'white' }));
    expect(state.currentPlayer).toBe('white');
    if (state.config.mode === 'local') {
      expect(state.config.firstPlayer).toBe('white');
    }
  });

  it('creates AI games with human color', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white', size: 9 }));
    expect(state.config.mode).toBe('ai');
    expect(state.currentPlayer).toBe('black');
  });

  it('resets history, captures, passes, dead stones, and result on a fresh game', () => {
    let state = createGameFromSetup(DEFAULT_NEW_GAME_SETUP);
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const fresh = createGameFromSetup(createLocalSetup({ size: 13, komi: 5.5, firstPlayer: 'white' }));

    expect(fresh.history).toEqual([]);
    expect(fresh.captures).toEqual({ black: 0, white: 0 });
    expect(fresh.consecutivePasses).toBe(0);
    expect(fresh.deadStones).toEqual([]);
    expect(fresh.result).toBeNull();
    expect(fresh.phase).toBe('playing');
    expect(fresh.board.size).toBe(13);
    expect(fresh.config.komi).toBe(5.5);
    expect(fresh.currentPlayer).toBe('white');
  });

  it('creates a fresh state after a finished game via createGameFromSetup', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;
    const confirmed = dispatch(state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    state = confirmed.state;
    expect(state.phase).toBe('ended');

    const next = createGameFromSetup(
      createLocalSetup({
        size: state.config.size,
        komi: state.config.komi,
        firstPlayer: 'black',
      }),
    );

    expect(next.phase).toBe('playing');
    expect(next.result).toBeNull();
    expect(next.history).toEqual([]);
    expect(next.deadStones).toEqual([]);
  });
});

describe('komi validation', () => {
  it('accepts common decimal komi values', () => {
    expect(parseKomiInput('6.5')).toBe(6.5);
    expect(parseKomiInput('0')).toBe(0);
    expect(parseKomiInput('5.5')).toBe(5.5);
    expect(parseKomiInput('7.5')).toBe(7.5);
    expect(isValidKomi(parseKomiInput('6.5'))).toBe(true);
  });

  it('rejects invalid komi input', () => {
    expect(parseKomiInput('abc')).toBeNull();
    expect(parseKomiInput('')).toBeNull();
    expect(parseKomiInput('-1')).toBeNull();
    expect(isValidKomi(parseKomiInput('not-a-number'))).toBe(false);
  });
});
