import { dispatch } from '../engine/gameState';
import type { GameState, Position, StoneColor } from '../engine/types';
import type { VariationMove } from '../analysis/types';

export const MAX_VARIATION_PREVIEW_MOVES = 4;

export type VariationPreviewMarker = {
  step: number;
  color: StoneColor;
  position: Position;
};

export type VariationPreviewResult = {
  markers: VariationPreviewMarker[];
  textMoves: VariationMove[];
  canRender: boolean;
};

export function buildVariationPreview(
  startState: GameState,
  variation: VariationMove[] | undefined,
  maxMoves = MAX_VARIATION_PREVIEW_MOVES,
): VariationPreviewResult {
  if (!variation || variation.length === 0) {
    return { markers: [], textMoves: [], canRender: false };
  }

  const limited = variation.slice(0, maxMoves);
  let state = startState;
  const markers: VariationPreviewMarker[] = [];

  for (let index = 0; index < limited.length; index += 1) {
    const move = limited[index];

    if (move.position === 'pass') {
      const result = dispatch(state, { type: 'pass' });
      if (!result.ok) {
        return { markers, textMoves: limited, canRender: markers.length > 0 };
      }
      state = result.state;
      continue;
    }

    if (state.currentPlayer !== move.color) {
      return { markers, textMoves: limited, canRender: markers.length > 0 };
    }

    const result = dispatch(state, { type: 'play', position: move.position });
    if (!result.ok) {
      return { markers, textMoves: limited, canRender: markers.length > 0 };
    }

    state = result.state;
    markers.push({
      step: index + 1,
      color: move.color,
      position: move.position,
    });
  }

  return {
    markers,
    textMoves: limited,
    canRender: markers.length > 0,
  };
}

export function getVariationMarkerMap(
  preview: VariationPreviewResult,
): Map<string, { step: number; color: StoneColor }> {
  const map = new Map<string, { step: number; color: StoneColor }>();

  for (const marker of preview.markers) {
    map.set(`${marker.position.row},${marker.position.col}`, {
      step: marker.step,
      color: marker.color,
    });
  }

  return map;
}
