import type { TutorialFeedbackState } from '../types';
import { useActionCooldown } from '../useActionCooldown';

type TutorialControlsProps = {
  feedbackState: TutorialFeedbackState;
  canContinue: boolean;
  canPrevious: boolean;
  canPass: boolean;
  canHint: boolean;
  canRetry: boolean;
  onContinue: () => void;
  onPrevious: () => void;
  onPass: () => void;
  onHint: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onExit: () => void;
};

export function TutorialControls({
  feedbackState,
  canContinue,
  canPrevious,
  canPass,
  canHint,
  canRetry,
  onContinue,
  onPrevious,
  onPass,
  onHint,
  onRetry,
  onRestart,
  onExit,
}: TutorialControlsProps) {
  const runAction = useActionCooldown();
  const isInfoStep = feedbackState === 'idle' && canContinue;
  const showContinue = feedbackState === 'correct' || isInfoStep;

  return (
    <div className="tutorial-controls tutorial-controls--sticky">
      <div className="tutorial-controls__primary">
        {showContinue ? (
          <button
            type="button"
            className="tutorial-controls__button tutorial-controls__button--primary"
            onClick={() => runAction(onContinue)}
          >
            {feedbackState === 'correct' ? 'Continue' : 'Next'}
          </button>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            className="tutorial-controls__button"
            onClick={() => runAction(onRetry)}
          >
            Retry
          </button>
        ) : null}
        {canPass ? (
          <button type="button" className="tutorial-controls__button" onClick={() => runAction(onPass)}>
            Pass
          </button>
        ) : null}
        {canHint ? (
          <button
            type="button"
            className="tutorial-controls__button"
            aria-label="Show tutorial hint"
            onClick={() => runAction(onHint)}
          >
            Show hint
          </button>
        ) : null}
      </div>
      <div className="tutorial-controls__secondary">
        {canPrevious ? (
          <button
            type="button"
            className="tutorial-controls__button tutorial-controls__button--ghost"
            onClick={() => runAction(onPrevious)}
          >
            Previous
          </button>
        ) : null}
        <button
          type="button"
          className="tutorial-controls__button tutorial-controls__button--ghost"
          onClick={() => runAction(onRestart)}
        >
          Restart
        </button>
        <button
          type="button"
          className="tutorial-controls__button tutorial-controls__button--ghost"
          onClick={() => runAction(onExit)}
        >
          Exit Tutorial
        </button>
      </div>
    </div>
  );
}
