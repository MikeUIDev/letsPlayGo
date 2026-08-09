import { describe, expect, it, beforeEach } from 'vitest';
import {
  createGameFromSetup,
  createInitialState,
  dispatch,
} from '../engine/gameState';
import { calculateScoreBreakdown } from '../engine/scoring';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import {
  createAiSetup,
  createLocalSetup,
  getDefaultKomi,
  isKomiCustomizedForBoardSize,
  isValidKomi,
  parseKomiInput,
  resolveKomiForBoardSizeChange,
} from '../utils/gameSetup';
import { loadSavedGame, saveGameToStorage, setStorageAdapter, type StorageAdapter } from '../persistence/saveGame';

function createMemoryStorage(): StorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

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

describe('getDefaultKomi', () => {
  it('returns 6.5 for 9x9', () => {
    expect(getDefaultKomi(9)).toBe(6.5);
  });

  it('returns 6.5 for 13x13', () => {
    expect(getDefaultKomi(13)).toBe(6.5);
  });

  it('returns 7.5 for 19x19', () => {
    expect(getDefaultKomi(19)).toBe(7.5);
  });
});

describe('komi board-size behavior', () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorage());
  });

  it('updates default komi when switching 9x9 to 19x19', () => {
    expect(resolveKomiForBoardSizeChange(6.5, 19, false)).toBe(7.5);
  });

  it('updates default komi when switching 19x19 to 9x9', () => {
    expect(resolveKomiForBoardSizeChange(7.5, 9, false)).toBe(6.5);
  });

  it('preserves custom komi when board size changes', () => {
    expect(resolveKomiForBoardSizeChange(5.5, 19, true)).toBe(5.5);
    expect(resolveKomiForBoardSizeChange(5.5, 9, true)).toBe(5.5);
  });

  it('detects customized komi from previous game settings', () => {
    expect(isKomiCustomizedForBoardSize(5.5, 9)).toBe(true);
    expect(isKomiCustomizedForBoardSize(6.5, 9)).toBe(false);
    expect(isKomiCustomizedForBoardSize(7.5, 19)).toBe(false);
    expect(isKomiCustomizedForBoardSize(6.5, 19)).toBe(true);
  });

  it('uses board-size default when resetting customized komi conceptually', () => {
    expect(getDefaultKomi(19)).toBe(7.5);
    expect(isKomiCustomizedForBoardSize(getDefaultKomi(19), 19)).toBe(false);
  });

  it('creates local setup with size-appropriate default komi', () => {
    expect(createLocalSetup({ size: 19 }).komi).toBe(7.5);
    expect(createLocalSetup({ size: 13 }).komi).toBe(6.5);
    expect(createLocalSetup({ size: 9 }).komi).toBe(6.5);
  });

  it('passes selected komi into new GameState', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 19, komi: 7.5, firstPlayer: 'black' }));
    expect(state.config.komi).toBe(7.5);
    expect(state.board.size).toBe(19);
  });

  it('preserves custom komi in saved game persistence', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 5.5, firstPlayer: 'black' }));
    saveGameToStorage(state);
    const restored = loadSavedGame();
    expect(restored?.config.komi).toBe(5.5);
  });

  it('uses configured komi in scoring', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 8.5, firstPlayer: 'black' }));
    const breakdown = calculateScoreBreakdown(state.board, state.config.komi);
    expect(breakdown.komi).toBe(8.5);
    expect(breakdown.whiteTotal).toBe(breakdown.whiteStones + breakdown.whiteTerritory + 8.5);
  });
});
