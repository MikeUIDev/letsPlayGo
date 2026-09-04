import { positionToGoCoordinate } from '../coordinates';
import { getAiColor, isAiGameConfig } from '../engine/gameConfig';
import type { BoardSize, GameConfig, GameResult, GameState, HistoryEntry, StoneColor } from '../engine/types';
import type { AIStatus } from '../ai/types';

function playerLabel(color: StoneColor, config: GameConfig): string {
  if (isAiGameConfig(config)) {
    if (color === config.humanColor) {
      return 'You';
    }
    return 'AI';
  }

  return color === 'black' ? 'Black' : 'White';
}

export function formatHistoryEntryAnnouncement(
  entry: HistoryEntry,
  boardSize: BoardSize,
  config: GameConfig,
): string {
  const move = entry.move;

  if (move.type === 'resign') {
    return `${playerLabel(move.color, config)} resigned.`;
  }

  if (move.type === 'pass') {
    return `${playerLabel(move.color, config)} passed.`;
  }

  const coordinate = positionToGoCoordinate(move.position, boardSize);
  const actor = playerLabel(move.color, config);

  if (move.captured.length > 0) {
    const count = move.captured.length;
    const stones = count === 1 ? '1 stone' : `${count} stones`;
    return `${actor} played at ${coordinate} and captured ${stones}.`;
  }

  return `${actor} played at ${coordinate}.`;
}

export function formatGameResultAnnouncement(result: GameResult): string {
  if (result.reason === 'resign') {
    if (result.winner === 'black') {
      return 'Black wins by resignation.';
    }
    if (result.winner === 'white') {
      return 'White wins by resignation.';
    }
    return 'Game ended by resignation.';
  }

  if (result.winner === 'draw') {
    return `Game drawn. Score ${result.blackScore.toFixed(1)} to ${result.whiteScore.toFixed(1)}.`;
  }

  if (!result.winner) {
    return 'Game ended.';
  }

  const winner = result.winner === 'black' ? 'Black' : 'White';
  return `${winner} wins. Score ${result.blackScore.toFixed(1)} to ${result.whiteScore.toFixed(1)}.`;
}

export function formatTurnAnnouncement(state: GameState): string | null {
  if (state.phase !== 'playing') {
    return null;
  }

  const label = playerLabel(state.currentPlayer, state.config);
  if (label === 'You') {
    return 'Your turn.';
  }

  if (isAiGameConfig(state.config) && getAiColor(state.config) === state.currentPlayer) {
    return 'AI to play.';
  }

  return `${label} to play.`;
}

export type GameAnnouncement = {
  message: string;
  politeness: 'polite' | 'assertive';
};

export function buildGameAnnouncement(params: {
  previous: GameState | null;
  current: GameState;
  aiStatus: AIStatus;
  previousAiStatus: AIStatus;
  error: string | null;
  previousError: string | null;
}): GameAnnouncement | null {
  const { previous, current, aiStatus, previousAiStatus, error, previousError } = params;

  if (error && error !== previousError) {
    return { message: error, politeness: 'assertive' };
  }

  if (!previous) {
    return null;
  }

  if (previous.phase !== current.phase) {
    if (current.phase === 'scoring') {
      return { message: 'Both players passed. Mark dead stones, then confirm the score.', politeness: 'polite' };
    }

    if (current.phase === 'ended' && current.result) {
      return { message: formatGameResultAnnouncement(current.result), politeness: 'polite' };
    }
  }

  if (current.history.length > previous.history.length) {
    const entry = current.history[current.history.length - 1];
    if (entry) {
      return {
        message: formatHistoryEntryAnnouncement(entry, current.config.size, current.config),
        politeness: 'polite',
      };
    }
  }

  if (
    previous.currentPlayer !== current.currentPlayer &&
    current.phase === 'playing' &&
    current.history.length === previous.history.length
  ) {
    const turn = formatTurnAnnouncement(current);
    if (turn) {
      return { message: turn, politeness: 'polite' };
    }
  }

  if (aiStatus === 'error' && previousAiStatus !== 'error') {
    return null;
  }

  return null;
}
