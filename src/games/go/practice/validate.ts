import { getStone, positionsEqual } from '../engine/board';
import { detectCutConcept } from '../concepts/detectors/cutDetector';
import type { MoveConceptContext } from '../concepts/detectors';
import {
  createLadderStartState,
  findLadderTargetsAfterMove,
  readLadder,
} from '../tactics/ladder';
import { findNetTargetsAfterMove, readNet } from '../tactics/net';
import type { GameState, Move } from '../engine/types';
import type { PuzzleValidation } from './types';
import { validatePlayStep, type PlayValidationResult } from '../tutorial/validate';
import { validateSnapbackRecaptureMove } from './snapbackValidation';

export type PuzzleValidationResult = PlayValidationResult;

function toPlayValidation(validation: PuzzleValidation) {
  if (
    validation.kind === 'cut' ||
    validation.kind === 'ladder' ||
    validation.kind === 'net' ||
    validation.kind === 'snapback-recapture' ||
    validation.kind === 'ko-recapture'
  ) {
    return null;
  }
  return validation;
}

export function validatePuzzleMove(
  beforeState: GameState,
  afterState: GameState,
  move: Move,
  validation: PuzzleValidation,
  player: GameState['currentPlayer'],
): PuzzleValidationResult {
  const basic = toPlayValidation(validation);
  if (basic) {
    return validatePlayStep(beforeState, afterState, move, basic);
  }

  if (move.type !== 'play') {
    return { ok: false, reason: 'wrong' };
  }

  switch (validation.kind) {
    case 'cut': {
      const context: MoveConceptContext = {
        beforeBoard: beforeState.board,
        afterBoard: afterState.board,
        afterState,
        beforeState,
        playedMove: move,
        player,
      };
      return detectCutConcept(context) ? { ok: true } : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'ladder': {
      const targets = findLadderTargetsAfterMove(
        beforeState.board,
        afterState.board,
        move.position,
        player,
      );
      const matching = targets.some((target) =>
        target.stones.some((stone) => positionsEqual(stone, validation.targetAnchor)),
      );
      if (!matching) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      const startState = createLadderStartState(afterState.board, afterState, player);
      const read = readLadder(startState, validation.targetAnchor, player);
      return read.outcome === 'success' || read.outcome === 'unknown'
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'net': {
      const targets = findNetTargetsAfterMove(
        beforeState.board,
        afterState.board,
        move.position,
        player,
      );
      const matching = targets.some((target) =>
        target.stones.some((stone) => positionsEqual(stone, validation.targetAnchor)),
      );
      if (!matching) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      const read = readNet(afterState, validation.targetAnchor, player);
      return read.outcome === 'success' || read.outcome === 'unknown'
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'snapback-recapture': {
      return validateSnapbackRecaptureMove(
        beforeState,
        afterState,
        move,
        validation,
        player,
      );
    }

    case 'ko-recapture': {
      if (!positionsEqual(move.position, validation.position)) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      const recaptured = move.captured.some(
        (stone) => getStone(beforeState.board, stone) === 'black',
      );
      return recaptured ? { ok: true } : { ok: false, reason: 'legal-but-wrong' };
    }

    default:
      return { ok: false, reason: 'wrong' };
  }
}

export { getIllegalMoveMessage } from '../tutorial/validate';
