import { scoreMargin } from '../engine/scoring';
import type { CaptureCounts, GameEndReason, GameState } from '../engine/types';
import type { ScoreBreakdown } from '../engine/scoring';
import { formatWinnerLabel, ScoreBreakdownView } from './ScoreBreakdownView';
import { StoneIcon } from './StoneIcon';

interface GameOverPanelProps {
  state: GameState;
  breakdown: ScoreBreakdown;
}

function formatEndReason(reason: GameEndReason): string {
  switch (reason) {
    case 'resign':
      return 'Game ended by resignation';
    case 'double_pass':
      return 'Game ended after two consecutive passes';
    case 'score':
      return 'Final score confirmed';
    default:
      return 'Game over';
  }
}

export function GameOverPanel({ state, breakdown }: GameOverPanelProps) {
  const result = state.result;
  if (!result) return null;

  const captures: CaptureCounts = state.captures;
  const winnerLabel = formatWinnerLabel(result);
  const margin = scoreMargin(result);

  return (
    <section className="game-over-panel" aria-label="Game over">
      <header className="game-over-panel__header">
        <p className="game-over-panel__eyebrow">{formatEndReason(result.reason)}</p>
        <div className="game-over-panel__winner">
          {result.winner !== 'draw' && result.winner !== null && (
            <StoneIcon color={result.winner} />
          )}
          <div className="game-over-panel__winner-text">
            <h2 className="game-over-panel__winner-label">{winnerLabel}</h2>
            {result.winner === 'draw' && (
              <p className="game-over-panel__margin">Scores are tied</p>
            )}
            {result.winner !== 'draw' && result.winner !== null && margin > 0 && (
              <p className="game-over-panel__margin">by {formatPoints(margin)} points</p>
            )}
          </div>
        </div>
      </header>

      <ScoreBreakdownView breakdown={breakdown} captures={captures} showRulesNote />

      <div className="game-over-panel__final-totals" aria-label="Final totals">
        <div className="game-over-panel__score-row">
          <StoneIcon color="black" size="sm" />
          <span className="game-over-panel__score-label">Black final</span>
          <span className="game-over-panel__score-value">{formatPoints(result.blackScore)}</span>
        </div>
        <div className="game-over-panel__score-row">
          <StoneIcon color="white" size="sm" />
          <span className="game-over-panel__score-label">White final</span>
          <span className="game-over-panel__score-value">{formatPoints(result.whiteScore)}</span>
        </div>
      </div>
    </section>
  );
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
