import { useActionCooldown } from '../../tutorial/useActionCooldown';

type PuzzleControlsProps = {
  canHint: boolean;
  canRetry: boolean;
  canNext: boolean;
  onHint: () => void;
  onRetry: () => void;
  onReset: () => void;
  onNext: () => void;
  onExit: () => void;
};

export function PuzzleControls({
  canHint,
  canRetry,
  canNext,
  onHint,
  onRetry,
  onReset,
  onNext,
  onExit,
}: PuzzleControlsProps) {
  const runAction = useActionCooldown();

  return (
    <div className="practice-controls practice-controls--sticky">
      <div className="practice-controls__primary">
        {canNext ? (
          <button
            type="button"
            className="practice-controls__button practice-controls__button--primary"
            onClick={() => runAction(onNext)}
          >
            Next Puzzle
          </button>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            className="practice-controls__button"
            onClick={() => runAction(onRetry)}
          >
            Retry
          </button>
        ) : null}
        {canHint ? (
          <button
            type="button"
            className="practice-controls__button"
            aria-label="Show puzzle hint"
            onClick={() => runAction(onHint)}
          >
            Show hint
          </button>
        ) : null}
        <button type="button" className="practice-controls__button" onClick={() => runAction(onReset)}>
          Reset
        </button>
      </div>
      <button
        type="button"
        className="practice-controls__button practice-controls__button--ghost"
        onClick={() => runAction(onExit)}
      >
        Back to Practice
      </button>
    </div>
  );
}
