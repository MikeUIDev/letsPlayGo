import { describe, expect, it } from 'vitest';
import { createGameFromSetup } from '../engine/gameState';
import { passNeedsConfirmation } from '../hooks/useGameConfirmations';
import { createLocalSetup } from '../utils/gameSetup';

describe('pass confirmation', () => {
  it('requires confirmation when opponent already passed', () => {
    const state = createGameFromSetup(createLocalSetup());
    const withOnePass = { ...state, consecutivePasses: 1 };
    expect(passNeedsConfirmation(withOnePass)).toBe(true);
  });

  it('allows immediate pass on the first pass of the sequence', () => {
    const state = createGameFromSetup(createLocalSetup());
    expect(passNeedsConfirmation(state)).toBe(false);
  });
});
