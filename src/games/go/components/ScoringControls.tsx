import type { GameAction } from '../engine/types';

interface ScoringControlsProps {
  canResume: boolean;
  canConfirmScore: boolean;
  onAction: (action: GameAction) => void;
  className?: string;
}

export function ScoringControls({
  canResume,
  canConfirmScore,
  onAction,
  className = '',
}: ScoringControlsProps) {
  return (
    <div className={`scoring-controls ${className}`.trim()}>
      <button
        type="button"
        className="control-button control-button--secondary"
        disabled={!canResume}
        onClick={() => onAction({ type: 'resumeGame' })}
      >
        Resume Game
      </button>
      <button
        type="button"
        className="control-button control-button--primary"
        disabled={!canConfirmScore}
        onClick={() => onAction({ type: 'confirmScore' })}
      >
        Confirm Score
      </button>
    </div>
  );
}

interface FinishedControlsProps {
  onNewGame: () => void;
  onExportSgf: () => void;
  className?: string;
}

export function FinishedControls({ onNewGame, onExportSgf, className = '' }: FinishedControlsProps) {
  function scrollToBoard() {
    document.querySelector('.go-board-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className={`scoring-controls ${className}`.trim()}>
      <button
        type="button"
        className="control-button control-button--secondary"
        onClick={scrollToBoard}
      >
        Review Board
      </button>
      <button
        type="button"
        className="control-button control-button--secondary"
        onClick={onExportSgf}
      >
        Export SGF
      </button>
      <button
        type="button"
        className="control-button control-button--primary"
        onClick={onNewGame}
      >
        New Game
      </button>
    </div>
  );
}
