import { Link } from 'react-router-dom';
import { getLearnConceptUrl } from '../../learn/conceptAnchors';
import { GO_CONCEPTS } from '../../concepts/concepts';
import type { GoConcept } from '../../concepts/types';
import type { TutorialFeedbackState, TutorialStep } from '../types';

type TutorialInstructionPanelProps = {
  step: TutorialStep | null;
  feedbackState: TutorialFeedbackState;
  feedbackMessage: string;
  tipMessage: string | null;
  hintMessage: string | null;
};

function tutorialFeedbackPrefix(state: TutorialFeedbackState): string {
  switch (state) {
    case 'correct':
      return '✓ ';
    case 'try-again':
      return 'Try again: ';
    default:
      return '';
  }
}

export function TutorialInstructionPanel({
  step,
  feedbackState,
  feedbackMessage,
  tipMessage,
  hintMessage,
}: TutorialInstructionPanelProps) {
  const conceptId = step?.conceptId ?? step?.learnMoreConcept;
  const concept = conceptId ? GO_CONCEPTS[conceptId as GoConcept] : null;

  return (
    <section className="tutorial-panel" aria-labelledby="tutorial-step-title">
      {step ? (
        <>
          <h2 id="tutorial-step-title" className="tutorial-panel__title">
            {step.title}
          </h2>
          <p className="tutorial-panel__body">{step.body}</p>
          {concept ? (
            <p className="tutorial-panel__concept">
              <strong>{concept.name}:</strong> {concept.shortDefinition}
            </p>
          ) : null}
          {step.learnMoreConcept ? (
            <p className="tutorial-panel__learn-more">
              <Link
                to={getLearnConceptUrl(step.learnMoreConcept)}
                className="tutorial-panel__learn-more-link"
              >
                Read more about {GO_CONCEPTS[step.learnMoreConcept].name} →
              </Link>
            </p>
          ) : null}
        </>
      ) : null}

      <div className="tutorial-panel__status" aria-live="polite">
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
          >
            {tutorialFeedbackPrefix(feedbackState)}
            {feedbackMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
