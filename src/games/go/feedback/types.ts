export type FeedbackEvent = 'place' | 'capture' | 'illegal' | 'success' | 'gameOver';

export type FeedbackPreferences = {
  sound: boolean;
  haptics: boolean;
};

export const DEFAULT_FEEDBACK_PREFERENCES: FeedbackPreferences = {
  sound: true,
  haptics: true,
};
