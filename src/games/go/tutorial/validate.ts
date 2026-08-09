import { getStone, positionsEqual } from '../engine/board';
import { getGroup } from '../engine/groups';
import { isAtari } from '../coach/libertyAnalysis';
import { countLiberties } from '../engine/liberties';
import type { GameState, Move, Position } from '../engine/types';
import type { PlayStepValidation } from './types';

function movePosition(move: Move): Position | null {
  return move.type === 'play' ? move.position : null;
}

function positionsMatchAny(position: Position, candidates: Position[]): boolean {
  return candidates.some((candidate) => positionsEqual(candidate, position));
}

export type PlayValidationResult =
  | { ok: true }
  | { ok: false; reason: 'illegal' | 'wrong' | 'legal-but-wrong' };

export function validatePlayStep(
  beforeState: GameState,
  afterState: GameState,
  move: Move,
  validation: PlayStepValidation,
): PlayValidationResult {
  const played = movePosition(move);
  if (!played) {
    return { ok: false, reason: 'wrong' };
  }

  switch (validation.kind) {
    case 'exact':
      return positionsEqual(played, validation.position)
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };

    case 'anyOf':
      return positionsMatchAny(played, validation.positions)
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };

    case 'capture': {
      if (move.type !== 'play') {
        return { ok: false, reason: 'wrong' };
      }
      const captured = move.captured.filter((stone) => getStone(beforeState.board, stone) === validation.color);
      const minStones = validation.minStones ?? 1;
      return captured.length >= minStones ? { ok: true } : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'atari': {
      const anchorGroup = getGroup(afterState.board, validation.anchor);
      if (!anchorGroup || anchorGroup.color !== validation.targetColor) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      return isAtari(afterState.board, anchorGroup) ? { ok: true } : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'groupLibertiesAtLeast': {
      const group = getGroup(afterState.board, validation.anchor);
      if (!group) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      return countLiberties(afterState.board, group) >= validation.min
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };
    }

    case 'connectsGroups': {
      const [left, right] = validation.anchors;
      const group = getGroup(afterState.board, left);
      if (!group) {
        return { ok: false, reason: 'legal-but-wrong' };
      }
      return group.stones.some((stone) => positionsEqual(stone, right))
        ? { ok: true }
        : { ok: false, reason: 'legal-but-wrong' };
    }

    default:
      return { ok: false, reason: 'wrong' };
  }
}

export function getIllegalMoveMessage(error: string): string {
  switch (error) {
    case 'ko':
      return 'That recapture would repeat the board position. Ko forbids immediate recapture — play somewhere else first.';
    case 'suicide':
      return 'That move would leave your group with no liberties. Suicide is not allowed unless you capture.';
    case 'occupied':
      return 'That intersection already has a stone.';
    case 'out_of_bounds':
      return 'That point is outside the board.';
    default:
      return 'That move is not allowed.';
  }
}
