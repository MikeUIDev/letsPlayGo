import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GO_CONCEPTS } from '../../concepts/concepts';
import { getLearnConceptUrl } from '../../learn/conceptAnchors';
import { difficultyLabel, getCategoryMeta } from '../categories';
import type { GoPuzzle, PuzzleFeedbackState } from '../types';

type PuzzlePanelProps = {
  puzzle: GoPuzzle;
  feedbackState: PuzzleFeedbackState;
  feedbackMessage: string;
  hintMessage: string | null;
  stepIndex: number;
  totalSteps: number;
  isSolved: boolean;
  actions?: ReactNode;
};

function feedbackPrefix(state: PuzzleFeedbackState): string {
  switch (state) {
    case 'correct':
      return 'Correct: ';
    case 'solved':
      return 'Solved: ';
    case 'try-again':
      return 'Try again: ';
    default:
      return '';
  }
}

export function PuzzlePanel({
  puzzle,
  feedbackState,
  feedbackMessage,
  hintMessage,
  stepIndex,
  totalSteps,
  isSolved,
  actions,
}: PuzzlePanelProps) {
  const category = getCategoryMeta(puzzle.category);
  const concept = GO_CONCEPTS[puzzle.concept];
  const stepLabel =
    totalSteps > 1 ? ` · Step ${Math.min(stepIndex + 1, totalSteps)} of ${totalSteps}` : '';

  return (
    <section className="practice-panel practice-panel--puzzle" aria-label={puzzle.title}>
      <p className="practice-panel__objective">{puzzle.objective}</p>
      <p className="practice-panel__meta">
        {category.label} · {difficultyLabel(puzzle.difficulty)}
        {stepLabel}
      </p>

      {actions ? <div className="practice-panel__actions">{actions}</div> : null}

      <div className="practice-panel__status" aria-live="polite">
        {hintMessage ? (
          <p className="practice-panel__hint" role="status">
            Hint: {hintMessage}
          </p>
        ) : null}

        {feedbackMessage ? (
          <p
            className={`practice-panel__feedback practice-panel__feedback--${feedbackState}`}
            role="status"
          >
            {feedbackPrefix(feedbackState)}
            {feedbackMessage}
          </p>
        ) : (
          <div className="practice-panel__feedback-slot" aria-hidden="true" />
        )}
      </div>

      {isSolved ? (
        <div className="practice-panel__solved">
          <p>{puzzle.explanation}</p>
          <p className="practice-panel__concept">
            <strong>{concept.name}:</strong> {concept.shortDefinition}
          </p>
          <p className="practice-panel__links">
            <Link to={getLearnConceptUrl(puzzle.concept)}>Learn more about {concept.name} →</Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
