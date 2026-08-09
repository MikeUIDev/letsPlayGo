import { describe, expect, it } from 'vitest';
import {
  AI_DIFFICULTY_OPTIONS,
  DEFAULT_AI_DIFFICULTY,
  formatAiDifficultyLabel,
  formatAiPlayerSubtitle,
  normalizeAiDifficulty,
  shouldShowAiDifficultySelector,
} from '../engine/aiDifficulty';
import { configToSetup, setupToConfig } from '../engine/gameConfig';
import { createGameFromSetup } from '../engine/gameState';
import { deserializeSavedGame, serializeGameState } from '../persistence/saveGame';
import { createAiSetup, createLocalSetup } from '../utils/gameSetup';

describe('AI difficulty', () => {
  it('uses Casual as the default difficulty', () => {
    expect(DEFAULT_AI_DIFFICULTY).toBe('casual');
    expect(createAiSetup().difficulty).toBe('casual');
  });

  it('shows the difficulty selector only in AI mode', () => {
    expect(shouldShowAiDifficultySelector('ai')).toBe(true);
    expect(shouldShowAiDifficultySelector('local')).toBe(false);
  });

  it.each(['beginner', 'casual', 'strong', 'expert'] as const)(
    'allows selecting %s difficulty',
    (difficulty) => {
      const setup = createAiSetup({ difficulty });
      expect(setup.difficulty).toBe(difficulty);
      expect(setupToConfig(setup)).toMatchObject({ mode: 'ai', difficulty });
    },
  );

  it('does not require difficulty on local configuration', () => {
    const setup = createLocalSetup();
    expect(setup).not.toHaveProperty('difficulty');
    expect(createGameFromSetup(setup).config).toEqual({
      mode: 'local',
      size: 9,
      komi: 6.5,
      firstPlayer: 'black',
    });
  });

  it('stores selected difficulty on AI GameConfig', () => {
    const state = createGameFromSetup(createAiSetup({ difficulty: 'strong' }));
    if (state.config.mode !== 'ai') throw new Error('expected ai config');
    expect(state.config.difficulty).toBe('strong');
  });

  it('restores selected difficulty from saved AI games', () => {
    const state = createGameFromSetup(createAiSetup({ difficulty: 'expert' }));
    const saved = serializeGameState(state);
    if (!saved.ok) throw new Error(saved.error);

    const restored = deserializeSavedGame(saved.saved);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    expect(restored.state.config.mode).toBe('ai');
    if (restored.state.config.mode === 'ai') {
      expect(restored.state.config.difficulty).toBe('expert');
    }
  });

  it('defaults old AI saves without difficulty to Casual', () => {
    const state = createGameFromSetup(createAiSetup({ difficulty: 'strong' }));
    const saved = serializeGameState(state);
    if (!saved.ok) throw new Error(saved.error);

    const legacyConfig = { ...saved.saved.state.config } as Record<string, unknown>;
    delete legacyConfig.difficulty;

    const restored = deserializeSavedGame({
      ...saved.saved,
      state: {
        ...saved.saved.state,
        config: legacyConfig,
      },
    });

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    if (restored.state.config.mode === 'ai') {
      expect(restored.state.config.difficulty).toBe('casual');
    }
  });

  it('retains previous difficulty when reopening New Game setup from an AI game', () => {
    const config = setupToConfig(createAiSetup({ difficulty: 'strong', humanColor: 'white', size: 9 }));
    const setup = configToSetup(config);
    expect(setup.mode).toBe('ai');
    if (setup.mode === 'ai') {
      expect(setup.difficulty).toBe('strong');
      expect(setup.humanColor).toBe('white');
      expect(setup.size).toBe(9);
    }
  });

  it('formats player-facing difficulty labels', () => {
    expect(formatAiDifficultyLabel('beginner')).toBe('Beginner');
    expect(formatAiPlayerSubtitle('casual')).toBe('AI · Casual');
    expect(normalizeAiDifficulty('invalid')).toBe('casual');
    expect(AI_DIFFICULTY_OPTIONS).toHaveLength(4);
  });
});
