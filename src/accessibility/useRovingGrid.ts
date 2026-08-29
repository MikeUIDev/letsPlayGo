import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Position } from '../games/go/engine/types';
import {
  defaultGridFocus,
  isGridNavigationKey,
  moveRovingFocus,
} from './rovingGrid';

export type UseRovingGridOptions = {
  size: number;
  enabled?: boolean;
  lastMove?: Position | null;
};

export function useRovingGrid({
  size,
  enabled = true,
  lastMove = null,
}: UseRovingGridOptions) {
  const [focused, setFocused] = useState<Position>(() => defaultGridFocus(size, lastMove));
  const gridRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(focused);

  focusedRef.current = focused;

  useEffect(() => {
    setFocused(defaultGridFocus(size, lastMove));
  }, [size]);

  const focusCell = useCallback((position: Position) => {
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-intersection="${position.row}-${position.col}"]`,
    );
    cell?.focus();
  }, []);

  const getTabIndex = useCallback(
    (row: number, col: number) => {
      if (!enabled) {
        return -1;
      }

      return focused.row === row && focused.col === col ? 0 : -1;
    },
    [enabled, focused.col, focused.row],
  );

  const handleGridKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }

      const navigationKey =
        (event.ctrlKey || event.metaKey) && (event.key === 'Home' || event.key === 'End')
          ? `${event.ctrlKey ? 'Control' : 'Meta'}+${event.key}`
          : event.key;

      if (isGridNavigationKey(event.nativeEvent)) {
        event.preventDefault();
        const next = moveRovingFocus(focusedRef.current, navigationKey, {
          rows: size,
          cols: size,
        });
        if (next) {
          setFocused(next);
          requestAnimationFrame(() => focusCell(next));
        }
      }
    },
    [enabled, focusCell, size],
  );

  return {
    gridRef,
    focused,
    getTabIndex,
    handleGridKeyDown,
  };
}
