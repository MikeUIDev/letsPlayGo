import { describe, expect, it } from 'vitest';
import { createEmptyBoard, withStone } from '../engine/board';
import { createInitialState } from '../engine/gameState';
import {
  detectCutConcept,
  detectHaneConcept,
  detectTigersMouthConcept,
  detectMoveConcepts,
  selectConcepts,
} from '../concepts/detectors';
import { GO_CONCEPTS } from '../concepts/concepts';
import {
  applyOffset,
  rotateOffset90,
  reflectOffsetHorizontal,
  symmetryOffsets,
} from '../concepts/patternUtils';
import type { MoveConceptContext } from '../concepts/detectors';

function playContext(options: {
  beforeBoard: ReturnType<typeof createEmptyBoard>;
  position: { row: number; col: number };
  color: 'black' | 'white';
  captured?: Array<{ row: number; col: number }>;
}): MoveConceptContext {
  const afterBoard = withStone(options.beforeBoard, options.position, options.color);
  return {
    beforeBoard: options.beforeBoard,
    afterBoard,
    afterState: createInitialState(9),
    playedMove: {
      type: 'play',
      color: options.color,
      position: options.position,
      captured: options.captured ?? [],
    },
    player: options.color,
  };
}

describe('advanced concept metadata', () => {
  it('includes Stage A concept definitions', () => {
    expect(GO_CONCEPTS.cut.name).toBe('Cut');
    expect(GO_CONCEPTS.hane.name).toBe('Hane');
    expect(GO_CONCEPTS.tigers_mouth.name).toBe("Tiger's Mouth");
  });
});

describe('cut concept detection', () => {
  it('detects a move between two separate enemy groups', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 4 }, 'white');

    const concept = detectCutConcept(
      playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
    );

    expect(concept?.concept).toBe('cut');
    expect(concept?.relatedPositions).toContainEqual({ row: 2, col: 3 });
  });

  it('detects the same cut when rotated', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 4, col: 2 }, 'white');

    const concept = detectCutConcept(
      playContext({ beforeBoard, position: { row: 3, col: 2 }, color: 'black' }),
    );

    expect(concept?.concept).toBe('cut');
  });

  it('does not label adjacent enemy stones in the same group as a cut', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'white');

    expect(
      detectCutConcept(
        playContext({ beforeBoard, position: { row: 2, col: 4 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not label a move touching only one enemy group as cut', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');

    expect(
      detectCutConcept(
        playContext({ beforeBoard, position: { row: 2, col: 4 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not label unrelated contact moves as cut', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 1 }, 'white');

    expect(
      detectCutConcept(
        playContext({ beforeBoard, position: { row: 5, col: 5 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('includes related positions for the cut and both opponent groups', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 4, col: 3 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 4, col: 5 }, 'white');

    const concept = detectCutConcept(
      playContext({ beforeBoard, position: { row: 4, col: 4 }, color: 'black' }),
    );

    expect(concept?.relatedPositions).toContainEqual({ row: 4, col: 4 });
    expect(concept?.relatedPositions).toContainEqual({ row: 4, col: 3 });
    expect(concept?.relatedPositions).toContainEqual({ row: 4, col: 5 });
  });

  it('handles edge cuts without out-of-bounds issues', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 0, col: 3 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 0, col: 5 }, 'white');

    const concept = detectCutConcept(
      playContext({ beforeBoard, position: { row: 0, col: 4 }, color: 'black' }),
    );

    expect(concept?.concept).toBe('cut');
  });

  it('keeps capture primary over cut', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 0, col: 0 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 0, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 0, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 0 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 0 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');

    const context = playContext({
      beforeBoard,
      position: { row: 1, col: 1 },
      color: 'black',
      captured: [{ row: 1, col: 0 }],
    });

    const selected = selectConcepts(detectMoveConcepts(context));
    expect(selected.primary?.concept).toBe('capture');
    expect(selected.secondary?.concept).toBe('cut');
  });
});

describe('hane concept detection', () => {
  function buildHaneBoard(played: { row: number; col: number }, friendly: { row: number; col: number }, opponent: { row: number; col: number }) {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, friendly, 'black');
    beforeBoard = withStone(beforeBoard, opponent, 'white');
    return playContext({ beforeBoard, position: played, color: 'black' });
  }

  it('detects a basic hane orientation', () => {
    const concept = detectHaneConcept(
      buildHaneBoard({ row: 2, col: 2 }, { row: 2, col: 1 }, { row: 1, col: 1 }),
    );
    expect(concept?.concept).toBe('hane');
  });

  it('detects 90° rotation', () => {
    const concept = detectHaneConcept(
      buildHaneBoard({ row: 2, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 3 }),
    );
    expect(concept?.concept).toBe('hane');
  });

  it('detects 180° rotation', () => {
    const concept = detectHaneConcept(
      buildHaneBoard({ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 3 }),
    );
    expect(concept?.concept).toBe('hane');
  });

  it('detects 270° rotation', () => {
    const concept = detectHaneConcept(
      buildHaneBoard({ row: 2, col: 2 }, { row: 3, col: 2 }, { row: 3, col: 1 }),
    );
    expect(concept?.concept).toBe('hane');
  });

  it('detects reflected hane geometry', () => {
    const concept = detectHaneConcept(
      buildHaneBoard({ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 1, col: 3 }),
    );
    expect(concept?.concept).toBe('hane');
  });

  it('does not label simple extend as hane', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');

    expect(
      detectHaneConcept(
        playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not label connect as hane', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 4 }, 'black');

    expect(
      detectHaneConcept(
        playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not label diagonal moves without friendly support as hane', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 1 }, 'white');

    expect(
      detectHaneConcept(
        playContext({ beforeBoard, position: { row: 2, col: 2 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('prioritizes atari over hane in concept selection', () => {
    const selected = selectConcepts([
      { concept: 'hane', relatedPositions: [] },
      { concept: 'atari', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('atari');
    expect(selected.secondary?.concept).toBe('hane');
  });

  it('prioritizes hane over extend when both could apply', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 1 }, 'white');

    const context = playContext({ beforeBoard, position: { row: 2, col: 2 }, color: 'black' });
    const selected = selectConcepts(detectMoveConcepts(context));

    expect(selected.primary?.concept).toBe('hane');
  });

  it('prioritizes capture over hane when both apply structurally', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');

    const context = playContext({
      beforeBoard,
      position: { row: 1, col: 2 },
      color: 'black',
      captured: [{ row: 1, col: 1 }],
    });

    const selected = selectConcepts(detectMoveConcepts(context));
    expect(selected.primary?.concept).toBe('capture');
  });
});

describe('tiger\'s mouth concept detection', () => {
  it('detects when the move creates the shape', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');

    const concept = detectTigersMouthConcept(
      playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
    );

    expect(concept?.concept).toBe('tigers_mouth');
    expect(concept?.relatedPositions).toContainEqual({ row: 2, col: 2 });
  });

  it('detects rotated tiger\'s mouth shapes', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'black');

    const concept = detectTigersMouthConcept(
      playContext({ beforeBoard, position: { row: 1, col: 2 }, color: 'black' }),
    );

    expect(concept?.concept).toBe('tigers_mouth');
  });

  it('does not detect when the mouth is occupied', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');

    expect(
      detectTigersMouthConcept(
        playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not detect with only two friendly stones', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');

    expect(
      detectTigersMouthConcept(
        playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not detect when all four surrounding points are friendly', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');

    expect(
      detectTigersMouthConcept(
        playContext({ beforeBoard, position: { row: 3, col: 2 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('does not credit a move when the shape already existed', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');

    expect(
      detectTigersMouthConcept(
        playContext({ beforeBoard, position: { row: 5, col: 5 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('intentionally skips edge and corner mouth points in V1', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 0, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 0 }, 'black');

    expect(
      detectTigersMouthConcept(
        playContext({ beforeBoard, position: { row: 0, col: 2 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('includes the mouth point in related positions', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');

    const concept = detectTigersMouthConcept(
      playContext({ beforeBoard, position: { row: 3, col: 4 }, color: 'black' }),
    );

    expect(concept?.relatedPositions).toContainEqual({ row: 3, col: 3 });
  });
});

describe('advanced concept priority', () => {
  it('prefers tiger\'s mouth over connect when the shape is completed', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 5 }, 'black');

    const context = playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' });
    const selected = selectConcepts(detectMoveConcepts(context));
    expect(selected.primary?.concept).toBe('tigers_mouth');
  });

  it('prefers cut over hane in concept selection', () => {
    const selected = selectConcepts([
      { concept: 'hane', relatedPositions: [] },
      { concept: 'cut', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('cut');
    expect(selected.secondary?.concept).toBe('hane');
  });

  it('prefers hane over extend in concept selection', () => {
    const selected = selectConcepts([
      { concept: 'extend', relatedPositions: [] },
      { concept: 'hane', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('hane');
    expect(selected.secondary?.concept).toBe('extend');
  });

  it('limits output to one primary and one secondary concept', () => {
    const selected = selectConcepts([
      { concept: 'extend', relatedPositions: [] },
      { concept: 'hane', relatedPositions: [] },
      { concept: 'cut', relatedPositions: [] },
      { concept: 'capture', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('capture');
    expect(selected.secondary?.concept).toBe('cut');
  });
});

describe('pattern utilities', () => {
  it('generates rotation and reflection offsets', () => {
    const base = { dr: 0, dc: -1 };
    const symmetries = symmetryOffsets(base);
    expect(symmetries).toContainEqual({ dr: 0, dc: -1 });
    expect(symmetries).toContainEqual(rotateOffset90(base));
    expect(symmetries).toContainEqual(reflectOffsetHorizontal(base));
    expect(applyOffset({ row: 3, col: 3 }, { dr: 0, dc: -1 })).toEqual({ row: 3, col: 2 });
  });
});
