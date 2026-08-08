import { createGameFromSetup, dispatch } from '../engine/gameState';
import type { GameState } from '../engine/types';
import { parseSgfGame } from './parseSgf';
import { applyParsedResultToState, type ImportSgfResult } from './types';

/** Import SGF text by replaying moves through the engine. */
export function importSgf(text: string): ImportSgfResult {
  const parsed = parseSgfGame(text);
  if (!parsed.ok) {
    return parsed;
  }

  const { size, komi, moves, result } = parsed.data;
  if (moves.length === 0 && !result) {
    return { ok: false, error: 'empty_file' };
  }

  const firstPlayer = moves[0]?.color ?? 'black';
  let state: GameState = createGameFromSetup({
    mode: 'local',
    size,
    komi,
    firstPlayer,
  });

  for (const move of moves) {
    if (move.type === 'play') {
      const played = dispatch(state, { type: 'play', position: move.position });
      if (!played.ok) {
        return { ok: false, error: 'illegal_move' };
      }
      state = played.state;
      continue;
    }

    const passed = dispatch(state, { type: 'pass' });
    if (!passed.ok) {
      return { ok: false, error: 'illegal_move' };
    }
    state = passed.state;
  }

  if (result) {
    state = applyParsedResultToState(state, result);
  }

  return { ok: true, state };
}
