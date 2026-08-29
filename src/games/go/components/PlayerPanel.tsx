import type { AIStatus } from '../ai/types';
import { formatAiPlayerSubtitle } from '../engine/aiDifficulty';
import { getAiColor, isAiGameConfig } from '../engine/gameConfig';
import type { GameState, StoneColor } from '../engine/types';
import { StoneIcon } from './StoneIcon';

interface PlayerPanelProps {
  state: GameState;
  error: string | null;
  layout?: 'sidebar' | 'active-only' | 'opponent-only' | 'mobile-players' | 'mobile-meta';
  aiStatus?: AIStatus;
  showAiThinkingIndicator?: boolean;
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
  showAiThinkingIndicator = false,
}: {
  color: StoneColor;
  state: GameState;
  emphasize: boolean;
  aiStatus?: AIStatus;
  showAiThinkingIndicator?: boolean;
}) {
  const isActive = state.phase === 'playing' && state.currentPlayer === color;
  const label = color === 'black' ? 'Black' : 'White';
  const aiColor = isAiGameConfig(state.config) ? getAiColor(state.config) : null;
  const isAiPlayer = aiColor === color;
  const showThinkingLabel =
    isAiPlayer && showAiThinkingIndicator && aiStatus === 'thinking' && state.phase === 'playing';
  const aiSubtitle =
    isAiPlayer && isAiGameConfig(state.config)
      ? formatAiPlayerSubtitle(state.config.difficulty)
      : null;

  const status = showThinkingLabel
    ? 'AI is thinking…'
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
            ? 'To play'
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
          {aiSubtitle && <p className="player-card__subtitle">{aiSubtitle}</p>}
          <p
            className={`player-card__status${showThinkingLabel ? ' player-card__status--ai-thinking' : ''}`}
            aria-live={showThinkingLabel ? 'polite' : undefined}
            aria-busy={showThinkingLabel ? true : undefined}
          >
            {status}
            {isActive ? <span className="visually-hidden">. Current turn.</span> : null}
          </p>
        </div>
      </div>
      <CaptureRow color={color} count={state.captures[color]} />
    </article>
  );
}

function GameMeta({
  state,
  showAiThinkingIndicator = false,
}: {
  state: GameState;
  showAiThinkingIndicator?: boolean;
}) {
  const moveNumber = state.history.length;
  const aiColor = isAiGameConfig(state.config) ? getAiColor(state.config) : null;
  const aiIsActive =
    state.phase === 'playing' &&
    aiColor !== null &&
    state.currentPlayer === aiColor &&
    showAiThinkingIndicator;

  const turnLabel =
    state.phase === 'playing'
      ? aiIsActive
        ? 'AI is thinking…'
        : `${state.currentPlayer === 'black' ? 'Black' : 'White'} to play`
      : state.phase === 'scoring'
        ? 'Scoring phase'
        : 'Game ended';

  return (
    <div className="game-meta">
      <p className="game-meta__move">Move {moveNumber}</p>
      <p
        className={`game-meta__turn${aiIsActive ? ' game-meta__turn--ai-thinking' : ''}`}
        aria-live={aiIsActive ? 'polite' : undefined}
      >
        {turnLabel}
      </p>
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

export function PlayerPanel({
  state,
  error,
  layout = 'sidebar',
  aiStatus = 'idle',
  showAiThinkingIndicator = false,
}: PlayerPanelProps) {
  if (layout === 'mobile-players') {
    return (
      <section className="player-panel player-panel--mobile-players" aria-label="Players">
        <PlayerCard
          color="white"
          state={state}
          emphasize={state.currentPlayer === 'white' && state.phase === 'playing'}
          aiStatus={aiStatus}
          showAiThinkingIndicator={showAiThinkingIndicator}
        />
        <PlayerCard
          color="black"
          state={state}
          emphasize={state.currentPlayer === 'black' && state.phase === 'playing'}
          aiStatus={aiStatus}
          showAiThinkingIndicator={showAiThinkingIndicator}
        />
        {error && <p className="game-error game-error--mobile-players" role="alert">{error}</p>}
      </section>
    );
  }

  if (layout === 'mobile-meta') {
    return (
      <section className="player-panel player-panel--mobile-meta" aria-label="Game status">
        <GameMeta state={state} showAiThinkingIndicator={showAiThinkingIndicator} />
        {error && <p className="game-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (layout === 'active-only') {
    return (
      <section className="player-panel player-panel--mobile-active" aria-label="Current player">
        <PlayerCard
          color={state.currentPlayer}
          state={state}
          emphasize
          aiStatus={aiStatus}
          showAiThinkingIndicator={showAiThinkingIndicator}
        />
        <GameMeta state={state} showAiThinkingIndicator={showAiThinkingIndicator} />
        {error && <p className="game-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (layout === 'opponent-only') {
    const opponentColor = state.currentPlayer === 'black' ? 'white' : 'black';
    return (
      <section className="player-panel player-panel--mobile-opponent" aria-label="Opponent">
        <PlayerCard
          color={opponentColor}
          state={state}
          emphasize={false}
          aiStatus={aiStatus}
          showAiThinkingIndicator={showAiThinkingIndicator}
        />
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
        showAiThinkingIndicator={showAiThinkingIndicator}
      />
      <PlayerCard
        color="black"
        state={state}
        emphasize={state.currentPlayer === 'black' && state.phase === 'playing'}
        aiStatus={aiStatus}
        showAiThinkingIndicator={showAiThinkingIndicator}
      />
      <GameMeta state={state} showAiThinkingIndicator={showAiThinkingIndicator} />
      {error && <p className="game-error" role="alert">{error}</p>}
    </section>
  );
}
