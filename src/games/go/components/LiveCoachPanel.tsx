import { ConceptList } from './ConceptLabel';
import type { DetectedConcept } from '../concepts/types';
import type { GoConcept } from '../concepts/types';
import type { LiveCoachHintStatus, LiveCoachPanelModel } from '../liveCoach/types';

type LiveCoachPanelProps = {
  panel: LiveCoachPanelModel | null;
  hintLabel: string | null;
  hintWhy: string | null;
  hintStatus: LiveCoachHintStatus;
  hintError: string | null;
  canRequestHint: boolean;
  expandedConceptId: GoConcept | null;
  primaryConcept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
  onToggleConcept: (concept: DetectedConcept) => void;
  onRequestHint: () => void;
  onDismiss: () => void;
};

export function LiveCoachPanel({
  panel,
  hintLabel,
  hintWhy,
  hintStatus,
  hintError,
  canRequestHint,
  expandedConceptId,
  primaryConcept,
  secondaryConcept,
  onToggleConcept,
  onRequestHint,
  onDismiss,
}: LiveCoachPanelProps) {
  const showPanel = Boolean(panel || hintLabel || hintError || canRequestHint);

  if (!showPanel) {
    return null;
  }

  return (
    <section className="live-coach-panel" aria-labelledby="live-coach-title">
      <div className="live-coach-panel__header">
        <h2 id="live-coach-title" className="live-coach-panel__title">
          Coach
        </h2>
        {panel ? (
          <button type="button" className="live-coach-panel__dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>

      {panel ? (
        <div
          className={`live-coach-panel__feedback${panel.isWarning ? ' live-coach-panel__feedback--warning' : ''}`}
          role="status"
          aria-live="polite"
        >
          {panel.isWarning ? <span className="live-coach-panel__badge">Warning</span> : null}
          {panel.headline ? <p className="live-coach-panel__headline">{panel.headline}</p> : null}
          {panel.detail ? <p className="live-coach-panel__detail">{panel.detail}</p> : null}
          {panel.secondaryDetail ? (
            <p className="live-coach-panel__secondary">{panel.secondaryDetail}</p>
          ) : null}
        </div>
      ) : null}

      {(primaryConcept || secondaryConcept) && (
        <ConceptList
          primaryConcept={primaryConcept}
          secondaryConcept={secondaryConcept}
          expandedConceptId={expandedConceptId}
          onToggleConcept={onToggleConcept}
        />
      )}

      <div className="live-coach-panel__hint">
        {hintLabel ? (
          <p className="live-coach-panel__hint-label" role="status">
            {hintLabel}
          </p>
        ) : null}
        {hintWhy ? <p className="live-coach-panel__hint-why">{hintWhy}</p> : null}
        {hintError ? (
          <p className="live-coach-panel__hint-error" role="status">
            {hintError}
          </p>
        ) : null}
        <button
          type="button"
          className="live-coach-panel__hint-button"
          onClick={onRequestHint}
          disabled={!canRequestHint || hintStatus === 'loading'}
        >
          {hintStatus === 'loading' ? 'Loading hint…' : 'Show hint'}
        </button>
      </div>
    </section>
  );
}
