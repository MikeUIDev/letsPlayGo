import { describe, expect, it, beforeEach } from 'vitest';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import {
  clearSavedGame,
  deserializeSavedGame,
  loadSavedGame,
  saveGameToStorage,
  serializeGameState,
  setStorageAdapter,
  type StorageAdapter,
} from '../persistence/saveGame';
import { SAVED_GAME_VERSION } from '../persistence/types';

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
    const state = createGameFromSetup({ size: 9, komi: 6.5, firstPlayer: 'black' });
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
    const state = createGameFromSetup({ size: 13, komi: 7.5, firstPlayer: 'white' });
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
    let state = createGameFromSetup({ size: 9, komi: 5.5, firstPlayer: 'black' });
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
    const state = createGameFromSetup({ size: 9, komi: 6.5, firstPlayer: 'black' });
    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');

    const restored = deserializeSavedGame({ ...serialized.saved, version: 99 });
    expect(restored.ok).toBe(false);
  });

  it('loads and clears saved games from storage', () => {
    const memory = createMemoryStorage();
    setStorageAdapter(memory);

    const state = createGameFromSetup({ size: 19, komi: 6.5, firstPlayer: 'black' });
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
});
