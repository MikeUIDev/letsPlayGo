import type { GoConcept } from '../concepts/types';
import type { BoardSize, Position, StoneColor } from '../engine/types';

export type TutorialFeedbackState = 'idle' | 'correct' | 'try-again' | 'complete';

export type TutorialStone = {
  row: number;
  col: number;
  color: StoneColor;
};

export type TutorialHighlight = Position;

export type TutorialHint = {
  message: string;
  highlights?: TutorialHighlight[];
};

export type PlayStepValidation =
  | { kind: 'exact'; position: Position }
  | { kind: 'anyOf'; positions: Position[] }
  | { kind: 'capture'; color: StoneColor; minStones?: number }
  | { kind: 'atari'; targetColor: StoneColor; anchor: Position }
  | { kind: 'groupLibertiesAtLeast'; anchor: Position; min: number }
  | { kind: 'connectsGroups'; anchors: [Position, Position] };

export type TutorialStepBase = {
  id: string;
  title: string;
  body: string;
  conceptId?: GoConcept;
  learnMoreConcept?: GoConcept;
};

export type TutorialInfoStep = TutorialStepBase & {
  kind: 'info';
  stones?: TutorialStone[];
  highlights?: TutorialHighlight[];
  currentPlayer?: StoneColor;
  showTerritory?: boolean;
};

export type TutorialPlayStep = TutorialStepBase & {
  kind: 'play';
  stones: TutorialStone[];
  currentPlayer: StoneColor;
  highlights?: TutorialHighlight[];
  validation: PlayStepValidation;
  correctFeedback: string;
  wrongFeedback: string;
  legalButWrongFeedback: string;
  hints: TutorialHint[];
  /** When true, an illegal move matching illegalReason counts as success (e.g. Ko demo). */
  expectIllegal?: boolean;
  illegalReason?: 'ko' | 'suicide';
  illegalSuccessFeedback?: string;
  /** Keep board position from the previous step instead of resetting stones. */
  continueFromPrevious?: boolean;
  /** Load a curated engine state (e.g. ko demo with required history). */
  presetState?: 'ko-recapture-demo';
};

export type TutorialPassStep = TutorialStepBase & {
  kind: 'pass';
  stones: TutorialStone[];
  currentPlayer: StoneColor;
  correctFeedback: string;
  wrongFeedback: string;
  hints: TutorialHint[];
  autoOpponentPass?: boolean;
};

export type TutorialFreePlayStep = TutorialStepBase & {
  kind: 'free-play';
  size: BoardSize;
  humanColor: StoneColor;
  targetMoves?: number;
  tips?: string[];
};

export type TutorialStep =
  | TutorialInfoStep
  | TutorialPlayStep
  | TutorialPassStep
  | TutorialFreePlayStep;

export type TutorialLesson = {
  id: string;
  order: number;
  title: string;
  summary: string;
  conceptId?: GoConcept;
  steps: TutorialStep[];
};

export type TutorialCourse = {
  id: string;
  title: string;
  description: string;
  lessons: TutorialLesson[];
};

export type TutorialProgress = {
  completedLessonIds: string[];
  lastLessonId: string | null;
  lastStepIndex: number;
};
