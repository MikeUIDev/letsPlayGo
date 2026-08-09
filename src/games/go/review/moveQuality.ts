export type MoveQuality = 'good' | 'inaccuracy' | 'mistake' | 'big_mistake';

/** Centralized 9×9 move-quality thresholds — tune after playtesting. */
export const MOVE_QUALITY_THRESHOLDS = {
  inaccuracy: 1.0,
  mistake: 2.5,
  bigMistake: 5.0,
} as const;

export function classifyMoveQuality(scoreLoss: number): MoveQuality {
  if (scoreLoss < MOVE_QUALITY_THRESHOLDS.inaccuracy) {
    return 'good';
  }

  if (scoreLoss < MOVE_QUALITY_THRESHOLDS.mistake) {
    return 'inaccuracy';
  }

  if (scoreLoss < MOVE_QUALITY_THRESHOLDS.bigMistake) {
    return 'mistake';
  }

  return 'big_mistake';
}

export function isMistakeQuality(quality: MoveQuality): boolean {
  return quality !== 'good';
}

export function formatMoveQualityLabel(quality: MoveQuality): string {
  switch (quality) {
    case 'good':
      return 'Good';
    case 'inaccuracy':
      return 'Inaccuracy';
    case 'mistake':
      return 'Mistake';
    case 'big_mistake':
      return 'Big mistake';
  }
}

export function moveQualityClassName(quality: MoveQuality): string {
  return `review-quality review-quality--${quality.replace('_', '-')}`;
}
