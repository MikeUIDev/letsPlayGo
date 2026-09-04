import { describe, expect, it } from 'vitest';
import {
  isLearnRoute,
  isPlayRoute,
  isPracticeRoute,
  isSectionActive,
  getAppSubnav,
  shouldSkipSectionNavigation,
} from './appRoutes';

describe('appRoutes', () => {
  it('detects section routes', () => {
    expect(isPlayRoute('/')).toBe(true);
    expect(isPlayRoute('/play')).toBe(true);
    expect(isPlayRoute('/learn')).toBe(false);
    expect(isPracticeRoute('/practice')).toBe(true);
    expect(isPracticeRoute('/practice/snapback-1')).toBe(true);
    expect(isLearnRoute('/learn')).toBe(true);
    expect(isLearnRoute('/learn/tutorial/foo')).toBe(true);
  });

  it('marks active sections including nested routes', () => {
    expect(isSectionActive('/practice/foo', 'practice')).toBe(true);
    expect(isSectionActive('/learn/tutorial', 'learn')).toBe(true);
    expect(isSectionActive('/learn/tutorial', 'practice')).toBe(false);
    expect(isSectionActive('/play', 'play')).toBe(true);
  });

  it('skips duplicate section navigation', () => {
    expect(shouldSkipSectionNavigation('/', '', 'play')).toBe(true);
    expect(shouldSkipSectionNavigation('/play', '', 'play')).toBe(false);
    expect(shouldSkipSectionNavigation('/practice', '', 'practice')).toBe(true);
    expect(shouldSkipSectionNavigation('/learn', '', 'learn')).toBe(true);
    expect(shouldSkipSectionNavigation('/learn/tutorial', '', 'learn')).toBe(false);
    expect(shouldSkipSectionNavigation('/practice/foo', '', 'practice')).toBe(false);
  });

  it('provides contextual subnav on learn, practice, and settings routes', () => {
    expect(getAppSubnav('/')).toBeNull();
    expect(getAppSubnav('/learn')?.backLabel).toBe('Play');
    expect(getAppSubnav('/learn')?.title).toBeUndefined();
    expect(getAppSubnav('/practice')?.backLabel).toBe('Play');
    expect(getAppSubnav('/practice')?.title).toBeUndefined();
    expect(getAppSubnav('/settings')?.backLabel).toBe('Play');
    expect(getAppSubnav('/settings')?.title).toBeUndefined();
    expect(getAppSubnav('/learn/tutorial')?.backLabel).toBe('Learn');
    expect(getAppSubnav('/learn/tutorial')?.title).toBeUndefined();
    expect(getAppSubnav('/learn/tutorial/foo')?.backPath).toBe('/learn/tutorial');
    expect(getAppSubnav('/learn/tutorial/foo')?.backLabel).toBe('Tutorial');
    expect(getAppSubnav('/learn/tutorial/foo')?.title).toBeUndefined();
    expect(getAppSubnav('/practice/foo')?.backPath).toBe('/practice');
    expect(getAppSubnav('/practice/foo')?.backLabel).toBe('All Puzzles');
    expect(getAppSubnav('/practice/foo')?.title).toBeUndefined();
  });
});
