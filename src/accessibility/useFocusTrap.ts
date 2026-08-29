import { useEffect, useRef, type RefObject } from 'react';
import { getFocusableElements, trapTabKey } from './focusTrap';

export type UseFocusTrapOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  /** Focus the first or last focusable element when the trap activates. */
  initialFocus?: 'first' | 'last';
  restoreFocus?: boolean;
};

export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  initialFocus = 'first',
  restoreFocus = true,
}: UseFocusTrapOptions): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusables = getFocusableElements(container);
    const target = initialFocus === 'last' ? focusables.at(-1) : focusables[0];
    target?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (!containerRef.current) {
        return;
      }

      trapTabKey(event, containerRef.current);
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, containerRef, initialFocus, onEscape, restoreFocus]);
}
