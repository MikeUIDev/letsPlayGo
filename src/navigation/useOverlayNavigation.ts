import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { closeRegisteredOverlays } from './overlayNavigation';

/** Close menus/overlays when the route changes or the user navigates with browser/history back. */
export function useOverlayNavigation() {
  const location = useLocation();

  useEffect(() => {
    const onPopState = () => closeRegisteredOverlays();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    closeRegisteredOverlays();
  }, [location.pathname, location.search, location.hash]);
}
