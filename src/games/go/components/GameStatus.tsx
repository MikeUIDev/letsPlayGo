import type { GameState } from '../engine/types';

interface GameStatusProps {
  state: GameState;
  error: string | null;
}

function formatPlayer(player: string): string {
  return player.charAt(0).toUpperCase() + player.slice(1);
}

export function GameStatus({ state, error }: GameStatusProps) {
  const { currentPlayer, phase, captures, result } = state;

  return (
    <div className="game-status">
      <h2>Game Status</h2>
      <dl>
        <dt>Phase</dt>
        <dd>{phase}</dd>

        {phase === 'playing' && (
          <>
            <dt>Turn</dt>
            <dd>{formatPlayer(currentPlayer)}</dd>
          </>
        )}

        <dt>Black captures</dt>
        <dd>{captures.black}</dd>

        <dt>White captures</dt>
        <dd>{captures.white}</dd>

        {result && (
          <>
            <dt>Result</dt>
            <dd>
              {result.winner === 'draw'
                ? 'Draw'
                : result.winner
                  ? `${formatPlayer(result.winner)} wins`
                  : 'Undecided'}
              {' '}
              ({result.blackScore.toFixed(1)} – {result.whiteScore.toFixed(1)})
            </dd>
          </>
        )}

        {error && (
          <>
            <dt>Error</dt>
            <dd>{error}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
