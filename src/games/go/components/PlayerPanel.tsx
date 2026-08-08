import type { AIStatus } from '../ai/types';
import { getAiColor, isAiGameConfig } from '../engine/gameConfig';
import type { GameState, StoneColor } from '../engine/types';
import { StoneIcon } from './StoneIcon';

interface PlayerPanelProps {
  state: GameState;
  error: string | null;
  layout?: 'sidebar' | 'active-only' | 'opponent-only';
  aiStatus?: AIStatus;
}

function CaptureRow({ color, count }: { color: StoneColor; count: number }) {
  return (
    <div className="player-card__captures">
      <span className="player-card__captures-label">Captured {count}</span>
      <div className="player-card__capture-stones" aria-hidden="true">
        {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
          <StoneIcon key={index} color={color} size="sm" />
        ))}
        {count > 5 && <span className="player-card__capture-more">+{count - 5}</span>}
      </div>
    </div>
  );
}

function PlayerCard({
  color,
  state,
  emphasize,
  aiStatus = 'idle',
}: {
  color: StoneColor;
  state: GameState;
  emphasize: boolean;
  aiStatus?: AIStatus;
}) {
  const isActive = state.phase === 'playing' && state.currentPlayer === color;
  const label = color === 'black' ? 'Black' : 'White';
  const aiColor = isAiGameConfig(state.config) ? getAiColor(state.config) : null;
  const isAiPlayer = aiColor === color;
  const isAiThinking = isAiPlayer && aiStatus === 'thinking' && state.phase === 'playing';

  const status = isAiThinking
    ? 'Thinking…'
    : state.phase === 'ended'
      ? state.result?.winner === color
        ? 'Winner'
        : state.result?.winner === 'draw'
          ? 'Draw'
          : 'Finished'
      : state.phase === 'scoring'
        ? 'Scoring'
        : isActive
          ? isAiPlayer
            ? 'Thinking…'
            : 'Your turn'
          : 'Waiting';

  return (
    <article
      className={`player-card player-card--${color}${emphasize ? ' player-card--active' : ''}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="player-card__header">
        <StoneIcon color={color} />
        <div className="player-card__meta">
          <h2 className="player-card__name">{label}</h2>
          <p className="player-card__status">{status}</p>
        </div>
      </div>
      <CaptureRow color={color} count={state.captures[color]} />
    </article>
  );
}

function GameMeta({ state }: { state: GameState }) {
  const moveNumber = state.history.length;
  const turnLabel =
    state.phase === 'playing'
      ? `${state.currentPlayer === 'black' ? 'Black' : 'White'} to play`
      : state.phase === 'scoring'
        ? 'Scoring phase'
        : 'Game ended';

  return (
    <div className="game-meta">
      <p className="game-meta__move">Move {moveNumber}</p>
      <p className="game-meta__turn">{turnLabel}</p>
      {state.result && (
        <p className="game-meta__result">
          {state.result.winner === 'draw'
            ? `Draw · ${state.result.blackScore.toFixed(1)} – ${state.result.whiteScore.toFixed(1)}`
            : `${state.result.winner === 'black' ? 'Black' : 'White'} wins · ${state.result.blackScore.toFixed(1)} – ${state.result.whiteScore.toFixed(1)}`}
        </p>
      )}
    </div>
  );
}

export function PlayerPanel({ state, error, layout = 'sidebar', aiStatus = 'idle' }: PlayerPanelProps) {
  const activeColor = state.currentPlayer;
  const opponentColor = activeColor === 'black' ? 'white' : 'black';

  if (layout === 'active-only') {
    return (
      <section className="player-panel player-panel--mobile-active" aria-label="Current player">
        <PlayerCard color={activeColor} state={state} emphasize aiStatus={aiStatus} />
        <GameMeta state={state} />
        {error && <p className="game-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (layout === 'opponent-only') {
    return (
      <section className="player-panel player-panel--mobile-opponent" aria-label="Opponent">
        <PlayerCard color={opponentColor} state={state} emphasize={false} aiStatus={aiStatus} />
      </section>
    );
  }

  return (
    <section className="player-panel" aria-label="Players">
      <PlayerCard
        color="white"
        state={state}
        emphasize={state.currentPlayer === 'white' && state.phase === 'playing'}
        aiStatus={aiStatus}
      />
      <PlayerCard
        color="black"
        state={state}
        emphasize={state.currentPlayer === 'black' && state.phase === 'playing'}
        aiStatus={aiStatus}
      />
      <GameMeta state={state} />
      {error && <p className="game-error" role="alert">{error}</p>}
    </section>
  );
}
