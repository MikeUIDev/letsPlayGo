import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  type AppSectionId,
  sectionPath,
  shouldSkipSectionNavigation,
} from './appRoutes';
import { closeRegisteredOverlays } from './overlayNavigation';

export function useSectionNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const goToSection = useCallback(
    (section: AppSectionId) => {
      const target = sectionPath(section);
      if (shouldSkipSectionNavigation(location.pathname, location.hash, section)) {
        return;
      }

      closeRegisteredOverlays();
      navigate(target);
    },
    [location.hash, location.pathname, navigate],
  );

  const goToPlay = useCallback(() => goToSection('play'), [goToSection]);

  return { goToSection, goToPlay, pathname: location.pathname, hash: location.hash };
}
