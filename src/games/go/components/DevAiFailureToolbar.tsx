import { useEffect, useState } from 'react';
import {
  AI_FAILURE_SIM_KINDS,
  getAiFailureSim,
  initAiFailureSimFromUrl,
  isAiFailureSimAllowed,
  setAiFailureSim,
  subscribeAiFailureSim,
  type AiFailureSimKind,
} from '../ai/devAiFailureSim';

const LABELS: Record<AiFailureSimKind, string> = {
  offline: 'Offline',
  timeout: 'Timeout',
  unavailable: '5xx',
  malformed: 'Bad JSON',
};

/** Development-only AI failure controls. Renders nothing in production builds. */
export function DevAiFailureToolbar() {
  const [kind, setKind] = useState<AiFailureSimKind | null>(null);

  useEffect(() => {
    if (!isAiFailureSimAllowed()) {
      return;
    }

    initAiFailureSimFromUrl();
    setKind(getAiFailureSim());
    return subscribeAiFailureSim(() => setKind(getAiFailureSim()));
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="dev-ai-sim" data-testid="dev-ai-failure-sim">
      <p className="dev-ai-sim__label">DEV AI fail</p>
      <div className="dev-ai-sim__actions">
        {AI_FAILURE_SIM_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            className={`dev-ai-sim__button${kind === option ? ' dev-ai-sim__button--active' : ''}`}
            aria-pressed={kind === option}
            onClick={() => setAiFailureSim(kind === option ? null : option)}
          >
            {LABELS[option]}
          </button>
        ))}
        <button
          type="button"
          className={`dev-ai-sim__button${kind === null ? ' dev-ai-sim__button--active' : ''}`}
          aria-pressed={kind === null}
          onClick={() => setAiFailureSim(null)}
        >
          Off
        </button>
      </div>
    </div>
  );
}
