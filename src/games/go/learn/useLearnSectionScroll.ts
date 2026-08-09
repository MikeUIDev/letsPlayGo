import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToLearnSection(sectionId: string): boolean {
  const target = document.getElementById(sectionId);
  if (!target) {
    return false;
  }

  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  return true;
}

export function useLearnSectionNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = useCallback(
    (sectionId: string) => {
      if (location.pathname !== '/learn') {
        navigate({ pathname: '/learn', hash: sectionId });
        return;
      }

      if (location.hash === `#${sectionId}`) {
        scrollToLearnSection(sectionId);
        return;
      }

      navigate({ hash: sectionId });
    },
    [location.hash, location.pathname, navigate],
  );

  return { goToSection };
}

/** Smooth-scroll to the current hash when it changes (links, back/forward, deep links). */
export function useLearnSectionScrollOnHash() {
  const location = useLocation();

  useEffect(() => {
    const sectionId = location.hash.replace('#', '');
    if (!sectionId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollToLearnSection(sectionId);
    });

    return () => cancelAnimationFrame(frame);
  }, [location.hash]);
}

export function useLearnSectionScroll() {
  useLearnSectionScrollOnHash();
  return useLearnSectionNavigation();
}
