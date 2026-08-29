import { formatAiDifficultyLabel } from '../engine/aiDifficulty';
import { isAiGameConfig } from '../engine/gameConfig';
import type { GameState } from '../engine/types';
import { formatBoardSize } from '../utils/coordinates';

export interface SavedGameSummary {
  boardSizeLabel: string;
  modeLabel: string;
  statusLabel: string;
  moveNumber: number;
  komi: number;
  capturesLabel: string;
}

export function buildSavedGameSummary(state: GameState): SavedGameSummary {
  const boardSizeLabel = formatBoardSize(state.config.size);
  const modeLabel =
    isAiGameConfig(state.config)
      ? `vs AI · ${formatAiDifficultyLabel(state.config.difficulty)}`
      : 'Local game';

  let statusLabel: string;
  if (state.phase === 'scoring') {
    statusLabel = 'Scoring';
  } else if (state.phase === 'ended') {
    statusLabel = 'Game finished';
  } else {
    const turn = state.currentPlayer === 'black' ? 'Black' : 'White';
    statusLabel = `${turn} to play`;
  }

  const capturesLabel = `Captures ${state.captures.black}B / ${state.captures.white}W`;

  return {
    boardSizeLabel,
    modeLabel,
    statusLabel,
    moveNumber: state.history.length,
    komi: state.config.komi,
    capturesLabel,
  };
}
