import { describe, expect, it } from 'vitest';
import {
  AI_SUPPORTED_BOARD_SIZES,
  BOARD_SIZES,
  DEFAULT_KOMI_BY_SIZE,
  getDefaultKomiForSize,
  isAiSupportedBoardSize,
  isBoardSize,
} from '../engine/boardConfig';

describe('boardConfig', () => {
  it('defines all playable sizes', () => {
    expect(BOARD_SIZES).toEqual([9, 13, 19]);
  });

  it('sets default komi by size', () => {
    expect(getDefaultKomiForSize(9)).toBe(6.5);
    expect(getDefaultKomiForSize(13)).toBe(6.5);
    expect(getDefaultKomiForSize(19)).toBe(7.5);
    expect(DEFAULT_KOMI_BY_SIZE[19]).toBe(7.5);
  });

  it('supports AI on all board sizes', () => {
    expect(AI_SUPPORTED_BOARD_SIZES).toEqual([9, 13, 19]);
    expect(isAiSupportedBoardSize(13)).toBe(true);
    expect(isAiSupportedBoardSize(19)).toBe(true);
    expect(isAiSupportedBoardSize(11)).toBe(false);
  });

  it('validates board size literals', () => {
    expect(isBoardSize(9)).toBe(true);
    expect(isBoardSize(10)).toBe(false);
  });
});
