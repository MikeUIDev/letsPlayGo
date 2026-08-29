/** Board sizes accepted by the AI HTTP API — keep in sync with client `boardConfig.ts`. */
export const SUPPORTED_AI_BOARD_SIZES = [9, 13, 19] as const;

export type SupportedAiBoardSize = (typeof SUPPORTED_AI_BOARD_SIZES)[number];

export function isSupportedAiBoardSize(value: unknown): value is SupportedAiBoardSize {
  return typeof value === 'number' && (SUPPORTED_AI_BOARD_SIZES as readonly number[]).includes(value);
}
