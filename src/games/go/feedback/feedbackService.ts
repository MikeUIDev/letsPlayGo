import { loadFeedbackPreferences } from './preferences';
import {
  synthesizeCaptureSound,
  synthesizeGameOverSound,
  synthesizePlacementSound,
  synthesizeSuccessSound,
} from './synthesizeSounds';
import { triggerHaptic } from './haptics';
import { getMoveFeedbackEvent, shouldNotifyMove } from './moveFeedback';
import type { FeedbackEvent } from './types';
import type { GameState } from '../engine/types';

const EVENT_COOLDOWN_MS: Record<FeedbackEvent, number> = {
  place: 90,
  capture: 120,
  illegal: 180,
  success: 250,
  gameOver: 400,
};

let lastPlayedAt = 0;
let lastEvent: FeedbackEvent | null = null;
let preferences = loadFeedbackPreferences();

function refreshPreferences(): void {
  preferences = loadFeedbackPreferences();
}

function canEmit(event: FeedbackEvent): boolean {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false;
  }

  const now = Date.now();
  const cooldown = EVENT_COOLDOWN_MS[event];
  if (now - lastPlayedAt < cooldown) {
    return false;
  }

  if (lastEvent === event && now - lastPlayedAt < cooldown * 1.5) {
    return false;
  }

  lastPlayedAt = now;
  lastEvent = event;
  return true;
}

function playSound(event: FeedbackEvent): void {
  switch (event) {
    case 'place':
      synthesizePlacementSound();
      break;
    case 'capture':
      synthesizeCaptureSound();
      break;
    case 'success':
      synthesizeSuccessSound();
      break;
    case 'gameOver':
      synthesizeGameOverSound();
      break;
    case 'illegal':
      break;
  }
}

/** Central gameplay feedback entry point. */
export function playGameFeedback(event: FeedbackEvent): void {
  refreshPreferences();
  if (!canEmit(event)) {
    return;
  }

  if (preferences.sound) {
    playSound(event);
  }

  if (preferences.haptics) {
    triggerHaptic(event);
  }
}

export function notifyGameplayMove(before: GameState | null, after: GameState): void {
  if (!shouldNotifyMove(before, after)) {
    return;
  }

  const event = getMoveFeedbackEvent(before!, after);
  if (event) {
    playGameFeedback(event);
  }
}

export function notifyIllegalMove(): void {
  playGameFeedback('illegal');
}

export function notifyPuzzleSuccess(): void {
  playGameFeedback('success');
}

export function notifyGameOver(): void {
  playGameFeedback('gameOver');
}

/** Test helper */
export function resetFeedbackCooldownForTests(): void {
  lastPlayedAt = 0;
  lastEvent = null;
  preferences = loadFeedbackPreferences();
}
