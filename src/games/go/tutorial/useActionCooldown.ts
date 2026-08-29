import { useCallback, useRef } from 'react';

/** Prevents accidental double-taps on mobile controls. */
export function useActionCooldown(cooldownMs = 400) {
  const lastAtRef = useRef(0);

  return useCallback(
    (action: () => void) => {
      const now = Date.now();
      if (now - lastAtRef.current < cooldownMs) {
        return;
      }
      lastAtRef.current = now;
      action();
    },
    [cooldownMs],
  );
}
