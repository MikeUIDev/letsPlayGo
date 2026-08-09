import { describe, expect, it } from 'vitest';
import {
  getGridSpan,
  intersectionAnchorLeft,
  intersectionAnchorTop,
  intersectionLeftPercent,
  intersectionLeftWithinBoardPercent,
  intersectionTopPercent,
  intersectionTopWithinBoardPercent,
} from '../coordinates/boardGridGeometry';

describe('boardGridGeometry', () => {
  it('maps first and last grid anchors on 9x9', () => {
    expect(intersectionLeftPercent(0, 9)).toBe(0);
    expect(intersectionLeftPercent(8, 9)).toBe(100);
    expect(intersectionTopPercent(0, 9)).toBe(0);
    expect(intersectionTopPercent(8, 9)).toBe(100);
  });

  it('maps center intersection on 9x9', () => {
    expect(intersectionLeftPercent(4, 9)).toBe(50);
    expect(intersectionTopPercent(4, 9)).toBe(50);
  });

  it('keeps edge anchors inset from board bounds on 9x9', () => {
    const leftEdge = intersectionLeftWithinBoardPercent(0, 9);
    const rightEdge = intersectionLeftWithinBoardPercent(8, 9);
    const topEdge = intersectionTopWithinBoardPercent(0, 9);
    const bottomEdge = intersectionTopWithinBoardPercent(8, 9);

    expect(leftEdge).toBeGreaterThan(0);
    expect(topEdge).toBeGreaterThan(0);
    expect(rightEdge).toBeLessThan(100);
    expect(bottomEdge).toBeLessThan(100);
    expect(leftEdge).toBeLessThan(rightEdge);
    expect(topEdge).toBeLessThan(bottomEdge);
  });

  it('aligns center coordinate with center intersection on all supported sizes', () => {
    for (const size of [9, 13, 19] as const) {
      const span = getGridSpan(size);
      const center = Math.floor(span / 2);
      const left = intersectionLeftWithinBoardPercent(center, size);
      const top = intersectionTopWithinBoardPercent(center, size);
      expect(left).toBeGreaterThan(40);
      expect(left).toBeLessThan(60);
      expect(top).toBeGreaterThan(40);
      expect(top).toBeLessThan(60);
    }
  });

  it('returns CSS percentages for label anchors', () => {
    expect(intersectionAnchorLeft(0, 9)).toMatch(/%$/);
    expect(intersectionAnchorTop(8, 9)).toMatch(/%$/);
    expect(intersectionAnchorLeft(4, 9)).toBe(`${intersectionLeftWithinBoardPercent(4, 9)}%`);
    expect(intersectionAnchorTop(4, 9)).toBe(`${intersectionTopWithinBoardPercent(4, 9)}%`);
  });

  it('maps 19x19 outer corners to distinct inset anchors', () => {
    expect(intersectionLeftWithinBoardPercent(0, 19)).not.toBe(intersectionLeftWithinBoardPercent(18, 19));
    expect(intersectionTopWithinBoardPercent(0, 19)).not.toBe(intersectionTopWithinBoardPercent(18, 19));
  });
});
