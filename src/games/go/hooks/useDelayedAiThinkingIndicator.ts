import { useEffect, useRef, useState } from 'react';

export const AI_THINKING_INDICATOR_DELAY_MS = 350;

/** Delay showing AI thinking UI to avoid flashes on fast responses. */
export function useDelayedAiThinkingIndicator(
  isThinking: boolean,
  delayMs = AI_THINKING_INDICATOR_DELAY_MS,
): boolean {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isThinking) {
      setVisible(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(true);
    }, delayMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs, isThinking]);

  return visible;
}
