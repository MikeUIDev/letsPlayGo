import { Outlet } from 'react-router-dom';
import { GoGameSessionProvider } from '../games/go/context/GoGameSessionProvider';
import { GameHeader } from '../games/go/components/GameHeader';
import { AppSectionLink } from '../navigation/AppSectionLink';
import { AppSubnav } from '../navigation/AppSubnav';
import { useOverlayNavigation } from '../navigation/useOverlayNavigation';
import '../games/go/go.css';
import '../games/go/interaction.css';

export function AppLayout() {
  useOverlayNavigation();

  return (
    <GoGameSessionProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="go-app">
        <div className="app-chrome">
          <GameHeader />
          <AppSubnav />
        </div>
        <Outlet />
      </div>
    </GoGameSessionProvider>
  );
}

export function AppNavLinks() {
  return (
    <nav className="game-header__nav" aria-label="Primary">
      <AppSectionLink
        section="play"
        className={({ isActive }) =>
          `game-header__nav-link${isActive ? ' game-header__nav-link--active' : ''}`
        }
      >
        Play
      </AppSectionLink>
      <AppSectionLink
        section="practice"
        className={({ isActive }) =>
          `game-header__nav-link${isActive ? ' game-header__nav-link--active' : ''}`
        }
      >
        Practice
      </AppSectionLink>
      <AppSectionLink
        section="learn"
        className={({ isActive }) =>
          `game-header__nav-link${isActive ? ' game-header__nav-link--active' : ''}`
        }
      >
        Learn
      </AppSectionLink>
    </nav>
  );
}
