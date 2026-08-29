import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import { undoForGameMode } from '../ai/undoAi';
import {
  canResumeGame,
  clearSavedGame,
  deserializeSavedGame,
  loadSavedGame,
  persistActiveGame,
  saveGameToStorage,
  serializeGameState,
  setStorageAdapter,
  type StorageAdapter,
} from '../persistence/saveGame';
import { registerBackgroundPersistenceFlush } from '../persistence/backgroundFlush';
import { validatePersistedState } from '../persistence/validatePersistedState';
import { LEGACY_SAVED_GAME_VERSION, SAVED_GAME_VERSION } from '../persistence/types';
import { createLocalSetup } from '../utils/gameSetup';

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

describe('game persistence', () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorage());
  });

  it('serializes a playing game', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');

    const serialized = serializeGameState(played.state);
    expect(serialized.ok).toBe(true);
    if (serialized.ok) {
      expect(serialized.saved.version).toBe(SAVED_GAME_VERSION);
      expect(serialized.saved.state.history).toHaveLength(1);
    }
  });

  it('deserializes a saved game', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 13, komi: 7.5, firstPlayer: 'white' }));
    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');

    const restored = deserializeSavedGame(serialized.saved);
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.state.board.size).toBe(13);
      expect(restored.state.config.komi).toBe(7.5);
      expect(restored.state.currentPlayer).toBe('white');
    }
  });

  it('preserves board, history, captures, komi, and phase', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 9, komi: 5.5, firstPlayer: 'black' }));
    const played = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;

    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');
    const restored = deserializeSavedGame(serialized.saved);
    if (!restored.ok) throw new Error('deserialize failed');

    expect(restored.state.history).toHaveLength(3);
    expect(restored.state.captures).toEqual(state.captures);
    expect(restored.state.config.komi).toBe(5.5);
    expect(restored.state.phase).toBe('scoring');
    expect(restored.state.board.intersections[1][1]).toBe('black');
  });

  it('rejects malformed save data', () => {
    expect(deserializeSavedGame(null).ok).toBe(false);
    expect(deserializeSavedGame('{bad json').ok).toBe(false);
    expect(deserializeSavedGame({ version: 1 }).ok).toBe(false);
  });

  it('rejects unsupported save versions', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');

    const restored = deserializeSavedGame({ ...serialized.saved, version: 99 });
    expect(restored.ok).toBe(false);
  });

  it('loads and clears saved games from storage', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    const state = createGameFromSetup(createLocalSetup({ size: 19, komi: 6.5, firstPlayer: 'black' }));
    saveGameToStorage(state);
    expect(loadSavedGame()?.board.size).toBe(19);

    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });

  it('removes invalid storage payloads', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);
    memory.setItem('letsplaygo.savedGame', '{not-json');

    expect(loadSavedGame()).toBeNull();
    expect(memory.getItem('letsplaygo.savedGame')).toBeNull();
  });

  it('clears ended games instead of offering resume', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    let state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;

    const confirmed = dispatch(state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    state = confirmed.state;
    expect(state.phase).toBe('ended');

    saveGameToStorage(state);
    expect(loadSavedGame()).toBeNull();
    expect(memory.getItem('letsplaygo.savedGame')).toBeNull();
  });

  it('persists undo and pass history accurately', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 13, komi: 7.5, firstPlayer: 'black' }));
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const passed = dispatch(state, { type: 'pass' });
    if (!passed.ok) throw new Error('pass failed');
    state = passed.state;

    saveGameToStorage(state);
    const restored = loadSavedGame();
    expect(restored?.history).toHaveLength(2);
    expect(restored?.history[1]?.move.type).toBe('pass');
    expect(restored?.config.size).toBe(13);

    const undone = undoForGameMode(restored!);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      persistActiveGame(undone.state);
      const afterUndo = loadSavedGame();
      expect(afterUndo?.history).toHaveLength(1);
      expect(afterUndo?.history[0]?.move.type).toBe('play');
    }
  });

  it('rewrites legacy v1 saves to v2 on load', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');

    memory.setItem(
      'letsplaygo.savedGame',
      JSON.stringify({
        version: LEGACY_SAVED_GAME_VERSION,
        savedAt: serialized.saved.savedAt,
        state: {
          ...serialized.saved.state,
          config: {
            size: 9,
            komi: 6.5,
            firstPlayer: 'black',
          },
        },
      }),
    );

    const restored = loadSavedGame();
    expect(restored?.config.mode).toBe('local');

    const stored = JSON.parse(memory.getItem('letsplaygo.savedGame') ?? '{}') as { version?: number };
    expect(stored.version).toBe(SAVED_GAME_VERSION);
  });

  it('rejects inconsistent persisted state', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    expect(validatePersistedState(state)).toBe(true);

    const bad = {
      ...state,
      captures: { black: -1, white: 0 },
    };
    expect(validatePersistedState(bad)).toBe(false);
  });

  it('uses persistActiveGame to save playing games and clear finished ones', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    const playing = createGameFromSetup(createLocalSetup({ size: 19, komi: 6.5, firstPlayer: 'black' }));
    expect(persistActiveGame(playing)).toBe('saved');
    expect(loadSavedGame()?.board.size).toBe(19);

    const pass1 = dispatch(playing, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : playing, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    const scoring = pass2.state;
    expect(persistActiveGame(scoring)).toBe('saved');

    const confirmed = dispatch(scoring, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    expect(persistActiveGame(confirmed.state)).toBe('cleared');
    expect(loadSavedGame()).toBeNull();
  });

  it('flushes active games on background hide events', () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    const playing = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const getState = vi.fn(() => playing);
    const shouldPersist = vi.fn(() => true);

    const unregister = registerBackgroundPersistenceFlush({ getState, shouldPersist });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(getState).toHaveBeenCalled();
    expect(loadSavedGame()?.board.size).toBe(9);

    unregister();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('persists scoring-phase games for resume after background', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;

    expect(state.phase).toBe('scoring');
    persistActiveGame(state);
    const restored = loadSavedGame();
    expect(restored?.phase).toBe('scoring');
  });

  it('only treats playing and scoring games as resumable', () => {
    const playing = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    expect(canResumeGame(playing)).toBe(true);

    const pass1 = dispatch(playing, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : playing, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');

    expect(canResumeGame(pass2.state)).toBe(true);

    const confirmed = dispatch(pass2.state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    expect(canResumeGame(confirmed.state)).toBe(false);
  });
});
