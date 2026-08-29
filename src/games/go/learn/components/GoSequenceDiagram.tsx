import { useState } from 'react';
import type { SequenceStep } from '../types';
import { GoDiagram } from './GoDiagram';
import { useActionCooldown } from '../../tutorial/useActionCooldown';

type GoSequenceDiagramProps = {
  steps: SequenceStep[];
  ariaLabel?: string;
};

export function GoSequenceDiagram({ steps, ariaLabel }: GoSequenceDiagramProps) {
  const [index, setIndex] = useState(0);
  const runAction = useActionCooldown();
  const step = steps[index];

  if (!step) {
    return null;
  }

  return (
    <div className="learn-sequence" aria-label={ariaLabel ?? 'Step-by-step Go diagram'}>
      <div className="learn-sequence__controls">
        <button
          type="button"
          className="learn-sequence__button"
          onClick={() => runAction(() => setIndex((current) => Math.max(0, current - 1)))}
          disabled={index === 0}
        >
          Previous
        </button>
        <span className="learn-sequence__step" aria-live="polite">
          Step {index + 1} of {steps.length}
        </span>
        <button
          type="button"
          className="learn-sequence__button"
          onClick={() =>
            runAction(() => setIndex((current) => Math.min(steps.length - 1, current + 1)))
          }
          disabled={index >= steps.length - 1}
        >
          Next
        </button>
      </div>

      {step.title ? <p className="learn-sequence__title">{step.title}</p> : null}

      <GoDiagram
        size={step.size}
        stones={step.stones}
        highlights={step.highlights}
        caption={step.caption}
        ariaLabel={step.ariaLabel}
        compact
      />
    </div>
  );
}
