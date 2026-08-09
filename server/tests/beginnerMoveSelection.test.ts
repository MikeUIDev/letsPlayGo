import { describe, expect, it } from 'vitest';
import { BEGINNER_TUNING } from '../src/ai/beginnerConfig.js';
import {
  buildBeginnerCandidates,
  filterPassWhenBoardMovesExist,
  passesScoreCutoff,
  selectBeginnerMoveFromAnalysis,
  selectWeightedCandidate,
} from '../src/ai/beginnerMoveSelection.js';
import { selectBestMoveFromAnalysis } from '../src/katago/protocol.js';
import { KataGoClient } from '../src/katago/KataGoClient.js';
import { MockKataGoProcess } from '../src/katago/KataGoProcess.js';
import type { AnalysisResponse } from '../src/katago/protocol.js';

function sampleResponse(moveInfos: AnalysisResponse['moveInfos']): AnalysisResponse {
  return {
    id: 'move-test',
    isDuringSearch: false,
    moveInfos,
  };
}

const openingCandidates = sampleResponse([
  { move: 'E5', order: 0, scoreLead: 0.5 },
  { move: 'D5', order: 1, scoreLead: 0.3 },
  { move: 'F5', order: 2, scoreLead: 0.1 },
  { move: 'C5', order: 3, scoreLead: -0.2 },
  { move: 'E4', order: 4, scoreLead: -0.5 },
  { move: 'D4', order: 5, scoreLead: -0.8 },
]);

describe('Beginner move selection', () => {
  it('does not always choose the top candidate', () => {
    const topPick = selectBeginnerMoveFromAnalysis(openingCandidates, 9, () => 0);
    const middlePick = selectBeginnerMoveFromAnalysis(openingCandidates, 9, () => 0.4);

    expect(topPick).toEqual({ type: 'play', position: { x: 4, y: 4 } });
    expect(middlePick).not.toEqual(topPick);
    expect(middlePick.type).toBe('play');
  });

  it('keeps selection within the top eligible candidate pool', () => {
    const candidates = buildBeginnerCandidates(openingCandidates, 9);
    const filtered = filterPassWhenBoardMovesExist(candidates);
    const selected = selectWeightedCandidate(filtered, () => 0.99);

    expect(filtered.length).toBeGreaterThan(1);
    expect(filtered.some((candidate) => candidate.moveInfo.move === selected.moveInfo.move)).toBe(true);
    expect(selected.eligibleRank).toBeLessThanOrEqual(BEGINNER_TUNING.maxCandidateCount);
  });

  it('excludes candidates beyond the score-loss threshold', () => {
    const response = sampleResponse([
      { move: 'E5', order: 0, scoreLead: 2.0 },
      { move: 'D5', order: 1, scoreLead: 1.0 },
      { move: 'A1', order: 2, scoreLead: -12.0 },
    ]);

    expect(passesScoreCutoff({ move: 'A1', order: 2, scoreLead: -12.0 }, 2.0)).toBe(false);

    const candidates = buildBeginnerCandidates(response, 9);
    expect(candidates.map((candidate) => candidate.moveInfo.move)).toEqual(['E5', 'D5']);
  });

  it('can select middle ranks 2–5 via weighting', () => {
    const candidates = buildBeginnerCandidates(openingCandidates, 9);
    const filtered = filterPassWhenBoardMovesExist(candidates);

    const rank2 = selectWeightedCandidate(filtered, () => 0.15);
    const rank4 = selectWeightedCandidate(filtered, () => 0.6);

    expect(rank2.eligibleRank).toBe(2);
    expect(rank4.eligibleRank).toBe(4);
  });

  it('uses a deterministic random function for reproducible selection', () => {
    const randomFn = () => 0.15;
    const first = selectBeginnerMoveFromAnalysis(openingCandidates, 9, randomFn);
    const second = selectBeginnerMoveFromAnalysis(openingCandidates, 9, randomFn);

    expect(first).toEqual(second);
    expect(first).toEqual({ type: 'play', position: { x: 3, y: 4 } });
  });

  it('returns the only eligible candidate when the pool has one entry', () => {
    const response = sampleResponse([{ move: 'E5', order: 0, scoreLead: 1.0 }]);
    const result = selectBeginnerMoveFromAnalysis(response, 9, () => 0.99);

    expect(result).toEqual({ type: 'play', position: { x: 4, y: 4 } });
  });

  it('excludes pass when reasonable board moves exist', () => {
    const response = sampleResponse([
      { move: 'E5', order: 0, scoreLead: 1.0 },
      { move: 'D5', order: 1, scoreLead: 0.5 },
      { move: 'pass', order: 2, scoreLead: -5.0 },
    ]);

    const result = selectBeginnerMoveFromAnalysis(response, 9, () => 0.99);

    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.position).toEqual({ x: 3, y: 4 });
    }
  });

  it('allows pass when it is the only appropriate option', () => {
    const response = sampleResponse([{ move: 'pass', order: 0, scoreLead: -0.5 }]);
    const result = selectBeginnerMoveFromAnalysis(response, 9, () => 0);

    expect(result).toEqual({ type: 'pass' });
  });

  it('returns valid API-shaped play moves', () => {
    const result = selectBeginnerMoveFromAnalysis(openingCandidates, 9, () => 0.2);

    expect(result).toMatchObject({
      type: 'play',
      position: {
        x: expect.any(Number),
        y: expect.any(Number),
      },
    });
  });
});

describe('Non-beginner move selection unchanged', () => {
  it('keeps Casual selecting the strongest candidate', () => {
    const response = sampleResponse([
      { move: 'D4', order: 1, scoreLead: 0.1 },
      { move: 'E5', order: 0, scoreLead: 0.8 },
    ]);

    expect(selectBestMoveFromAnalysis(response, 9)).toEqual({
      type: 'play',
      position: { x: 4, y: 4 },
    });
  });

  it('keeps Strong selecting the strongest candidate', () => {
    const response = sampleResponse([
      { move: 'pass', order: 2 },
      { move: 'C3', order: 1, scoreLead: 0.2 },
      { move: 'D4', order: 0, scoreLead: 1.5 },
    ]);

    expect(selectBestMoveFromAnalysis(response, 9)).toEqual({
      type: 'play',
      position: { x: 3, y: 5 },
    });
  });

  it('keeps Expert selecting the strongest candidate via KataGoClient', async () => {
    const process = new MockKataGoProcess();
    process.setBestMove('D5');
    const client = new KataGoClient(process);

    const result = await client.generateMove(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'white',
        difficulty: 'expert',
        moves: [],
      },
      5_000,
    );

    expect(result).toEqual({ type: 'play', position: { x: 3, y: 4 } });
  });
});
