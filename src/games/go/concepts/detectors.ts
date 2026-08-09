import { getNeighbors, getStone, positionKey } from '../engine/board';
import { getGroup, type StoneGroup } from '../engine/groups';
import { countLiberties, getLibertyPositions } from '../engine/liberties';
import { violatesKo } from '../engine/ko';
import type { Board, GameState, Move, Position, StoneColor } from '../engine/types';
import { OPPONENT } from '../engine/types';
import {
  getCaptureCountForPlayer,
  getPlayerGroups,
  isAtari,
} from '../coach/libertyAnalysis';
import { detectCutConcept } from './detectors/cutDetector';
import { detectHaneConcept } from './detectors/haneDetector';
import { detectLadderConcept } from './detectors/ladderDetector';
import { detectNetConcept } from './detectors/netDetector';
import { detectSnapbackConcept } from './detectors/snapbackDetector';
import { detectTigersMouthConcept } from './detectors/tigersMouthDetector';
import type { DetectedConcept, GoConcept } from './types';
import { CONCEPT_PRIORITY, MAX_VISIBLE_CONCEPTS } from './types';

export { detectCutConcept } from './detectors/cutDetector';
export { detectHaneConcept, getHanePatternOrientations } from './detectors/haneDetector';
export { detectLadderConcept } from './detectors/ladderDetector';
export { detectNetConcept } from './detectors/netDetector';
export { detectSnapbackConcept } from './detectors/snapbackDetector';
export { detectTigersMouthConcept, isTigersMouthShape } from './detectors/tigersMouthDetector';

export type MoveConceptContext = {
  beforeBoard: Board;
  afterBoard: Board;
  afterState: GameState;
  beforeState?: GameState;
  playedMove: Move;
  player: StoneColor;
  nextMove?: Move | null;
};

function opponentLabel(player: StoneColor): string {
  return player === 'black' ? 'White' : 'Black';
}

function playerLabel(player: StoneColor): string {
  return player === 'black' ? 'Black' : 'White';
}

function getAdjacentFriendlyGroups(
  board: Board,
  position: Position,
  color: StoneColor,
): StoneGroup[] {
  const groups: StoneGroup[] = [];
  const seen = new Set<string>();

  for (const neighbor of getNeighbors(board, position)) {
    if (getStone(board, neighbor) !== color) {
      continue;
    }

    const group = getGroup(board, neighbor);
    if (!group) {
      continue;
    }

    const key = positionKey(group.stones[0]);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    groups.push(group);
  }

  return groups;
}

function groupExistedBefore(beforeBoard: Board, group: StoneGroup): StoneGroup | null {
  const anchor = group.stones[0];
  if (getStone(beforeBoard, anchor) !== group.color) {
    return null;
  }

  return getGroup(beforeBoard, anchor);
}

export function detectCaptureConcept(context: MoveConceptContext): DetectedConcept | null {
  const { playedMove, player } = context;
  const stoneCount = getCaptureCountForPlayer(playedMove, player);

  if (stoneCount <= 0) {
    return null;
  }

  const opponent = opponentLabel(player);
  const stoneWord = stoneCount === 1 ? 'stone' : 'stones';

  return {
    concept: 'capture',
    relatedPositions: playedMove.type === 'play' ? (playedMove.captured ?? []) : [],
    metadata: { stoneCount, opponentColor: OPPONENT[player] },
    teachingLine: `This move captures ${stoneCount} ${opponent} ${stoneWord}.`,
  };
}

export function detectKoConcept(context: MoveConceptContext): DetectedConcept | null {
  const { afterState, playedMove } = context;

  if (playedMove.type !== 'play' || (playedMove.captured?.length ?? 0) === 0) {
    return null;
  }

  const { board } = afterState;
  const koPoints: Position[] = [];

  for (let row = 0; row < board.size; row += 1) {
    for (let col = 0; col < board.size; col += 1) {
      const position = { row, col };
      if (getStone(board, position) !== null) {
        continue;
      }

      if (violatesKo(afterState, position)) {
        koPoints.push(position);
      }
    }
  }

  if (koPoints.length === 0) {
    return null;
  }

  return {
    concept: 'ko',
    relatedPositions: [...koPoints, playedMove.position, ...(playedMove.captured ?? [])],
    teachingLine: 'This capture creates a ko.',
  };
}

export function detectAtariConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const opponent = OPPONENT[player];
  const threatened: Position[] = [];
  let liberty: Position | null = null;

  for (const group of getPlayerGroups(afterBoard, opponent)) {
    if (!isAtari(afterBoard, group)) {
      continue;
    }

    const beforeGroup = groupExistedBefore(beforeBoard, group);
    if (!beforeGroup || isAtari(beforeBoard, beforeGroup)) {
      continue;
    }

    threatened.push(...group.stones.slice(0, 4));
    liberty = getLibertyPositions(afterBoard, group)[0] ?? liberty;
  }

  if (threatened.length === 0 || !liberty) {
    return null;
  }

  return {
    concept: 'atari',
    relatedPositions: [...threatened, liberty],
    metadata: { libertyCount: 1, opponentColor: opponent },
    teachingLine: `This move puts the ${opponentLabel(player)} group in atari.`,
  };
}

export function detectSelfAtariConcept(context: MoveConceptContext): DetectedConcept | null {
  const { afterBoard, playedMove } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  if (getCaptureCountForPlayer(playedMove, playedMove.color) > 0) {
    return null;
  }

  const group = getGroup(afterBoard, playedMove.position);
  if (!group || !isAtari(afterBoard, group)) {
    return null;
  }

  const liberty = getLibertyPositions(afterBoard, group)[0];

  return {
    concept: 'self_atari',
    relatedPositions: liberty ? [...group.stones.slice(0, 4), liberty] : group.stones.slice(0, 4),
    metadata: { libertyCount: 1 },
    teachingLine: 'This move leaves your group with only one liberty.',
  };
}

export function detectConnectConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const adjacentGroups = getAdjacentFriendlyGroups(beforeBoard, playedMove.position, player);
  if (adjacentGroups.length < 2) {
    return null;
  }

  const relatedPositions = [
    playedMove.position,
    ...adjacentGroups.flatMap((group) => group.stones.slice(0, 2)),
  ];

  return {
    concept: 'connect',
    relatedPositions,
    metadata: { groupCount: adjacentGroups.length },
    teachingLine: `This move joins ${adjacentGroups.length} ${playerLabel(player)} groups.`,
  };
}

export function detectExtendConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  if (getCaptureCountForPlayer(playedMove, player) > 0) {
    return null;
  }

  const adjacentBefore = getAdjacentFriendlyGroups(beforeBoard, playedMove.position, player);
  if (adjacentBefore.length !== 1) {
    return null;
  }

  const anchor = adjacentBefore[0].stones[0];
  const beforeGroup = getGroup(beforeBoard, anchor);
  const afterGroup = getGroup(afterBoard, playedMove.position);

  if (!beforeGroup || !afterGroup) {
    return null;
  }

  const libertiesBefore = countLiberties(beforeBoard, beforeGroup);
  const libertiesAfter = countLiberties(afterBoard, afterGroup);

  if (libertiesAfter <= libertiesBefore) {
    return null;
  }

  return {
    concept: 'extend',
    relatedPositions: [playedMove.position, ...afterGroup.stones.slice(0, 3)],
    metadata: { libertyCount: libertiesAfter },
    teachingLine: 'This move extends your group and gives it more room.',
  };
}

export function detectMoveConcepts(context: MoveConceptContext): DetectedConcept[] {
  const concepts: DetectedConcept[] = [];

  const ko = detectKoConcept(context);
  if (ko) {
    concepts.push(ko);
  }

  const capture = detectCaptureConcept(context);
  if (capture) {
    concepts.push(capture);
  }

  const snapback = detectSnapbackConcept(context);
  if (snapback) {
    concepts.push(snapback);
  }

  const ladder = detectLadderConcept(context);
  if (ladder) {
    concepts.push(ladder);
  }

  const net = detectNetConcept(context);
  if (net) {
    concepts.push(net);
  }

  const atari = detectAtariConcept(context);
  if (atari) {
    concepts.push(atari);
  }

  const selfAtari = detectSelfAtariConcept(context);
  if (selfAtari) {
    concepts.push(selfAtari);
  }

  const connect = detectConnectConcept(context);
  if (connect) {
    concepts.push(connect);
  }

  const cut = detectCutConcept(context);
  if (cut) {
    concepts.push(cut);
  }

  const hane = detectHaneConcept(context);
  if (hane) {
    concepts.push(hane);
  }

  const tigersMouth = detectTigersMouthConcept(context);
  if (tigersMouth) {
    concepts.push(tigersMouth);
  }

  const extend = detectExtendConcept(context);
  if (extend) {
    concepts.push(extend);
  }

  return concepts;
}

export function conceptFromInsightType(
  insightType: string,
): DetectedConcept['concept'] | undefined {
  switch (insightType) {
    case 'missed_capture':
      return 'missed_capture';
    case 'missed_defense':
      return 'missed_defense';
    case 'self_atari':
      return 'self_atari';
    case 'left_group_in_atari':
      return 'atari';
    default:
      return undefined;
  }
}

export function rankConcepts(concepts: DetectedConcept[]): DetectedConcept[] {
  return [...concepts].sort(
    (left, right) => CONCEPT_PRIORITY[left.concept] - CONCEPT_PRIORITY[right.concept],
  );
}

export function selectConcepts(concepts: DetectedConcept[]): {
  primary: DetectedConcept | null;
  secondary: DetectedConcept | null;
} {
  const ranked = rankConcepts(concepts);
  const primary = ranked[0] ?? null;
  const secondary = ranked.find((concept) => concept.concept !== primary?.concept) ?? null;

  return { primary, secondary };
}

export function getTopConcepts(concepts: DetectedConcept[]): DetectedConcept[] {
  return rankConcepts(concepts).slice(0, MAX_VISIBLE_CONCEPTS);
}

export function mergeConceptSources(
  detected: DetectedConcept[],
  insightConcepts: DetectedConcept[],
): DetectedConcept[] {
  const merged = new Map<GoConcept, DetectedConcept>();

  for (const concept of [...detected, ...insightConcepts]) {
    const existing = merged.get(concept.concept);
    if (!existing || (concept.teachingLine && !existing.teachingLine)) {
      merged.set(concept.concept, concept);
    }
  }

  return [...merged.values()];
}
