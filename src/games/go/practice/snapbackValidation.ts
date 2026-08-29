import { detectSnapbackConcept } from '../concepts/detectors/snapbackDetector';
import { dispatch } from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import type { GameState, Move, Position } from '../engine/types';
import {
  matchesSnapbackScript,
  readSnapbackRecaptureFromHistory,
  SNAPBACK_LOCAL_LIMITS,
} from '../tactics/snapbackLocal';
import { buildPuzzleState } from './buildState';
import type { GoPuzzle, PuzzleValidation } from './types';

export type SnapbackValidationResult =
  | { ok: true }
  | { ok: false; reason: 'legal-but-wrong' | 'wrong' };

export function validateSnapbackRecaptureMove(
  beforeState: GameState,
  afterState: GameState,
  move: Move,
  validation: Extract<PuzzleValidation, { kind: 'snapback-recapture' }>,
  player: GameState['currentPlayer'],
): SnapbackValidationResult {
  if (move.type !== 'play') {
    return { ok: false, reason: 'wrong' };
  }

  const minStones = validation.minStones ?? 2;
  if ((move.captured?.length ?? 0) < minStones) {
    return { ok: false, reason: 'legal-but-wrong' };
  }

  const historyRead = readSnapbackRecaptureFromHistory(
    afterState.history.map((entry) => entry.move),
    move,
    minStones,
  );

  if (historyRead.outcome !== 'success') {
    return { ok: false, reason: 'legal-but-wrong' };
  }

  const detected = detectSnapbackConcept({
    beforeBoard: beforeState.board,
    afterBoard: afterState.board,
    beforeState,
    afterState,
    playedMove: move,
    player,
  });

  if (!detected || detected.concept !== 'snapback') {
    return { ok: false, reason: 'legal-but-wrong' };
  }

  return { ok: true };
}

export function verifySnapbackPuzzle(puzzle: GoPuzzle): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!puzzle.snapbackScript) {
    errors.push('missing snapbackScript');
    return { ok: false, errors };
  }

  const script = puzzle.snapbackScript;
  let state = buildPuzzleState(puzzle);

  if (!isLegalPlay(state, script.recapturePoint).legal) {
    errors.push('illegal recapture setup');
  }

  const playedMoves: Array<{
    color: Move['color'];
    position: Position;
    captured: Position[];
  }> = [];

  for (const step of puzzle.solution) {
    if (step.type === 'opponent') {
      const result = dispatch(state, { type: 'play', position: step.position });
      if (!result.ok) {
        errors.push(`illegal opponent move at ${step.position.row},${step.position.col}`);
        break;
      }
      state = result.state;
      const move = result.state.history.at(-1)?.move;
      if (move?.type === 'play') {
        playedMoves.push({
          color: move.color,
          position: move.position,
          captured: move.captured ?? [],
        });
      }
      continue;
    }

    const position =
      step.validation.kind === 'exact'
        ? step.validation.position
        : step.validation.kind === 'snapback-recapture'
          ? script.recapturePoint
          : null;

    if (!position) {
      continue;
    }

    const result = dispatch(state, { type: 'play', position });
    if (!result.ok) {
      errors.push(`illegal player move at ${position.row},${position.col}`);
      break;
    }

    state = result.state;
    const move = result.state.history.at(-1)?.move;
    if (move?.type !== 'play') {
      errors.push('expected play move in solution');
      break;
    }

    playedMoves.push({
      color: move.color,
      position: move.position,
      captured: move.captured ?? [],
    });
  }

  const recapMove = state.history.at(-1)?.move;
  if (!recapMove || recapMove.type !== 'play') {
    errors.push('missing recapture move');
  } else {
    const read = readSnapbackRecaptureFromHistory(
      state.history.map((entry) => entry.move),
      recapMove,
      script.minRecaptureStones ?? 2,
    );
    if (read.outcome !== 'success') {
      errors.push('snapback detector did not confirm recapture');
    }

    const detected = detectSnapbackConcept({
      beforeBoard: state.history.at(-2)?.board ?? state.board,
      afterBoard: state.board,
      beforeState: state,
      afterState: state,
      playedMove: recapMove,
      player: recapMove.color,
    });
    if (!detected || detected.concept !== 'snapback') {
      errors.push('snapback concept detector did not match');
    }
  }

  if (playedMoves.length >= 3 && !matchesSnapbackScript(playedMoves.slice(-3), script)) {
    errors.push('played solution does not match snapbackScript');
  }

  return { ok: errors.length === 0, errors };
}

export { SNAPBACK_LOCAL_LIMITS };
