import type { AnalysisCandidate } from '../../analysis/types';
import type { Move, Position, StoneColor } from '../../engine/types';
import type { CoachInsight } from '../types';
import {
  getGroupsInAtari,
  moveIncreasesGroupLiberties,
} from '../libertyAnalysis';
import { getLibertyPositions } from '../../engine/liberties';
import type { Board } from '../../engine/types';

function candidateDefendsGroup(
  candidate: AnalysisCandidate,
  liberty: Position,
): boolean {
  return candidate.type === 'play' && candidate.position.row === liberty.row && candidate.position.col === liberty.col;
}

export function detectMissedDefense(options: {
  beforeBoard: Board;
  afterBoard: Board;
  playedMove: Move;
  nextMove: Move | null;
  player: StoneColor;
  beforeCandidates: AnalysisCandidate[];
}): CoachInsight | null {
  const { beforeBoard, afterBoard, playedMove, nextMove, player, beforeCandidates } = options;
  const atRiskGroups = getGroupsInAtari(beforeBoard, player);

  if (atRiskGroups.length === 0) {
    return null;
  }

  for (const group of atRiskGroups) {
    const liberty = getLibertyPositions(beforeBoard, group)[0];
    if (!liberty) {
      continue;
    }

    const defended =
      playedMove.type === 'play' &&
      (moveIncreasesGroupLiberties(beforeBoard, afterBoard, group, playedMove.position) ||
        (playedMove.position.row === liberty.row && playedMove.position.col === liberty.col));

    if (defended) {
      continue;
    }

    if (!nextMove || nextMove.type !== 'play') {
      continue;
    }

    const capturedKeys = new Set(
      (nextMove.captured ?? []).map((position) => `${position.row},${position.col}`),
    );
    const groupCaptured = group.stones.some((stone) =>
      capturedKeys.has(`${stone.row},${stone.col}`),
    );

    if (!groupCaptured) {
      continue;
    }

    const best = beforeCandidates[0];
    const mentionsKataGo =
      best && candidateDefendsGroup(best, liberty)
        ? ' KataGo preferred defending here.'
        : '';

    return {
      type: 'missed_defense',
      severity: 'critical',
      title: 'This group needed defending',
      explanation: `The group was already in atari. The next move allowed it to be captured.${mentionsKataGo}`,
      relatedPositions: [liberty, ...group.stones.slice(0, 3)],
      concept: 'missed_defense',
    };
  }

  return null;
}
