import { NavLink, Outlet } from 'react-router-dom';
import { GameHeader } from '../games/go/components/GameHeader';

export function AppLayout() {
  return (
    <div className="go-app">
      <GameHeader />
      <Outlet />
    </div>
  );
}

export function AppNavLinks() {
  return (
    <nav className="game-header__nav" aria-label="Primary">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `game-header__nav-link${isActive ? ' game-header__nav-link--active' : ''}`
        }
      >
        Play
      </NavLink>
      <NavLink
        to="/learn"
        className={({ isActive }) =>
          `game-header__nav-link${isActive ? ' game-header__nav-link--active' : ''}`
        }
      >
        Learn
      </NavLink>
    </nav>
  );
}
