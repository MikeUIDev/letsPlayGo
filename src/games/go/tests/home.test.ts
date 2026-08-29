import { describe, expect, it } from 'vitest';
import { createGameFromSetup } from '../engine/gameState';
import { buildSavedGameSummary } from '../home/savedGameSummary';
import { createAiSetup } from '../utils/gameSetup';

describe('savedGameSummary', () => {
  it('formats AI game info with board size and difficulty', () => {
    const state = createGameFromSetup(createAiSetup({ size: 13, difficulty: 'strong' }));
    const summary = buildSavedGameSummary(state);

    expect(summary.boardSizeLabel).toBe('13 × 13');
    expect(summary.modeLabel).toBe('vs AI · Strong');
    expect(summary.statusLabel).toBe('Black to play');
    expect(summary.moveNumber).toBe(0);
    expect(summary.capturesLabel).toBe('Captures 0B / 0W');
  });
});
