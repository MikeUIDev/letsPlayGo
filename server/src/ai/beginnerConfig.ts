/** Centralized tuning values for Beginner AI — adjust after playtesting. */
export const BEGINNER_TUNING = {
  /** Modest KataGo search budget (within ~16–32 visits). */
  maxVisits: 24,
  /** Maximum number of top-ranked candidates to consider. */
  maxCandidateCount: 6,
  /**
   * Maximum score-lead loss (points on 9×9) vs the best candidate.
   * Candidates worse than this are excluded from the eligible pool.
   */
  maxScoreLoss: 8,
  /** Selection weights by eligible rank (1 = best remaining candidate). */
  rankWeights: [10, 20, 25, 25, 15, 5] as const,
  /** When false, pass is excluded if any eligible board move exists. */
  allowPassWhenBoardMovesExist: false,
} as const;

export type BeginnerTuning = typeof BEGINNER_TUNING;
