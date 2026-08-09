import type { VariationMove } from '../analysis/types';
import { getStone, positionKey } from '../engine/board';
import { getGroup } from '../engine/groups';
import { countLiberties, getLibertyPositions } from '../engine/liberties';
import {
  getNearbyPlayerGroups,
  getPlayerGroups,
  isAtari,
} from '../coach/libertyAnalysis';
import type { Board, GameState, Position, StoneColor } from '../engine/types';
import { OPPONENT } from '../engine/types';
import type { StoneGroup } from '../engine/groups';
import { tryPlay } from './simulate';
import { readLadder } from './ladder';
import { TACTICAL_SEARCH_LIMITS, type NetReadResult } from './types';

function opponentLabel(color: StoneColor): string {
  return color === 'black' ? 'White' : 'Black';
}

function findGroupAnchor(board: Board, anchor: Position, color: StoneColor): StoneGroup | null {
  if (getStone(board, anchor) !== color) {
    return null;
  }

  return getGroup(board, anchor);
}

function groupExists(board: Board, anchor: Position, color: StoneColor): boolean {
  return findGroupAnchor(board, anchor, color) !== null;
}

function escapeIncreasesLiberties(
  state: GameState,
  group: StoneGroup,
  defender: StoneColor,
  escape: Position,
  minIncrease = 2,
): boolean {
  const beforeLiberties = countLiberties(state.board, group);
  const next = tryPlay(state, escape);
  if (!next) {
    return false;
  }

  const afterGroup = findGroupAnchor(next.board, group.stones[0], defender);
  if (!afterGroup) {
    return true;
  }

  return countLiberties(next.board, afterGroup) >= beforeLiberties + minIncrease;
}

function defenderEscapesWithinDepth(
  startState: GameState,
  targetAnchor: Position,
  defender: StoneColor,
  maxDepth: number,
): boolean {
  let state = startState;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!groupExists(state.board, targetAnchor, defender)) {
      return false;
    }

    const group = findGroupAnchor(state.board, targetAnchor, defender);
    if (!group) {
      return false;
    }

    if (countLiberties(state.board, group) >= 4) {
      return true;
    }

    if (state.currentPlayer !== defender) {
      return false;
    }

    const liberties = getLibertyPositions(state.board, group);
    let escaped = false;

    for (const liberty of liberties) {
      if (escapeIncreasesLiberties(state, group, defender, liberty)) {
        escaped = true;
        break;
      }
    }

    if (escaped) {
      return true;
    }

    const fallback = liberties[0];
    if (!fallback) {
      return false;
    }

    const next = tryPlay(state, fallback);
    if (!next) {
      return false;
    }

    state = next;
  }

  return false;
}

export function isRepeatedAtariSequence(sequence: VariationMove[]): boolean {
  if (sequence.length < 4) {
    return false;
  }

  let alternatingAtari = 0;
  for (let index = 2; index < sequence.length; index += 2) {
    alternatingAtari += 1;
  }

  return alternatingAtari >= 2;
}

export function findNetTargetsAfterMove(
  beforeBoard: Board,
  afterBoard: Board,
  playedPosition: Position,
  attacker: StoneColor,
): StoneGroup[] {
  const defender = OPPONENT[attacker];
  const targets: StoneGroup[] = [];
  const seen = new Set<string>();

  for (const group of getPlayerGroups(afterBoard, defender)) {
    const liberties = countLiberties(afterBoard, group);
    if (liberties < 2 || liberties > 3) {
      continue;
    }

    if (isAtari(afterBoard, group)) {
      continue;
    }

    const beforeGroup = findGroupAnchor(beforeBoard, group.stones[0], defender);
    if (!beforeGroup) {
      continue;
    }

    const beforeLiberties = countLiberties(beforeBoard, beforeGroup);
    if (beforeLiberties <= liberties) {
      continue;
    }

    const nearby = getNearbyPlayerGroups(afterBoard, defender, playedPosition);
    if (!nearby.some((candidate) => positionKey(candidate.stones[0]) === positionKey(group.stones[0]))) {
      continue;
    }

    const key = positionKey(group.stones[0]);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push(group);
  }

  return targets;
}

export function readNet(
  startState: GameState,
  targetAnchor: Position,
  attacker: StoneColor,
): NetReadResult {
  const defender = OPPONENT[attacker];
  const blockedEscapes: Position[] = [];
  const sequence: VariationMove[] = [];

  const group = findGroupAnchor(startState.board, targetAnchor, defender);
  if (!group) {
    return { outcome: 'success', blockedEscapes, sequence, searchDepth: 0 };
  }

  const liberties = getLibertyPositions(startState.board, group);
  if (liberties.length === 0) {
    return { outcome: 'failed', blockedEscapes, sequence, searchDepth: 0 };
  }

  const ladderProbe = readLadder(startState, targetAnchor, attacker);
  if (ladderProbe.outcome === 'success' && isRepeatedAtariSequence(ladderProbe.sequence)) {
    return { outcome: 'failed', blockedEscapes, sequence, searchDepth: 0 };
  }

  for (const liberty of liberties) {
    const escapeState = tryPlay(startState, liberty);
    if (!escapeState) {
      blockedEscapes.push(liberty);
      continue;
    }

    sequence.push({ color: defender, position: liberty });

    const escaped = defenderEscapesWithinDepth(
      escapeState,
      targetAnchor,
      defender,
      TACTICAL_SEARCH_LIMITS.netMaxDepth,
    );

    if (escaped) {
      return { outcome: 'failed', blockedEscapes, sequence, searchDepth: liberties.length };
    }

    blockedEscapes.push(liberty);
  }

  if (blockedEscapes.length === liberties.length && liberties.length >= 2) {
    return {
      outcome: 'success',
      blockedEscapes,
      sequence,
      searchDepth: liberties.length,
    };
  }

  return { outcome: 'unknown', blockedEscapes, sequence, searchDepth: liberties.length };
}

export function buildNetTeachingLine(attacker: StoneColor): string {
  return `This move traps the ${opponentLabel(attacker)} group in a net.`;
}

export function buildNetRelatedPositions(
  target: StoneGroup,
  playedPosition: Position,
  blockedEscapes: Position[],
): Position[] {
  const positions = [
    playedPosition,
    ...target.stones.slice(0, 3),
    ...blockedEscapes.slice(0, 2),
  ];

  const seen = new Set<string>();
  return positions.filter((position) => {
    const key = `${position.row},${position.col}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export { opponentLabel as netOpponentLabel };
