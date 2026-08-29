import type { ScoreBreakdown } from '../engine/scoring';
import type { CaptureCounts } from '../engine/types';
import { ScoreBreakdownView } from './ScoreBreakdownView';

interface ScoringPanelProps {
  breakdown: ScoreBreakdown;
  captures: CaptureCounts;
  error: string | null;
}

export function ScoringPanel({ breakdown, captures, error }: ScoringPanelProps) {
  return (
    <section className="scoring-panel" aria-label="Scoring">
      <header className="scoring-panel__header">
        <h2 className="scoring-panel__title">Scoring</h2>
        <p className="scoring-panel__instruction">
          Tap stone groups to mark them dead or alive. Territory updates as you adjust dead stones.
        </p>
      </header>

      <ScoreBreakdownView
        breakdown={breakdown}
        captures={captures}
        showRulesNote
        leaderPreview
      />

      {error && (
        <p className="game-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
