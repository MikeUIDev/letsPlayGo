import type { Position } from '../games/go/engine/types';

export type RovingGridSize = {
  rows: number;
  cols: number;
};

export function defaultGridFocus(size: number, lastMove: Position | null): Position {
  if (lastMove && lastMove.row < size && lastMove.col < size) {
    return lastMove;
  }

  const center = Math.floor(size / 2);
  return { row: center, col: center };
}

export function moveRovingFocus(
  current: Position,
  key: string,
  grid: RovingGridSize,
  options?: { pageStep?: number },
): Position | null {
  const pageStep = options?.pageStep ?? 5;
  const maxRow = grid.rows - 1;
  const maxCol = grid.cols - 1;

  switch (key) {
    case 'ArrowUp':
      return { row: Math.max(0, current.row - 1), col: current.col };
    case 'ArrowDown':
      return { row: Math.min(maxRow, current.row + 1), col: current.col };
    case 'ArrowLeft':
      return { row: current.row, col: Math.max(0, current.col - 1) };
    case 'ArrowRight':
      return { row: current.row, col: Math.min(maxCol, current.col + 1) };
    case 'Home':
      return { row: current.row, col: 0 };
    case 'End':
      return { row: current.row, col: maxCol };
    case 'PageUp':
      return { row: Math.max(0, current.row - pageStep), col: current.col };
    case 'PageDown':
      return { row: Math.min(maxRow, current.row + pageStep), col: current.col };
    case 'Control+Home':
    case 'Meta+Home':
      return { row: 0, col: 0 };
    case 'Control+End':
    case 'Meta+End':
      return { row: maxRow, col: maxCol };
    default:
      return null;
  }
}

export function isGridNavigationKey(event: KeyboardEvent): boolean {
  const withModifier = event.ctrlKey || event.metaKey;
  if (withModifier && (event.key === 'Home' || event.key === 'End')) {
    return true;
  }

  return (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key === 'PageUp' ||
    event.key === 'PageDown'
  );
}

export function isGridActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
