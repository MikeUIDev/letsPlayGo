import type { TutorialFeedbackState } from '../types';

type TutorialControlsProps = {
  feedbackState: TutorialFeedbackState;
  canContinue: boolean;
  canPrevious: boolean;
  canPass: boolean;
  canHint: boolean;
  onContinue: () => void;
  onPrevious: () => void;
  onPass: () => void;
  onHint: () => void;
  onExit: () => void;
};

export function TutorialControls({
  feedbackState,
  canContinue,
  canPrevious,
  canPass,
  canHint,
  onContinue,
  onPrevious,
  onPass,
  onHint,
  onExit,
}: TutorialControlsProps) {
  const isInfoStep = feedbackState === 'idle' && canContinue;
  const showContinue = feedbackState === 'correct' || isInfoStep;

  return (
    <div className="tutorial-controls">
      <div className="tutorial-controls__primary">
        {showContinue ? (
          <button type="button" className="tutorial-controls__button tutorial-controls__button--primary" onClick={onContinue}>
            {feedbackState === 'correct' ? 'Continue' : 'Next'}
          </button>
        ) : null}
        {canPass ? (
          <button type="button" className="tutorial-controls__button" onClick={onPass}>
            Pass
          </button>
        ) : null}
        {canHint ? (
          <button type="button" className="tutorial-controls__button" onClick={onHint}>
            Show hint
          </button>
        ) : null}
      </div>
      <div className="tutorial-controls__secondary">
        {canPrevious ? (
          <button type="button" className="tutorial-controls__button tutorial-controls__button--ghost" onClick={onPrevious}>
            Previous
          </button>
        ) : null}
        <button type="button" className="tutorial-controls__button tutorial-controls__button--ghost" onClick={onExit}>
          Exit Tutorial
        </button>
      </div>
    </div>
  );
}
