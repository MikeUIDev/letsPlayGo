import { useEffect, useRef, useState } from 'react';
import type { AIStatus } from '../ai/types';
import type { GameState } from '../engine/types';
import { buildGameAnnouncement, type GameAnnouncement } from './formatGameAnnouncement';

export function useGameAnnouncement(
  state: GameState | null,
  aiStatus: AIStatus,
  error: string | null,
): GameAnnouncement | null {
  const [announcement, setAnnouncement] = useState<GameAnnouncement | null>(null);
  const previousStateRef = useRef<GameState | null>(null);
  const previousAiStatusRef = useRef<AIStatus>('idle');
  const previousErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state) {
      previousStateRef.current = null;
      setAnnouncement(null);
      return;
    }

    const next = buildGameAnnouncement({
      previous: previousStateRef.current,
      current: state,
      aiStatus,
      previousAiStatus: previousAiStatusRef.current,
      error,
      previousError: previousErrorRef.current,
    });

    previousStateRef.current = state;
    previousAiStatusRef.current = aiStatus;
    previousErrorRef.current = error;

    if (next) {
      setAnnouncement(next);
    }
  }, [aiStatus, error, state]);

  return announcement;
}
