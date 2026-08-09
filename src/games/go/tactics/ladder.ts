import type { VariationMove } from '../analysis/types';
import { getNeighbors, getStone, positionKey, positionsEqual } from '../engine/board';
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
import { createSimulationState, tryPlay } from './simulate';
import { TACTICAL_SEARCH_LIMITS, type LadderReadResult } from './types';

function opponentLabel(color: StoneColor): string {
  return color === 'black' ? 'White' : 'Black';
}

function findGroupByAnchor(board: Board, anchor: Position, color: StoneColor): StoneGroup | null {
  if (getStone(board, anchor) !== color) {
    return null;
  }

  return getGroup(board, anchor);
}

function groupStillExists(board: Board, anchor: Position, color: StoneColor): boolean {
  return findGroupByAnchor(board, anchor, color) !== null;
}

function hasObviousLadderBreaker(board: Board, group: StoneGroup, defender: StoneColor): boolean {
  for (const liberty of getLibertyPositions(board, group)) {
    for (const neighbor of getNeighbors(board, liberty)) {
      if (getStone(board, neighbor) !== defender) {
        continue;
      }

      const friendly = getGroup(board, neighbor);
      if (!friendly || positionsEqual(friendly.stones[0], group.stones[0])) {
        continue;
      }

      if (countLiberties(board, friendly) >= 3) {
        return true;
      }
    }
  }

  return false;
}

function getDefenderEscapeMoves(
  state: GameState,
  group: StoneGroup,
  defender: StoneColor,
): Position[] {
  const escapes: Position[] = [];

  for (const liberty of getLibertyPositions(state.board, group)) {
    const next = tryPlay(state, liberty);
    if (!next) {
      continue;
    }

    const anchor = group.stones[0];
    const afterGroup = findGroupByAnchor(next.board, anchor, defender);
    if (!afterGroup) {
      continue;
    }

    if (countLiberties(next.board, afterGroup) > countLiberties(state.board, group)) {
      escapes.push(liberty);
    }
  }

  return escapes;
}

function getAttackerAtariMoves(
  state: GameState,
  group: StoneGroup,
  attacker: StoneColor,
): Position[] {
  const atariMoves: Position[] = [];

  for (const liberty of getLibertyPositions(state.board, group)) {
    const next = tryPlay(state, liberty);
    if (!next) {
      continue;
    }

    const anchor = group.stones[0];
    const afterGroup = findGroupByAnchor(next.board, anchor, OPPONENT[attacker]);
    if (afterGroup && isAtari(next.board, afterGroup)) {
      atariMoves.push(liberty);
    }
  }

  return atariMoves;
}

function pickBestDefenderEscape(
  state: GameState,
  group: StoneGroup,
  defender: StoneColor,
  escapes: Position[],
): Position | null {
  let best: { position: Position; liberties: number } | null = null;

  for (const escape of escapes) {
    const next = tryPlay(state, escape);
    if (!next) {
      continue;
    }

    const afterGroup = findGroupByAnchor(next.board, group.stones[0], defender);
    if (!afterGroup) {
      continue;
    }

    const liberties = countLiberties(next.board, afterGroup);
    if (!best || liberties < best.liberties) {
      best = { position: escape, liberties };
    }
  }

  return best?.position ?? escapes[0] ?? null;
}

function pickBestAttackerAtari(
  state: GameState,
  group: StoneGroup,
  attacker: StoneColor,
  atariMoves: Position[],
): Position | null {
  let best: { position: Position; liberties: number } | null = null;

  for (const move of atariMoves) {
    const next = tryPlay(state, move);
    if (!next) {
      continue;
    }

    const afterGroup = findGroupByAnchor(next.board, group.stones[0], OPPONENT[attacker]);
    if (!afterGroup) {
      return move;
    }

    const liberties = countLiberties(next.board, afterGroup);
    if (!best || liberties < best.liberties) {
      best = { position: move, liberties };
    }
  }

  return best?.position ?? atariMoves[0] ?? null;
}

export function readLadder(
  startState: GameState,
  targetAnchor: Position,
  attacker: StoneColor,
): LadderReadResult {
  const defender = OPPONENT[attacker];
  let state = startState;
  const path: Position[] = [];
  const sequence: VariationMove[] = [];
  let atariCount = 0;

  for (let depth = 0; depth < TACTICAL_SEARCH_LIMITS.ladderMaxDepth; depth += 1) {
    if (!groupStillExists(state.board, targetAnchor, defender)) {
      return { outcome: 'success', path, sequence, searchDepth: depth };
    }

    const group = findGroupByAnchor(state.board, targetAnchor, defender);
    if (!group) {
      return { outcome: 'success', path, sequence, searchDepth: depth };
    }

    const liberties = countLiberties(state.board, group);
    if (liberties === 0) {
      return { outcome: 'success', path, sequence, searchDepth: depth };
    }

    if (liberties >= 3) {
      return { outcome: 'failed', path, sequence, searchDepth: depth };
    }

    if (hasObviousLadderBreaker(state.board, group, defender)) {
      return { outcome: 'failed', path, sequence, searchDepth: depth };
    }

    if (state.currentPlayer === defender) {
      const escapes = getDefenderEscapeMoves(state, group, defender);
      if (escapes.length === 0) {
        return { outcome: 'success', path, sequence, searchDepth: depth };
      }

      const escape = pickBestDefenderEscape(state, group, defender, escapes);
      if (!escape) {
        return { outcome: 'unknown', path, sequence, searchDepth: depth };
      }

      const next = tryPlay(state, escape);
      if (!next) {
        return { outcome: 'success', path, sequence, searchDepth: depth };
      }

      state = next;
      path.push(escape);
      sequence.push({ color: defender, position: escape });
      continue;
    }

    const atariMoves = getAttackerAtariMoves(state, group, attacker);
    if (atariMoves.length === 0) {
      if (isAtari(state.board, group)) {
        return { outcome: 'success', path, sequence, searchDepth: depth };
      }

      return { outcome: 'failed', path, sequence, searchDepth: depth };
    }

    const atariMove = pickBestAttackerAtari(state, group, attacker, atariMoves);
    if (!atariMove) {
      return { outcome: 'unknown', path, sequence, searchDepth: depth };
    }

    const next = tryPlay(state, atariMove);
    if (!next) {
      return { outcome: 'failed', path, sequence, searchDepth: depth };
    }

    state = next;
    path.push(atariMove);
    sequence.push({ color: attacker, position: atariMove });
    atariCount += 1;
  }

  return { outcome: 'unknown', path, sequence, searchDepth: TACTICAL_SEARCH_LIMITS.ladderMaxDepth };
}

export function isPlausibleLadderTarget(
  board: Board,
  group: StoneGroup,
  playedPosition: Position,
  attacker: StoneColor,
): boolean {
  if (group.color !== OPPONENT[attacker]) {
    return false;
  }

  const liberties = countLiberties(board, group);
  if (liberties > 2) {
    return false;
  }

  return (
    group.stones.some((stone) => positionsEqual(stone, playedPosition)) ||
    getNearbyPlayerGroups(board, group.color, playedPosition).some(
      (nearby) => positionKey(nearby.stones[0]) === positionKey(group.stones[0]),
    )
  );
}

export function findLadderTargetsAfterMove(
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
    if (liberties > 2) {
      continue;
    }

    const beforeGroup = findGroupByAnchor(beforeBoard, group.stones[0], defender);
    if (!beforeGroup) {
      continue;
    }

    const beforeLiberties = countLiberties(beforeBoard, beforeGroup);
    if (beforeLiberties <= liberties) {
      continue;
    }

    if (!isPlausibleLadderTarget(afterBoard, group, playedPosition, attacker)) {
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

export function buildLadderTeachingLine(
  attacker: StoneColor,
  startedByMove: boolean,
  successful: boolean,
): string {
  const opponent = opponentLabel(attacker);
  if (startedByMove && successful) {
    return `This move starts a ladder against the ${opponent} group.`;
  }

  if (successful) {
    return `This sequence chases the ${opponent} group in a ladder.`;
  }

  return `This move lets ${attacker === 'black' ? 'Black' : 'White'} chase this group in a ladder.`;
}

export function limitLadderPath(path: Position[], maxPoints = 5): Position[] {
  return path.slice(0, maxPoints);
}

export function createLadderStartState(
  afterBoard: Board,
  afterState: GameState,
  attacker: StoneColor,
): GameState {
  return createSimulationState(afterBoard, OPPONENT[attacker], afterState.config);
}

export { opponentLabel as ladderOpponentLabel };
