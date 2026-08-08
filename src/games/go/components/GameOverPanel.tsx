import { scoreMargin } from '../engine/scoring';
import type { GameState } from '../engine/types';
import { StoneIcon } from './StoneIcon';

interface GameOverPanelProps {
  state: GameState;
}

export function GameOverPanel({ state }: GameOverPanelProps) {
  const result = state.result;
  if (!result) return null;

  const margin = scoreMargin(result);
  const winnerLabel =
    result.winner === 'draw'
      ? 'Draw'
      : result.winner === 'black'
        ? 'Black wins'
        : 'White wins';

  return (
    <section className="game-over-panel" aria-label="Game over">
      <header className="game-over-panel__header">
        <h2 className="game-over-panel__title">Game Over</h2>
        <div className="game-over-panel__winner">
          {result.winner !== 'draw' && result.winner !== null && (
            <StoneIcon color={result.winner} />
          )}
          <div className="game-over-panel__winner-text">
            <p className="game-over-panel__winner-label">{winnerLabel}</p>
            {result.winner !== 'draw' && (
              <p className="game-over-panel__margin">by {margin} points</p>
            )}
          </div>
        </div>
      </header>

      <div className="game-over-panel__scores">
        <div className="game-over-panel__score-row">
          <StoneIcon color="black" size="sm" />
          <span className="game-over-panel__score-label">Black</span>
          <span className="game-over-panel__score-value">{result.blackScore}</span>
        </div>
        <div className="game-over-panel__score-row">
          <StoneIcon color="white" size="sm" />
          <span className="game-over-panel__score-label">White</span>
          <span className="game-over-panel__score-value">{result.whiteScore}</span>
        </div>
      </div>
    </section>
  );
}
