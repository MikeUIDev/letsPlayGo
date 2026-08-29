import type { ScoreBreakdown } from '../engine/scoring';
import type { CaptureCounts, GameResult } from '../engine/types';
import { StoneIcon } from './StoneIcon';

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ScoreRow({
  label,
  value,
  emphasized = false,
  muted = false,
}: {
  label: string;
  value: string | number;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`score-breakdown__row${emphasized ? ' score-breakdown__row--total' : ''}${muted ? ' score-breakdown__row--muted' : ''}`}
    >
      <span className="score-breakdown__row-label">{label}</span>
      <span className="score-breakdown__row-value">{value}</span>
    </div>
  );
}

function PlayerScoreCard({
  color,
  breakdown,
  captures,
}: {
  color: 'black' | 'white';
  breakdown: ScoreBreakdown;
  captures?: CaptureCounts;
}) {
  const label = color === 'black' ? 'Black' : 'White';
  const stones = color === 'black' ? breakdown.blackStones : breakdown.whiteStones;
  const territory = color === 'black' ? breakdown.blackTerritory : breakdown.whiteTerritory;
  const prisoners = captures ? captures[color] : 0;
  const total = color === 'black' ? breakdown.blackTotal : breakdown.whiteTotal;

  return (
    <div className={`score-breakdown__player score-breakdown__player--${color}`}>
      <div className="score-breakdown__player-header">
        <StoneIcon color={color} />
        <span className="score-breakdown__player-name">{label}</span>
        <span className="score-breakdown__player-total">{formatPoints(total)}</span>
      </div>
      <div className="score-breakdown__player-breakdown">
        <ScoreRow label="Stones on board" value={stones} />
        <ScoreRow label="Territory" value={territory} />
        {captures && <ScoreRow label="Prisoners (off board)" value={prisoners} muted />}
        {color === 'white' && <ScoreRow label="Komi" value={formatPoints(breakdown.komi)} />}
        <ScoreRow label="Total" value={formatPoints(total)} emphasized />
      </div>
    </div>
  );
}

export function provisionalLeaderLabel(breakdown: ScoreBreakdown): string {
  if (breakdown.blackTotal > breakdown.whiteTotal) return 'Black leads';
  if (breakdown.whiteTotal > breakdown.blackTotal) return 'White leads';
  return 'Even score';
}

export function provisionalMargin(breakdown: ScoreBreakdown): number {
  return Math.abs(breakdown.blackTotal - breakdown.whiteTotal);
}

interface ScoreBreakdownViewProps {
  breakdown: ScoreBreakdown;
  captures?: CaptureCounts;
  showRulesNote?: boolean;
  leaderPreview?: boolean;
}

export function ScoreBreakdownView({
  breakdown,
  captures,
  showRulesNote = false,
  leaderPreview = false,
}: ScoreBreakdownViewProps) {
  const margin = provisionalMargin(breakdown);
  const leader = provisionalLeaderLabel(breakdown);

  return (
    <div className="score-breakdown">
      {leaderPreview && (
        <p className="score-breakdown__leader" aria-live="polite">
          {leader}
          {margin > 0 ? ` by ${formatPoints(margin)}` : ''}
        </p>
      )}

      <PlayerScoreCard color="black" breakdown={breakdown} captures={captures} />
      <PlayerScoreCard color="white" breakdown={breakdown} captures={captures} />

      {showRulesNote && (
        <p className="score-breakdown__note">
          Area scoring: prisoners off the board are not added again — captured stones are already
          removed from the board count.
        </p>
      )}
    </div>
  );
}

export function formatWinnerLabel(result: GameResult): string {
  if (result.winner === 'draw') return 'Draw';
  if (result.winner === 'black') return 'Black wins';
  if (result.winner === 'white') return 'White wins';
  return 'Game over';
}
