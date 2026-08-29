import { describe, expect, it } from 'vitest';
import {
  nearestIntersectionFromClientPoint,
  resolveTouchPlacementTap,
  shouldUseTouchPlacement,
} from '../placement/touchPlacement';

const BOARD_RECT = { left: 100, top: 200, width: 360, height: 360 };

describe('shouldUseTouchPlacement', () => {
  it('uses direct placement for 9×9', () => {
    expect(shouldUseTouchPlacement(9)).toBe(false);
  });

  it('uses confirm touch placement for 13×13 and 19×19', () => {
    expect(shouldUseTouchPlacement(13)).toBe(true);
    expect(shouldUseTouchPlacement(19)).toBe(true);
  });

  it('can be disabled for static diagrams', () => {
    expect(shouldUseTouchPlacement(19, false)).toBe(false);
  });
});

describe('nearestIntersectionFromClientPoint', () => {
  it('maps a center tap to the center intersection on 19×19', () => {
    const position = nearestIntersectionFromClientPoint(
      BOARD_RECT.left + BOARD_RECT.width / 2,
      BOARD_RECT.top + BOARD_RECT.height / 2,
      BOARD_RECT,
      19,
    );
    expect(position).toEqual({ row: 9, col: 9 });
  });

  it('maps corner taps to corner intersections', () => {
    const topLeft = nearestIntersectionFromClientPoint(
      BOARD_RECT.left,
      BOARD_RECT.top,
      BOARD_RECT,
      13,
    );
    const bottomRight = nearestIntersectionFromClientPoint(
      BOARD_RECT.left + BOARD_RECT.width,
      BOARD_RECT.top + BOARD_RECT.height,
      BOARD_RECT,
      13,
    );

    expect(topLeft).toEqual({ row: 0, col: 0 });
    expect(bottomRight).toEqual({ row: 12, col: 12 });
  });

  it('snaps between intersections to the nearest point', () => {
    const span = 12;
    const cell = BOARD_RECT.width / span;
    const between = nearestIntersectionFromClientPoint(
      BOARD_RECT.left + cell * 1.4,
      BOARD_RECT.top + cell * 1.1,
      BOARD_RECT,
      13,
    );

    expect(between).toEqual({ row: 1, col: 1 });
  });

  it('ignores taps far outside the grid', () => {
    const position = nearestIntersectionFromClientPoint(
      BOARD_RECT.left + BOARD_RECT.width + 80,
      BOARD_RECT.top + BOARD_RECT.height / 2,
      BOARD_RECT,
      19,
    );
    expect(position).toBeNull();
  });
});

describe('resolveTouchPlacementTap', () => {
  const point = { row: 3, col: 4 };

  it('selects a legal empty intersection on first tap', () => {
    expect(resolveTouchPlacementTap(null, point, true, null)).toEqual({
      type: 'select',
      position: point,
    });
  });

  it('confirms when tapping the same pending intersection again', () => {
    expect(resolveTouchPlacementTap(point, point, true, null)).toEqual({
      type: 'confirm',
      position: point,
    });
  });

  it('repositions the preview to another legal intersection', () => {
    const next = { row: 5, col: 6 };
    expect(resolveTouchPlacementTap(point, next, true, null)).toEqual({
      type: 'select',
      position: next,
    });
  });

  it('ignores occupied intersections', () => {
    expect(resolveTouchPlacementTap(null, point, false, 'black')).toEqual({ type: 'ignore' });
  });

  it('ignores illegal empty intersections', () => {
    expect(resolveTouchPlacementTap(null, point, false, null)).toEqual({ type: 'ignore' });
  });
});
