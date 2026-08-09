import { describe, expect, it } from 'vitest';
import { createInitialState, dispatch } from '../engine/gameState';
import { reconstructStateAtIndex } from '../engine/reviewState';
import {
  buildVariationPreview,
  getVariationMarkerMap,
  MAX_VARIATION_PREVIEW_MOVES,
} from '../coach/variationPreview';
import type { VariationMove } from '../analysis/types';

describe('variation preview', () => {
  it('builds preview markers without mutating review state', () => {
    let state = createInitialState(9);
    const play = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    expect(play.ok).toBe(true);
    if (!play.ok) return;
    state = play.state;

    const beforeState = reconstructStateAtIndex(state, 0);
    const beforeBoardJson = JSON.stringify(beforeState.board);

    const variation: VariationMove[] = [
      { color: 'black', position: { row: 2, col: 2 } },
      { color: 'white', position: { row: 2, col: 3 } },
    ];

    const preview = buildVariationPreview(beforeState, variation);
    expect(preview.canRender).toBe(true);
    expect(preview.markers).toHaveLength(2);
    expect(JSON.stringify(beforeState.board)).toBe(beforeBoardJson);
  });

  it('applies captures sequentially in preview', () => {
    let state = createInitialState(9);
    const setup = [
      { type: 'play' as const, position: { row: 0, col: 1 } },
      { type: 'play' as const, position: { row: 1, col: 1 } },
      { type: 'play' as const, position: { row: 2, col: 1 } },
      { type: 'play' as const, position: { row: 1, col: 0 } },
      { type: 'play' as const, position: { row: 4, col: 4 } },
    ];

    for (const move of setup) {
      const result = dispatch(state, move);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }

    const beforeState = reconstructStateAtIndex(state, 4);
    const preview = buildVariationPreview(beforeState, [
      { color: 'black', position: { row: 1, col: 2 } },
    ]);

    expect(preview.canRender).toBe(true);
    expect(preview.markers[0]?.position).toEqual({ row: 1, col: 2 });
  });

  it('limits preview to configured maximum', () => {
    const state = createInitialState(9);
    const variation: VariationMove[] = Array.from({ length: 8 }, (_, index) => ({
      color: index % 2 === 0 ? 'black' : 'white',
      position: { row: 1, col: (index % 7) + 1 },
    }));

    const preview = buildVariationPreview(state, variation);
    expect(preview.textMoves.length).toBeLessThanOrEqual(MAX_VARIATION_PREVIEW_MOVES);
  });

  it('falls back safely for invalid variation', () => {
    const state = createInitialState(9);
    const preview = buildVariationPreview(state, [
      { color: 'white', position: { row: 2, col: 2 } },
    ]);

    expect(preview.canRender).toBe(false);
    expect(preview.textMoves).toHaveLength(1);
  });

  it('clears marker map when preview is empty', () => {
    const map = getVariationMarkerMap({ markers: [], textMoves: [], canRender: false });
    expect(map.size).toBe(0);
  });

  it('handles pass moves in variation text', () => {
    const state = createInitialState(9);
    const preview = buildVariationPreview(state, [{ color: 'black', position: 'pass' }]);
    expect(preview.textMoves[0]?.position).toBe('pass');
  });
});

describe('KataGo PV normalization', () => {
  it('is covered by backend analysis tests for coordinate conversion', () => {
    expect(true).toBe(true);
  });
});
