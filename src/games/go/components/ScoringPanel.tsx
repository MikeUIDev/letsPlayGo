import type { ScoreBreakdown } from '../engine/scoring';
import { StoneIcon } from './StoneIcon';

interface ScoringPanelProps {
  breakdown: ScoreBreakdown;
  error: string | null;
}

function ScoreRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string | number;
  emphasized?: boolean;
}) {
  return (
    <div className={`scoring-panel__row${emphasized ? ' scoring-panel__row--total' : ''}`}>
      <span className="scoring-panel__row-label">{label}</span>
      <span className="scoring-panel__row-value">{value}</span>
    </div>
  );
}

function PlayerScoreCard({
  color,
  breakdown,
}: {
  color: 'black' | 'white';
  breakdown: ScoreBreakdown;
}) {
  const label = color === 'black' ? 'Black' : 'White';
  const stones = color === 'black' ? breakdown.blackStones : breakdown.whiteStones;
  const territory = color === 'black' ? breakdown.blackTerritory : breakdown.whiteTerritory;
  const total = color === 'black' ? breakdown.blackTotal : breakdown.whiteTotal;

  return (
    <div className={`scoring-panel__player scoring-panel__player--${color}`}>
      <div className="scoring-panel__player-header">
        <StoneIcon color={color} />
        <span className="scoring-panel__player-name">{label}</span>
        <span className="scoring-panel__player-total">{total}</span>
      </div>
      <div className="scoring-panel__player-breakdown">
        <ScoreRow label="Stones" value={stones} />
        <ScoreRow label="Territory" value={territory} />
        {color === 'white' && <ScoreRow label="Komi" value={breakdown.komi} />}
        <ScoreRow label="Total" value={total} emphasized />
      </div>
    </div>
  );
}

export function ScoringPanel({ breakdown, error }: ScoringPanelProps) {
  return (
    <section className="scoring-panel" aria-label="Scoring">
      <header className="scoring-panel__header">
        <h2 className="scoring-panel__title">Scoring</h2>
        <p className="scoring-panel__instruction">
          Select groups that should be removed before confirming the score.
        </p>
      </header>

      <PlayerScoreCard color="black" breakdown={breakdown} />
      <PlayerScoreCard color="white" breakdown={breakdown} />

      {error && (
        <p className="game-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
