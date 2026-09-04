/** Top-level app sections — keep in sync with React Router paths. */
export const APP_SECTIONS = {
  play: '/',
  practice: '/practice',
  learn: '/learn',
} as const;

export const PLAY_ROUTE = '/play';
export const SETTINGS_ROUTE = '/settings';

export type AppSectionId = keyof typeof APP_SECTIONS;

export function sectionPath(section: AppSectionId): string {
  return APP_SECTIONS[section];
}

export function isPlayRoute(pathname: string): boolean {
  return pathname === '/' || pathname === PLAY_ROUTE;
}

export function isPracticeRoute(pathname: string): boolean {
  return pathname === '/practice' || pathname.startsWith('/practice/');
}

export function isLearnRoute(pathname: string): boolean {
  return pathname === '/learn' || pathname.startsWith('/learn/');
}

export function isSectionActive(pathname: string, section: AppSectionId): boolean {
  switch (section) {
    case 'play':
      return isPlayRoute(pathname);
    case 'practice':
      return isPracticeRoute(pathname);
    case 'learn':
      return isLearnRoute(pathname);
  }
}

/**
 * Avoid pushing duplicate history entries when re-tapping the same section tab.
 * Returns true when navigation should be skipped.
 */
export function shouldSkipSectionNavigation(
  pathname: string,
  hash: string,
  section: AppSectionId,
): boolean {
  const target = sectionPath(section);
  if (section === 'play') {
    return pathname === '/';
  }

  if (section === 'practice') {
    return pathname === '/practice' && !hash;
  }

  if (section === 'learn') {
    return pathname === '/learn' && !hash;
  }

  return pathname === target && !hash;
}

export type AppSubnavConfig = {
  backLabel: string;
  backPath: string;
  /** Optional center label; omit when the primary nav already names the section. */
  title?: string;
  backSection?: AppSectionId;
};

/** Contextual back row shown below the main header on non-play routes. */
export function getAppSubnav(pathname: string): AppSubnavConfig | null {
  if (pathname.startsWith('/learn/tutorial/') && pathname.length > '/learn/tutorial/'.length) {
    return {
      backLabel: 'Tutorial',
      backPath: '/learn/tutorial',
    };
  }

  if (pathname === '/learn/tutorial') {
    return {
      backLabel: 'Learn',
      backPath: '/learn',
      backSection: 'learn',
    };
  }

  if (pathname.startsWith('/practice/') && pathname !== '/practice') {
    return {
      backLabel: 'All Puzzles',
      backPath: '/practice',
      backSection: 'practice',
    };
  }

  if (pathname === '/learn') {
    return {
      backLabel: 'Play',
      backPath: '/',
      backSection: 'play',
    };
  }

  if (pathname === '/practice') {
    return {
      backLabel: 'Play',
      backPath: '/',
      backSection: 'play',
    };
  }

  if (pathname === SETTINGS_ROUTE) {
    return {
      backLabel: 'Play',
      backPath: '/',
      backSection: 'play',
    };
  }

  return null;
}
