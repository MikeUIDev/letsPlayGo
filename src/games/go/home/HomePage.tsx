import { useNavigate } from 'react-router-dom';
import { PLAY_ROUTE, SETTINGS_ROUTE, sectionPath } from '../../../navigation/appRoutes';
import { LogoStone } from '../components/StoneIcon';
import { useGoGameSession } from '../context/GoGameSessionProvider';
import { buildSavedGameSummary } from './savedGameSummary';
import '../go.css';

export function HomePage() {
  const navigate = useNavigate();
  const { displaySavedGame, continueGame, openSetup } = useGoGameSession();

  const savedSummary = displaySavedGame ? buildSavedGameSummary(displaySavedGame) : null;
  const hasSavedGame = savedSummary !== null;

  function handleContinue() {
    continueGame();
    navigate(PLAY_ROUTE);
  }

  function handleNewGame() {
    openSetup();
    navigate(PLAY_ROUTE);
  }

  return (
    <main className="go-home" id="main-content" tabIndex={-1}>
      <div className="go-shell go-home__content">
        <header className="go-home__header">
          <LogoStone className="go-home__logo" />
          <h1 className="go-home__title">Let&apos;s Play Go</h1>
          <p className="go-home__tagline">Focus · Balance · Strategy</p>
        </header>

        <div className="go-home__actions">
          {hasSavedGame && savedSummary ? (
            <button
              type="button"
              className="go-home__resume-card"
              aria-label={`Resume game: ${savedSummary.boardSizeLabel}, move ${savedSummary.moveNumber}, ${savedSummary.statusLabel}`}
              onClick={handleContinue}
            >
              <span className="go-home__resume-eyebrow">Resume Game</span>
              <span className="go-home__resume-board">{savedSummary.boardSizeLabel}</span>
              <span className="go-home__resume-mode">{savedSummary.modeLabel}</span>
              <span className="go-home__resume-status">
                Move {savedSummary.moveNumber} · {savedSummary.statusLabel}
              </span>
              <span className="go-home__resume-meta">
                Komi {savedSummary.komi} · {savedSummary.capturesLabel}
              </span>
            </button>
          ) : null}

          <div className="go-home__primary-actions">
            <button
              type="button"
              className={
                hasSavedGame
                  ? 'control-button control-button--secondary go-home__primary-button'
                  : 'control-button control-button--primary go-home__primary-button'
              }
              onClick={handleNewGame}
            >
              New Game
            </button>
          </div>
        </div>

        <nav className="go-home__nav" aria-label="App sections">
          <button
            type="button"
            className="go-home__nav-button"
            onClick={() => navigate(sectionPath('learn'))}
          >
            Learn
          </button>
          <button
            type="button"
            className="go-home__nav-button"
            onClick={() => navigate(sectionPath('practice'))}
          >
            Practice
          </button>
          <button
            type="button"
            className="go-home__nav-button"
            onClick={() => navigate(SETTINGS_ROUTE)}
          >
            Settings
          </button>
        </nav>
      </div>
    </main>
  );
}
