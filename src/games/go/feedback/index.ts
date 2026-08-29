export {
  notifyGameOver,
  notifyGameplayMove,
  notifyIllegalMove,
  notifyPuzzleSuccess,
  playGameFeedback,
  resetFeedbackCooldownForTests,
} from './feedbackService';
export { loadFeedbackPreferences, saveFeedbackPreferences } from './preferences';
export { getMoveFeedbackEvent, shouldNotifyMove } from './moveFeedback';
export type { FeedbackEvent, FeedbackPreferences } from './types';
export { DEFAULT_FEEDBACK_PREFERENCES } from './types';
