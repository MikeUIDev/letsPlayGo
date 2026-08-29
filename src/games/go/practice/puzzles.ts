import { GO_CONCEPTS } from '../concepts/concepts';
import { pos } from './buildState';
import type { GoPuzzle, PuzzleCategory, PuzzleDifficulty } from './types';

export const PRACTICE_PUZZLES: GoPuzzle[] = [
  // --- Easy (6) ---
  {
    id: 'capture-e1',
    title: 'Single Stone Capture',
    category: 'capture',
    concept: 'capture',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 3, col: 4, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 4, col: 3, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Capture the white stone in one move.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'capture', color: 'white', minStones: 1 },
        wrongFeedback: 'That move is legal, but it does not capture the group. Find the last liberty.',
      },
    ],
    hints: [
      { message: 'Count the liberties of the white stone.' },
      { message: 'White has only one liberty remaining.', highlights: [pos(4, 5)] },
      { message: 'Fill the final liberty to capture.', highlights: [pos(4, 5)] },
    ],
    explanation: GO_CONCEPTS.capture.shortDefinition,
  },
  {
    id: 'capture-e2',
    title: 'Corner Capture',
    category: 'capture',
    concept: 'capture',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 2, col: 2, color: 'white' },
      { row: 1, col: 2, color: 'black' },
      { row: 3, col: 2, color: 'black' },
      { row: 2, col: 1, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Capture the white stone near the corner.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'capture', color: 'white', minStones: 1 },
        wrongFeedback: 'Look for the white stone with only one liberty left.',
      },
    ],
    hints: [
      { message: 'Corner stones have fewer escape routes.' },
      { message: 'Play on the remaining liberty.', highlights: [pos(2, 3)] },
    ],
    explanation: 'Capturing removes stones by filling every adjacent empty point.',
  },
  {
    id: 'atari-e1',
    title: 'Put White in Atari',
    category: 'atari',
    concept: 'atari',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 3, col: 4, color: 'black' },
      { row: 5, col: 4, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Reduce the white stone to exactly one liberty.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'atari', targetColor: 'white', anchor: pos(4, 4) },
        wrongFeedback: 'That move is legal, but White still has more than one liberty.',
      },
    ],
    hints: [
      { message: 'Atari means the group has only one liberty left.' },
      { message: 'Play beside White to reduce its liberties.' },
      { message: 'Try the left side.', highlights: [pos(4, 3)] },
    ],
    explanation: GO_CONCEPTS.atari.shortDefinition,
  },
  {
    id: 'connect-e1',
    title: 'Connect the Stones',
    category: 'connect',
    concept: 'connect',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 5, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Connect the two black stones into one group.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'connectsGroups', anchors: [pos(4, 3), pos(4, 5)] },
        wrongFeedback: 'That move does not join the two black stones.',
      },
    ],
    hints: [
      { message: 'Look for the empty point between the stones.' },
      { message: 'Connect at the center.', highlights: [pos(4, 4)] },
    ],
    explanation: GO_CONCEPTS.connect.shortDefinition,
  },
  {
    id: 'save-e1',
    title: 'Escape from Atari',
    category: 'save-group',
    concept: 'missed_defense',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'black' },
      { row: 3, col: 4, color: 'white' },
      { row: 5, col: 4, color: 'white' },
      { row: 4, col: 3, color: 'white' },
    ],
    playerToMove: 'black',
    objective: 'Save the black stone by giving it more liberties.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'groupLibertiesAtLeast', anchor: pos(4, 4), min: 2 },
        wrongFeedback: 'Your group still has only one liberty. Add breathing room.',
      },
    ],
    hints: [
      { message: 'Your stone is in Atari with one liberty.' },
      { message: 'Extend to the open liberty.', highlights: [pos(4, 5)] },
    ],
    explanation: 'Adding liberties keeps a group alive when it is under attack.',
  },
  {
    id: 'cut-e1',
    title: 'Cut Apart',
    category: 'cut',
    concept: 'cut',
    difficulty: 'easy',
    boardSize: 9,
    stones: [
      { row: 3, col: 4, color: 'white' },
      { row: 5, col: 4, color: 'white' },
    ],
    playerToMove: 'black',
    objective: 'Cut between the two white stones.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'cut' },
        wrongFeedback: 'That move is legal, but it does not cut the white stones apart.',
      },
    ],
    hints: [
      { message: 'Find the point that touches both white stones.' },
      { message: 'Play between them.', highlights: [pos(4, 4)] },
    ],
    explanation: GO_CONCEPTS.cut.shortDefinition,
  },

  // --- Medium (6) ---
  {
    id: 'capture-m1',
    title: 'Capture Two Stones',
    category: 'capture',
    concept: 'capture',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 4, col: 5, color: 'white' },
      { row: 3, col: 4, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 5, col: 5, color: 'black' },
      { row: 4, col: 3, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Capture both white stones in one move.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'capture', color: 'white', minStones: 2 },
        wrongFeedback: 'Capture the connected white pair by filling their last liberty.',
      },
    ],
    hints: [
      { message: 'Both white stones share liberties as one group.' },
      { message: 'Find their last shared liberty.', highlights: [pos(4, 6)] },
    ],
    explanation: 'Connected stones are captured together when all liberties are filled.',
  },
  {
    id: 'atari-m1',
    title: 'Atari a Pair',
    category: 'atari',
    concept: 'atari',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 4, col: 5, color: 'white' },
      { row: 3, col: 4, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 5, col: 5, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Put the white pair into Atari.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'atari', targetColor: 'white', anchor: pos(4, 4) },
        wrongFeedback: 'Reduce the white group to exactly one liberty.',
      },
    ],
    hints: [
      { message: 'Attack where the white stones are weakest.' },
      { message: 'Play on an open side of the group.' },
      { message: 'Fill one of the two remaining liberties.', highlights: [pos(4, 3)] },
    ],
    explanation: 'A group in Atari can be captured on the next move if it cannot escape.',
  },
  {
    id: 'save-m1',
    title: 'Rescue the Group',
    category: 'save-group',
    concept: 'missed_defense',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'black' },
      { row: 4, col: 5, color: 'black' },
      { row: 3, col: 4, color: 'white' },
      { row: 5, col: 4, color: 'white' },
      { row: 4, col: 3, color: 'white' },
    ],
    playerToMove: 'black',
    objective: 'Save the black pair from capture.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'groupLibertiesAtLeast', anchor: pos(4, 4), min: 2 },
        wrongFeedback: 'The black group still has only one liberty.',
      },
    ],
    hints: [
      { message: 'Extend or connect to increase liberties.' },
      { message: 'Try the open liberty on the right.', highlights: [pos(4, 6)] },
    ],
    explanation: 'Groups with more liberties are harder to capture.',
  },
  {
    id: 'connect-m1',
    title: 'Connect Under Pressure',
    category: 'connect',
    concept: 'connect',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 5, color: 'black' },
      { row: 3, col: 4, color: 'white' },
      { row: 5, col: 4, color: 'white' },
    ],
    playerToMove: 'black',
    objective: 'Connect your stones before White can exploit the gap.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'connectsGroups', anchors: [pos(4, 3), pos(4, 5)] },
        wrongFeedback: 'Join the two black stones into one group.',
      },
    ],
    hints: [
      { message: 'Shared liberties make a group stronger.' },
      { message: 'Play between your stones.', highlights: [pos(4, 4)] },
    ],
    explanation: GO_CONCEPTS.connect.shortDefinition,
  },
  {
    id: 'ladder-m1',
    title: 'Start the Ladder',
    category: 'ladder',
    concept: 'ladder',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 0, col: 4, color: 'white' },
      { row: 1, col: 4, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Start a forcing ladder against the white stone.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'ladder', targetAnchor: pos(0, 4) },
        wrongFeedback: 'That move is legal, but it does not start a working ladder.',
      },
    ],
    hints: [
      { message: 'A ladder uses repeated Atari to chase a group.' },
      { message: 'Play to put White in Atari along the edge.', highlights: [pos(0, 3)] },
    ],
    explanation: GO_CONCEPTS.ladder.description ?? GO_CONCEPTS.ladder.shortDefinition,
  },
  {
    id: 'net-m1',
    title: 'Cast the Net',
    category: 'net',
    concept: 'net',
    difficulty: 'medium',
    boardSize: 9,
    stones: [
      { row: 0, col: 1, color: 'white' },
      { row: 0, col: 3, color: 'black' },
      { row: 0, col: 4, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Trap the white stone in a net.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'net', targetAnchor: pos(0, 1) },
        wrongFeedback: 'That move is legal, but it does not trap the white group.',
      },
    ],
    hints: [
      { message: 'A net blocks escape routes without a long Atari chase.' },
      { message: 'Play beside the white stone to block its escape.', highlights: [pos(1, 1)] },
    ],
    explanation: GO_CONCEPTS.net.shortDefinition,
  },

  // --- Hard (6) ---
  {
    id: 'snapback-h1',
    title: 'Snapback Recapture',
    category: 'snapback',
    concept: 'snapback',
    difficulty: 'hard',
    boardSize: 9,
    presetState: 'snapback-recapture-demo',
    stones: [],
    playerToMove: 'black',
    objective:
      'White captured your sacrifice stone. Recapture at the same point to take a larger group.',
    snapbackScript: {
      sacrificePoint: pos(2, 2),
      opponentCapturePoint: pos(2, 2),
      recapturePoint: pos(2, 2),
      minRecaptureStones: 2,
    },
    solution: [
      {
        type: 'play',
        validation: { kind: 'snapback-recapture', minStones: 2 },
        wrongFeedback: 'Recapture at the snapback point to take more than you gave up.',
      },
    ],
    hints: [
      { message: 'White just captured your single stone.' },
      { message: 'Playing back on the same point can capture a larger group.' },
      { message: 'Recapture here.', highlights: [pos(2, 2)] },
    ],
    explanation: GO_CONCEPTS.snapback.shortDefinition,
  },
  {
    id: 'ko-h1',
    title: 'Ko Timing',
    category: 'ko',
    concept: 'ko',
    difficulty: 'hard',
    boardSize: 9,
    presetState: 'ko-recapture-demo',
    stones: [],
    playerToMove: 'white',
    objective: 'Play elsewhere first, then recapture when Ko allows it.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'exact', position: pos(0, 0) },
        wrongFeedback: 'Immediate recapture is forbidden. Play elsewhere first.',
      },
      { type: 'opponent', position: pos(0, 1) },
      {
        type: 'play',
        validation: { kind: 'ko-recapture', position: pos(7, 7) },
        wrongFeedback: 'Now the recapture is legal. Take back at the ko point.',
      },
    ],
    hints: [
      { message: 'Ko forbids immediate recapture.' },
      { message: 'Play a move elsewhere on the board.', highlights: [pos(0, 0)] },
      { message: 'After Black responds, recapture at the marked point.', highlights: [pos(7, 7)] },
    ],
    explanation: GO_CONCEPTS.ko.shortDefinition,
  },
  {
    id: 'ladder-h1',
    title: 'Edge Ladder',
    category: 'ladder',
    concept: 'ladder',
    difficulty: 'hard',
    boardSize: 9,
    stones: [
      { row: 8, col: 4, color: 'white' },
      { row: 7, col: 4, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Start a ladder that works along the edge.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'ladder', targetAnchor: pos(8, 4) },
        wrongFeedback: 'That move does not start a successful ladder along the edge.',
      },
    ],
    hints: [
      { message: 'Edge ladders follow a predictable zig-zag path.' },
      { message: 'Put White in Atari toward the edge.', highlights: [pos(8, 3)] },
    ],
    explanation: 'If the ladder reaches the edge without a breaker, the group is captured.',
  },
  {
    id: 'cut-h1',
    title: 'Cut and Separate',
    category: 'cut',
    concept: 'cut',
    difficulty: 'hard',
    boardSize: 9,
    stones: [
      { row: 3, col: 3, color: 'white' },
      { row: 3, col: 5, color: 'white' },
      { row: 2, col: 4, color: 'black' },
      { row: 4, col: 4, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Cut the white stones apart.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'cut' },
        wrongFeedback: 'Separate the two white groups with a cutting move.',
      },
    ],
    hints: [
      { message: 'Look for a point adjacent to both white stones.' },
      { message: 'Cut between them.', highlights: [pos(3, 4)] },
    ],
    explanation: GO_CONCEPTS.cut.shortDefinition,
  },
  {
    id: 'save-h1',
    title: 'Double Atari Escape',
    category: 'save-group',
    concept: 'missed_defense',
    difficulty: 'hard',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'black' },
      { row: 3, col: 3, color: 'white' },
      { row: 3, col: 5, color: 'white' },
      { row: 5, col: 4, color: 'white' },
    ],
    playerToMove: 'black',
    objective: 'Save the black stone with the best escape.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'groupLibertiesAtLeast', anchor: pos(4, 4), min: 2 },
        wrongFeedback: 'Find a move that gives the black stone at least two liberties.',
      },
    ],
    hints: [
      { message: 'Multiple moves may work. Look for the most liberties.' },
      { message: 'Extend to an open point beside the stone.' },
    ],
    explanation: 'When attacked, increasing liberties is often the correct defense.',
  },
  {
    id: 'capture-h1',
    title: 'Capture with Support',
    category: 'capture',
    concept: 'capture',
    difficulty: 'hard',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 4, col: 5, color: 'white' },
      { row: 3, col: 4, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 4, col: 3, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 5, color: 'black' },
    ],
    playerToMove: 'black',
    objective: 'Capture the white pair in one move.',
    solution: [
      {
        type: 'play',
        validation: { kind: 'capture', color: 'white', minStones: 2 },
        wrongFeedback: 'Fill the last liberty shared by both white stones.',
      },
    ],
    hints: [
      { message: 'The white stones share one remaining liberty.' },
      { message: 'Capture at the shared liberty.', highlights: [pos(4, 6)] },
    ],
    explanation: GO_CONCEPTS.capture.shortDefinition,
  },
];

export function getPuzzleById(id: string): GoPuzzle | undefined {
  return PRACTICE_PUZZLES.find((puzzle) => puzzle.id === id);
}

export function getPuzzlesByCategory(category: PuzzleCategory): GoPuzzle[] {
  return PRACTICE_PUZZLES.filter((puzzle) => puzzle.category === category);
}

export function getPuzzlesByDifficulty(difficulty: PuzzleDifficulty): GoPuzzle[] {
  return PRACTICE_PUZZLES.filter((puzzle) => puzzle.difficulty === difficulty);
}

export function getNextUnsolvedPuzzle(
  solvedIds: string[],
  category?: PuzzleCategory,
): GoPuzzle | null {
  const pool = category ? getPuzzlesByCategory(category) : PRACTICE_PUZZLES;
  const sorted = [...pool].sort((left, right) => {
    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
    return difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty];
  });

  return sorted.find((puzzle) => !solvedIds.includes(puzzle.id)) ?? null;
}

export function getNextPuzzleAfter(currentId: string, solvedIds: string[]): GoPuzzle | null {
  const current = getPuzzleById(currentId);
  if (!current) {
    return null;
  }

  const categoryPuzzles = getPuzzlesByCategory(current.category).sort((left, right) => {
    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
    return difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty];
  });

  const currentIndex = categoryPuzzles.findIndex((puzzle) => puzzle.id === currentId);
  for (let index = currentIndex + 1; index < categoryPuzzles.length; index += 1) {
    const candidate = categoryPuzzles[index];
    if (!solvedIds.includes(candidate.id)) {
      return candidate;
    }
  }

  return getNextUnsolvedPuzzle(solvedIds, current.category);
}
