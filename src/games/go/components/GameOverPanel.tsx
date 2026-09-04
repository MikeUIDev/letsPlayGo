import type { CaptureCounts, GameState } from '../engine/types';
import type { ScoreBreakdown } from '../engine/scoring';
import { formatBoardSize } from '../utils/coordinates';
import { formatGameOverReasonLine, formatPoints } from './gameOverResult';
import { formatWinnerLabel, ScoreBreakdownView } from './ScoreBreakdownView';
import { StoneIcon } from './StoneIcon';

interface GameOverPanelProps {
  state: GameState;
  breakdown: ScoreBreakdown;
}

export function GameOverPanel({ state, breakdown }: GameOverPanelProps) {
  const result = state.result;
  if (!result) return null;

  const captures: CaptureCounts = state.captures;
  const winnerLabel = formatWinnerLabel(result);
  const reasonLine = formatGameOverReasonLine(result);
  const isResignation = result.reason === 'resign';
  const moveCount = state.history.length;
  const breakdownView = (
    <ScoreBreakdownView breakdown={breakdown} captures={captures} showRulesNote={!isResignation} />
  );

  return (
    <section className="game-over-panel" aria-label="Game over">
      <header className="game-over-panel__header">
        <p className="game-over-panel__eyebrow">Game Over</p>
        <div className="game-over-panel__winner">
          {result.winner !== 'draw' && result.winner !== null && (
            <StoneIcon color={result.winner} />
          )}
          <div className="game-over-panel__winner-text">
            <h2 className="game-over-panel__winner-label">{winnerLabel}</h2>
            <p className="game-over-panel__margin">{reasonLine}</p>
          </div>
        </div>
        <p className="game-over-panel__meta">
          {formatBoardSize(state.config.size)} · {moveCount} {moveCount === 1 ? 'move' : 'moves'} ·
          Komi {formatPoints(state.config.komi)}
        </p>
      </header>

      {isResignation ? (
        <details className="game-over-panel__details">
          <summary className="game-over-panel__details-summary">Score snapshot</summary>
          {breakdownView}
        </details>
      ) : (
        breakdownView
      )}
    </section>
  );
}
