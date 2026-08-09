import { Link } from 'react-router-dom';
import { getLearnConceptUrl } from '../../learn/conceptAnchors';
import { GO_CONCEPTS } from '../../concepts/concepts';
import type { GoConcept } from '../../concepts/types';
import type { TutorialFeedbackState, TutorialStep } from '../types';

type TutorialInstructionPanelProps = {
  step: TutorialStep | null;
  lessonTitle: string;
  lessonNumber: number;
  totalLessons: number;
  feedbackState: TutorialFeedbackState;
  feedbackMessage: string;
  tipMessage: string | null;
  hintMessage: string | null;
};

export function TutorialInstructionPanel({
  step,
  lessonTitle,
  lessonNumber,
  totalLessons,
  feedbackState,
  feedbackMessage,
  tipMessage,
  hintMessage,
}: TutorialInstructionPanelProps) {
  const conceptId = step?.conceptId ?? step?.learnMoreConcept;
  const concept = conceptId ? GO_CONCEPTS[conceptId as GoConcept] : null;

  return (
    <section className="tutorial-panel" aria-labelledby="tutorial-step-title">
      <p className="tutorial-panel__progress">
        Lesson {lessonNumber} of {totalLessons}
      </p>
      <h2 id="tutorial-step-title" className="tutorial-panel__lesson">
        {lessonTitle}
      </h2>
      {step ? (
        <>
          <h3 className="tutorial-panel__title">{step.title}</h3>
          <p className="tutorial-panel__body">{step.body}</p>
          {concept ? (
            <p className="tutorial-panel__concept">
              <strong>{concept.name}:</strong> {concept.shortDefinition}
            </p>
          ) : null}
          {step.learnMoreConcept ? (
            <p className="tutorial-panel__learn-more">
              <Link to={getLearnConceptUrl(step.learnMoreConcept)}>
                Read more about {GO_CONCEPTS[step.learnMoreConcept].name} →
              </Link>
            </p>
          ) : null}
        </>
      ) : null}

      {tipMessage ? (
        <p className="tutorial-panel__tip" role="status">
          {tipMessage}
        </p>
      ) : null}

      {hintMessage ? (
        <p className="tutorial-panel__hint" role="status">
          Hint: {hintMessage}
        </p>
      ) : null}

      {feedbackMessage ? (
        <p
          className={`tutorial-panel__feedback tutorial-panel__feedback--${feedbackState}`}
          role="status"
          aria-live="polite"
        >
          {feedbackState === 'correct' ? '✓ ' : ''}
          {feedbackMessage}
        </p>
      ) : null}
    </section>
  );
}
