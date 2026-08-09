import type { AIDifficulty } from '../engine/aiDifficulty';
import type { GameMode } from '../engine/types';

export type CoordinatesPreference = 'default' | 'on' | 'off';

export type CoordinateDisplayContext = {
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  isReviewing: boolean;
};

export function getDefaultShowCoordinates(context: CoordinateDisplayContext): boolean {
  if (context.isReviewing) {
    return true;
  }

  if (context.mode === 'ai') {
    return context.aiDifficulty === 'beginner';
  }

  return false;
}

export function resolveShowCoordinates(
  preference: CoordinatesPreference,
  context: CoordinateDisplayContext,
): boolean {
  if (preference === 'on') {
    return true;
  }

  if (preference === 'off') {
    return false;
  }

  return getDefaultShowCoordinates(context);
}
