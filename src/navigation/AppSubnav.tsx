import { useLocation, useNavigate } from 'react-router-dom';
import { getAppSubnav } from './appRoutes';
import { closeRegisteredOverlays } from './overlayNavigation';
import { useSectionNavigation } from './useSectionNavigation';

export function AppSubnav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { goToSection } = useSectionNavigation();
  const config = getAppSubnav(location.pathname);

  if (!config) {
    return null;
  }

  const { backLabel, backPath, title, backSection } = config;

  function handleBack() {
    closeRegisteredOverlays();

    if (backSection) {
      goToSection(backSection);
      return;
    }

    navigate(backPath);
  }

  return (
    <nav className={`app-subnav${title ? '' : ' app-subnav--back-only'}`} aria-label="Section navigation">
      <button type="button" className="app-subnav__back" onClick={handleBack}>
        <span className="app-subnav__chevron" aria-hidden="true">
          ‹
        </span>
        {backLabel}
      </button>
      {title ? <span className="app-subnav__title">{title}</span> : null}
    </nav>
  );
}
