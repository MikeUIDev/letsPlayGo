import { LogoStone } from './StoneIcon';
import { AppNavLinks } from '../../../layouts/AppLayout';
import { AppSectionLink } from '../../../navigation/AppSectionLink';

export function GameHeader() {
  return (
    <header className="game-header">
      <div className="go-shell game-header__inner">
        <AppSectionLink section="play" className="game-header__brand">
          <LogoStone className="game-header__logo" />
          <div className="game-header__titles">
            <h1 className="game-header__title">Let&apos;s Play Go</h1>
            <p className="game-header__tagline">Focus · Balance · Strategy</p>
          </div>
        </AppSectionLink>
        <AppNavLinks />
      </div>
    </header>
  );
}
