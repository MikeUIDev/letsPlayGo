import type { GameState } from '../engine/types';
import { formatBoardSize } from '../utils/coordinates';
import { StoneIcon } from './StoneIcon';

interface ResumeGameScreenProps {
  savedGame: GameState;
  onResume: () => void;
  onNewGame: () => void;
  onDiscard: () => void;
}

function phaseSummary(state: GameState): string {
  if (state.phase === 'scoring') return 'Scoring';
  if (state.phase === 'ended') return 'Game finished';
  return `${state.currentPlayer === 'black' ? 'Black' : 'White'} to play`;
}

export function ResumeGameScreen({
  savedGame,
  onResume,
  onNewGame,
  onDiscard,
}: ResumeGameScreenProps) {
  const moveNumber = savedGame.history.length;
  const turnColor = stateTurnColor(savedGame);

  return (
    <main className="go-setup go-resume">
      <div className="go-shell go-setup__card">
        <header className="go-setup__header">
          <h1 className="go-setup__title">Continue Game</h1>
          <p className="go-setup__subtitle">Pick up where you left off.</p>
        </header>

        <div className="go-resume__summary">
          <div className="go-resume__row">
            <span className="go-resume__label">Board</span>
            <span className="go-resume__value">{formatBoardSize(savedGame.config.size)}</span>
          </div>
          <div className="go-resume__row">
            <span className="go-resume__label">Move</span>
            <span className="go-resume__value">{moveNumber}</span>
          </div>
          <div className="go-resume__row go-resume__row--turn">
            {turnColor && <StoneIcon color={turnColor} size="sm" />}
            <span className="go-resume__value">{phaseSummary(savedGame)}</span>
          </div>
          <div className="go-resume__meta">
            Komi {savedGame.config.komi}
          </div>
        </div>

        <div className="go-setup__actions go-setup__actions--solo">
          <button type="button" className="control-button control-button--primary go-setup__start" onClick={onResume}>
            Resume Game
          </button>
        </div>

        <div className="go-resume__secondary-actions">
          <button type="button" className="go-resume__link-button" onClick={onNewGame}>
            New Game
          </button>
          <button type="button" className="go-resume__link-button" onClick={onDiscard}>
            Discard Saved Game
          </button>
        </div>
      </div>
    </main>
  );
}

function stateTurnColor(state: GameState): 'black' | 'white' | null {
  if (state.phase === 'ended') return null;
  return state.currentPlayer;
}
