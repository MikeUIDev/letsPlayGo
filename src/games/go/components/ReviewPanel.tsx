import type { ScanProgress, ScanStatus } from '../review/reviewScan';
import { formatCandidateLabel, formatScoreLeadLabel, formatWinRatePercent } from '../analysis/ApiGoAnalysis';
import type { AnalysisResult, AnalysisStatus } from '../analysis/types';
import type { CoachExplanation } from '../coach/types';
import { formatVariationMoveLabel } from '../coach/formatCoachExplanation';
import type { VariationPreviewResult } from '../coach/variationPreview';
import type { BoardSize, Move } from '../engine/types';
import { formatCoordinate } from '../utils/coordinates';
import { ConceptList } from './ConceptLabel';
import { StoneIcon } from './StoneIcon';
import type { GoConcept } from '../concepts/types';
import type { DetectedConcept } from '../concepts/types';
import type { MoveEvaluation } from '../review/moveEvaluation';
import { formatMoveQualityLabel, moveQualityClassName, type MoveQuality } from '../review/moveQuality';
import { formatEstimatedScoreLoss } from '../review/scorePerspective';
import { CoordinatesToggle } from './CoordinatesToggle';

interface ReviewPanelProps {
  moveIndex: number;
  moveCount: number;
  boardSize: BoardSize;
  analysisResult: AnalysisResult | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  currentEvaluation: MoveEvaluation | null;
  coachExplanation: CoachExplanation | null;
  variationPreview: VariationPreviewResult | null;
  showBestMove: boolean;
  showVariationLine: boolean;
  canShowVariationLine: boolean;
  onToggleShowBestMove: () => void;
  onToggleShowVariationLine: () => void;
  expandedConceptId: GoConcept | null;
  onToggleConcept: (concept: DetectedConcept) => void;
  scanStatus: ScanStatus;
  scanProgress: ScanProgress | null;
  scanError: string | null;
  mistakeNavigation: {
    mistakeIndex: number;
    mistakeCount: number;
    canGoPreviousMistake: boolean;
    canGoNextMistake: boolean;
  };
  canGoFirst: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canGoLast: boolean;
  onGoFirst: () => void;
  onGoPrevious: () => void;
  onGoNext: () => void;
  onGoLast: () => void;
  onGoPreviousMistake: () => void;
  onGoNextMistake: () => void;
  onFindMistakes: () => void;
  onRetryScan: () => void;
  onExitReview: () => void;
  showCoordinates: boolean;
  onToggleCoordinates: () => void;
}

function formatPlayedMove(move: Move, boardSize: BoardSize): string {
  if (move.type === 'pass') {
    return 'Pass';
  }

  if (move.type === 'resign') {
    return 'Resign';
  }

  return formatCoordinate(move.position, boardSize);
}

function QualityBadge({ quality }: { quality: MoveQuality }) {
  return (
    <p className={moveQualityClassName(quality)}>
      {formatMoveQualityLabel(quality)}
    </p>
  );
}

export function ReviewPanel({
  moveIndex,
  moveCount,
  boardSize,
  analysisResult,
  analysisStatus,
  analysisError,
  currentEvaluation,
  coachExplanation,
  variationPreview,
  showBestMove,
  showVariationLine,
  canShowVariationLine,
  onToggleShowBestMove,
  onToggleShowVariationLine,
  expandedConceptId,
  onToggleConcept,
  scanStatus,
  scanProgress,
  scanError,
  mistakeNavigation,
  canGoFirst,
  canGoPrevious,
  canGoNext,
  canGoLast,
  onGoFirst,
  onGoPrevious,
  onGoNext,
  onGoLast,
  onGoPreviousMistake,
  onGoNextMistake,
  onFindMistakes,
  onRetryScan,
  onExitReview,
  showCoordinates,
  onToggleCoordinates,
}: ReviewPanelProps) {
  const showCoachSection = moveIndex >= 1 && currentEvaluation && coachExplanation;
  const scanCompleteWithNoMistakes =
    scanStatus === 'complete' && mistakeNavigation.mistakeCount === 0;
  const bestCandidate = currentEvaluation?.bestCandidates[0] ?? null;

  return (
    <section className="review-panel" aria-label="Game review">
      <div className="review-panel__header">
        <h2 className="review-panel__title">Review</h2>
        <button type="button" className="review-panel__exit" onClick={onExitReview}>
          Exit
        </button>
      </div>

      <p className="review-panel__move-count">
        Move {moveIndex} / {moveCount}
      </p>

      <CoordinatesToggle checked={showCoordinates} onToggle={onToggleCoordinates} />

      {showCoachSection && currentEvaluation && coachExplanation && (
        <div className="review-panel__coach">
          <h3 className="review-panel__coach-title">Coach</h3>

          <div className="review-panel__played-move">
            <StoneIcon color={currentEvaluation.player} size="sm" />
            <span>
              Move {moveIndex} · {currentEvaluation.player === 'black' ? 'Black' : 'White'}
            </span>
          </div>

          <p className="review-panel__played-detail">
            You played {formatPlayedMove(currentEvaluation.playedMove, boardSize)}
          </p>

          <QualityBadge quality={currentEvaluation.quality} />

          <ConceptList
            primaryConcept={coachExplanation.primaryConcept}
            secondaryConcept={coachExplanation.secondaryConcept}
            expandedConceptId={expandedConceptId}
            onToggleConcept={onToggleConcept}
          />

          {coachExplanation.positiveHeadline ? (
            <div className="review-panel__coach-positive">
              <p className="review-panel__note">{coachExplanation.positiveHeadline}</p>
              {coachExplanation.positiveDetail && (
                <p className="review-panel__coach-detail">{coachExplanation.positiveDetail}</p>
              )}
            </div>
          ) : (
            <>
              {coachExplanation.primary && (
                <div className="review-panel__coach-insight">
                  <p className="review-panel__coach-insight-title">{coachExplanation.primary.title}</p>
                  <p className="review-panel__coach-detail">{coachExplanation.primary.explanation}</p>
                </div>
              )}

              {coachExplanation.secondary && (
                <p className="review-panel__coach-secondary">{coachExplanation.secondary.explanation}</p>
              )}

              {coachExplanation.showScoreLoss && currentEvaluation.scoreLoss > 0 && (
                <p className="review-panel__score-loss">
                  {formatEstimatedScoreLoss(currentEvaluation.scoreLoss)}
                </p>
              )}
            </>
          )}

          {currentEvaluation.playedBestMove && currentEvaluation.quality === 'good' && !coachExplanation.positiveHeadline && (
            <p className="review-panel__note">Best move</p>
          )}

          {bestCandidate && currentEvaluation.quality !== 'good' && (
            <div className="review-panel__better-move">
              <h4 className="review-panel__better-move-title">Better move</h4>
              <p className="review-panel__better-move-label">
                {formatCandidateLabel(bestCandidate, boardSize)}
              </p>
              <button
                type="button"
                className="review-panel__toggle-button"
                aria-pressed={showBestMove}
                onClick={onToggleShowBestMove}
              >
                {showBestMove ? 'Hide suggestion' : 'Show best move'}
              </button>
            </div>
          )}

          {currentEvaluation.bestCandidates.length > 0 && currentEvaluation.quality !== 'good' && (
            <div className="review-panel__candidates">
              <h3 className="review-panel__candidates-title">Better moves</h3>
              <ol className="review-panel__candidates-list">
                {currentEvaluation.bestCandidates.map((candidate, index) => (
                  <li key={`${candidate.type}-${index}`} className="review-panel__candidate">
                    <span className="review-panel__candidate-rank">{index + 1}.</span>
                    <span className="review-panel__candidate-label">
                      {formatCandidateLabel(candidate, boardSize)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {canShowVariationLine && variationPreview && (
            <div className="review-panel__variation">
              <h4 className="review-panel__variation-title">Best line</h4>
              <ol className="review-panel__variation-list">
                {variationPreview.textMoves.map((move, index) => (
                  <li key={`variation-${index}`} className="review-panel__variation-move">
                    {index + 1}. {formatVariationMoveLabel(move.color, move.position, boardSize)}
                  </li>
                ))}
              </ol>
              {variationPreview.canRender && (
                <button
                  type="button"
                  className="review-panel__toggle-button"
                  aria-pressed={showVariationLine}
                  onClick={onToggleShowVariationLine}
                >
                  {showVariationLine ? 'Hide line' : 'Show line'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="review-panel__analysis">
        {analysisStatus === 'loading' && (
          <p className="review-panel__status">Analyzing…</p>
        )}

        {analysisStatus === 'error' && (
          <p className="review-panel__error" role="status">
            {analysisError ?? 'Analysis is unavailable right now.'}
          </p>
        )}

        {analysisStatus === 'ready' && analysisResult && (
          <>
            <h3 className="review-panel__section-title">Position after move</h3>
            <div className="review-panel__metric">
              <span className="review-panel__metric-label">Black win rate</span>
              <span className="review-panel__metric-value">
                {formatWinRatePercent(analysisResult.winRate.black)}
              </span>
            </div>
            <div className="review-panel__metric">
              <span className="review-panel__metric-label">White win rate</span>
              <span className="review-panel__metric-value">
                {formatWinRatePercent(analysisResult.winRate.white)}
              </span>
            </div>
            <div className="review-panel__metric">
              <span className="review-panel__metric-label">Score</span>
              <span className="review-panel__metric-value">
                {formatScoreLeadLabel(analysisResult.scoreLead)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="review-panel__scan">
        {scanStatus === 'scanning' && scanProgress && (
          <p className="review-panel__status">
            Analyzing game… {scanProgress.completed} / {scanProgress.total} moves
          </p>
        )}

        {scanStatus !== 'scanning' && (
          <button
            type="button"
            className="control-button control-button--secondary review-panel__find-mistakes"
            onClick={onFindMistakes}
          >
            Find mistakes
          </button>
        )}

        {scanCompleteWithNoMistakes && (
          <p className="review-panel__note">No major mistakes found.</p>
        )}

        {scanError && (
          <div className="review-panel__scan-error">
            <p className="review-panel__error" role="status">
              {scanError}
            </p>
            <button type="button" className="review-panel__retry" onClick={onRetryScan}>
              Retry
            </button>
          </div>
        )}
      </div>

      {mistakeNavigation.mistakeCount > 0 && (
        <div className="review-panel__mistake-nav">
          <p className="review-panel__mistake-count">
            {mistakeNavigation.mistakeIndex > 0
              ? `Mistake ${mistakeNavigation.mistakeIndex} of ${mistakeNavigation.mistakeCount}`
              : `${mistakeNavigation.mistakeCount} mistakes found`}
          </p>
          <div className="review-panel__mistake-buttons">
            <button
              type="button"
              className="control-button control-button--secondary review-panel__nav-button"
              disabled={!mistakeNavigation.canGoPreviousMistake}
              onClick={onGoPreviousMistake}
            >
              Previous mistake
            </button>
            <button
              type="button"
              className="control-button control-button--secondary review-panel__nav-button"
              disabled={!mistakeNavigation.canGoNextMistake}
              onClick={onGoNextMistake}
            >
              Next mistake
            </button>
          </div>
        </div>
      )}

      <div className="review-panel__nav" aria-label="Review navigation">
        <button
          type="button"
          className="control-button control-button--secondary review-panel__nav-button"
          disabled={!canGoFirst}
          onClick={onGoFirst}
          aria-label="Jump to start"
        >
          |&lt;
        </button>
        <button
          type="button"
          className="control-button control-button--secondary review-panel__nav-button"
          disabled={!canGoPrevious}
          onClick={onGoPrevious}
          aria-label="Previous move"
        >
          &lt;
        </button>
        <button
          type="button"
          className="control-button control-button--secondary review-panel__nav-button"
          disabled={!canGoNext}
          onClick={onGoNext}
          aria-label="Next move"
        >
          &gt;
        </button>
        <button
          type="button"
          className="control-button control-button--secondary review-panel__nav-button"
          disabled={!canGoLast}
          onClick={onGoLast}
          aria-label="Jump to end"
        >
          &gt;|
        </button>
      </div>
    </section>
  );
}
