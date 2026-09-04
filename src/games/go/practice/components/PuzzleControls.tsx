import { useActionCooldown } from '../../tutorial/useActionCooldown';

type PuzzleControlsProps = {
  canHint: boolean;
  canRetry: boolean;
  canNext: boolean;
  onHint: () => void;
  onRetry: () => void;
  onReset: () => void;
  onNext: () => void;
};

export function PuzzleControls({
  canHint,
  canRetry,
  canNext,
  onHint,
  onRetry,
  onReset,
  onNext,
}: PuzzleControlsProps) {
  const runAction = useActionCooldown();

  return (
    <div className="practice-controls">
      <div className="practice-controls__primary">
        {canNext ? (
          <button
            type="button"
            className="control-button control-button--primary practice-controls__button"
            onClick={() => runAction(onNext)}
          >
            Next Puzzle
          </button>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            className="control-button control-button--secondary practice-controls__button"
            onClick={() => runAction(onRetry)}
          >
            Retry
          </button>
        ) : null}
        {canHint ? (
          <button
            type="button"
            className="control-button control-button--secondary practice-controls__button"
            aria-label="Show puzzle hint"
            onClick={() => runAction(onHint)}
          >
            Hint
          </button>
        ) : null}
        <button
          type="button"
          className="control-button control-button--secondary practice-controls__button"
          onClick={() => runAction(onReset)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
