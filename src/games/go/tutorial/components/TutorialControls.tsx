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
  const continueLabel = feedbackState === 'correct' ? 'Continue' : 'Next';

  return (
    <div className="tutorial-controls">
      {(showContinue || canPrevious) && (
        <div className={`tutorial-controls__nav${showContinue ? ' tutorial-controls__nav--with-next' : ''}`}>
          {canPrevious ? (
            <button
              type="button"
              className="control-button control-button--secondary tutorial-controls__button tutorial-controls__button--previous"
              onClick={() => runAction(onPrevious)}
            >
              Previous
            </button>
          ) : null}
          {showContinue ? (
            <button
              type="button"
              className="control-button control-button--primary tutorial-controls__button tutorial-controls__button--next"
              onClick={() => runAction(onContinue)}
            >
              {continueLabel}
            </button>
          ) : null}
        </div>
      )}

      {(canRetry || canPass || canHint) && (
        <div className="tutorial-controls__tools">
          {canRetry ? (
            <button
              type="button"
              className="control-button control-button--secondary tutorial-controls__button"
              onClick={() => runAction(onRetry)}
            >
              Retry
            </button>
          ) : null}
          {canPass ? (
            <button
              type="button"
              className="control-button control-button--secondary tutorial-controls__button"
              onClick={() => runAction(onPass)}
            >
              Pass
            </button>
          ) : null}
          {canHint ? (
            <button
              type="button"
              className="control-button control-button--secondary tutorial-controls__button"
              aria-label="Show tutorial hint"
              onClick={() => runAction(onHint)}
            >
              Hint
            </button>
          ) : null}
        </div>
      )}

      <div className="tutorial-controls__tertiary">
        <button
          type="button"
          className="tutorial-controls__tertiary-button"
          onClick={() => runAction(onRestart)}
        >
          Restart
        </button>
        <span className="tutorial-controls__tertiary-sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="tutorial-controls__tertiary-button"
          onClick={() => runAction(onExit)}
        >
          Exit Tutorial
        </button>
      </div>
    </div>
  );
}
