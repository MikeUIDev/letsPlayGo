import { useMemo } from 'react';
import { FinishedControls, ScoringControls } from './components/ScoringControls';
import { GameControls } from './components/GameControls';
import { GameOverPanel } from './components/GameOverPanel';
import { GoBoard } from './components/GoBoard';
import { MoveHistory } from './components/MoveHistory';
import { NewGameSetupScreen } from './components/NewGameSetupScreen';
import { PlayerPanel } from './components/PlayerPanel';
import { ResumeGameScreen } from './components/ResumeGameScreen';
import { ReviewPanel } from './components/ReviewPanel';
import { ScoringPanel } from './components/ScoringPanel';
import { useCoordinatesPreference } from './hooks/useCoordinatesPreference';
import { useGoGame } from './hooks/useGoGame';
import { useGoReview } from './hooks/useGoReview';
import { getLastMovePosition } from './utils/lastMove';
import './go.css';

export function GoGamePage() {
  const {
    view,
    setupDraft,
    canCancelSetup,
    resumeSnapshot,
    state,
    moves,
    error,
    canUndo,
    canAct,
    canPlay,
    aiStatus,
    canConfirmScore,
    canResume,
    isScoring,
    isEnded,
    isReviewing,
    analysis,
    scoreBreakdown,
    territoryMap,
    deadStoneKeys,
    play,
    markDead,
    dispatchAction,
    updateSetupDraft,
    startGame,
    openSetup,
    openSetupFromResume,
    cancelSetup,
    resumeSavedGame,
    discardSavedGame,
    exportCurrentSgf,
    importSgfFile,
    enterReview,
    exitReview,
  } = useGoGame();

  const review = useGoReview({
    sourceState: state,
    analysis,
    enabled: isReviewing && isEnded,
  });

  const coordinateContext = useMemo(
    () => ({
      mode: state?.config.mode ?? ('local' as const),
      aiDifficulty: state?.config.mode === 'ai' ? state.config.difficulty : undefined,
      isReviewing,
    }),
    [isReviewing, state],
  );
  const { showCoordinates, toggleCoordinates } = useCoordinatesPreference(coordinateContext);

  const playingLastMove = useMemo(() => (state ? getLastMovePosition(state) : null), [state]);
  const boardState = isReviewing ? review.reviewState : state;
  const boardLastMove = isReviewing ? review.lastMove : playingLastMove;

  const showPlayingSidebar = Boolean(state && !isScoring && !isEnded && !isReviewing);
  const gridPhaseClass = isReviewing ? 'review' : isEnded ? 'ended' : isScoring ? 'scoring' : 'playing';

  if (view === 'resume' && resumeSnapshot) {
    return (
      <ResumeGameScreen
        savedGame={resumeSnapshot}
        onResume={resumeSavedGame}
        onNewGame={openSetupFromResume}
        onDiscard={discardSavedGame}
      />
    );
  }

  if (view === 'setup') {
    return (
      <NewGameSetupScreen
        setup={setupDraft}
        canCancel={canCancelSetup}
        error={error}
        onSetupChange={updateSetupDraft}
        onStart={startGame}
        onCancel={cancelSetup}
        onImportSgf={importSgfFile}
      />
    );
  }

  if (!state || !scoreBreakdown || !boardState) {
    return null;
  }

  const reviewPanelProps = {
    moveIndex: review.moveIndex,
    moveCount: review.moveCount,
    boardSize: state.board.size,
    analysisResult: review.analysisResult,
    analysisStatus: review.analysisStatus,
    analysisError: review.analysisError,
    currentEvaluation: review.currentEvaluation,
    coachExplanation: review.coachExplanation,
    variationPreview: review.variationPreview,
    showBestMove: review.showBestMove,
    showVariationLine: review.showVariationLine,
    canShowVariationLine: review.canShowVariationLine,
    onToggleShowBestMove: review.toggleShowBestMove,
    onToggleShowVariationLine: review.toggleShowVariationLine,
    expandedConceptId: review.expandedConceptId,
    onToggleConcept: review.toggleConcept,
    scanStatus: review.scanStatus,
    scanProgress: review.scanProgress,
    scanError: review.scanError,
    mistakeNavigation: review.mistakeNavigation,
    canGoFirst: review.navigation.canGoFirst,
    canGoPrevious: review.navigation.canGoPrevious,
    canGoNext: review.navigation.canGoNext,
    canGoLast: review.navigation.canGoLast,
    onGoFirst: review.goFirst,
    onGoPrevious: review.goPrevious,
    onGoNext: review.goNext,
    onGoLast: review.goLast,
    onGoPreviousMistake: review.goPreviousMistake,
    onGoNextMistake: review.goNextMistake,
    onFindMistakes: review.findMistakes,
    onRetryScan: review.retryScan,
    onExitReview: exitReview,
    showCoordinates,
    onToggleCoordinates: toggleCoordinates,
  };

  return (
    <main className="go-game">
        <div className={`go-shell go-game__grid go-game__grid--${gridPhaseClass}`}>
          {showPlayingSidebar && (
            <section className="go-game__mobile-active">
              <PlayerPanel state={state} error={error} layout="active-only" aiStatus={aiStatus} />
            </section>
          )}

          {(isScoring || (isEnded && !isReviewing)) && (
            <section className="go-game__mobile-scoring">
              {isScoring ? (
                <ScoringPanel breakdown={scoreBreakdown} error={error} />
              ) : (
                <GameOverPanel state={state} />
              )}
            </section>
          )}

          {isReviewing && (
            <section className="go-game__mobile-review">
              <ReviewPanel {...reviewPanelProps} />
            </section>
          )}

          <section className="go-game__board-column">
            <GoBoard
              state={boardState}
              lastMove={boardLastMove}
              territoryMap={isReviewing ? new Map() : territoryMap}
              deadStoneKeys={isReviewing ? new Set<string>() : deadStoneKeys}
              humanCanPlay={canPlay}
              onPlay={play}
              onMarkDead={markDead}
              reviewMode={isReviewing}
              showCoordinates={showCoordinates}
              candidateMarkers={review.candidateMarkers}
              primaryCandidateRank={1}
              emphasizeBestMove={review.emphasizeBestMove}
              variationMarkers={review.variationMarkers}
              conceptHighlightKeys={review.conceptHighlightKeys}
            />
            <div className="go-game__board-footer">
              {showPlayingSidebar && (
                <GameControls
                  className="go-game__controls--desktop"
                  canUndo={canUndo}
                  canAct={canAct}
                  canConfirmScore={canConfirmScore}
                  showCoordinates={showCoordinates}
                  onToggleCoordinates={toggleCoordinates}
                  onAction={dispatchAction}
                  onNewGame={openSetup}
                  onExportSgf={exportCurrentSgf}
                  onImportSgf={importSgfFile}
                />
              )}
              {isScoring && (
                <ScoringControls
                  className="go-game__controls--desktop"
                  canResume={canResume}
                  canConfirmScore={canConfirmScore}
                  onAction={dispatchAction}
                />
              )}
              {isEnded && !isReviewing && (
                <FinishedControls
                  className="go-game__controls--desktop"
                  onEnterReview={enterReview}
                  onNewGame={openSetup}
                  onExportSgf={exportCurrentSgf}
                />
              )}
            </div>
          </section>

          <aside className="go-game__sidebar">
            {isReviewing && <ReviewPanel {...reviewPanelProps} />}
            {isScoring && <ScoringPanel breakdown={scoreBreakdown} error={error} />}
            {isEnded && !isReviewing && <GameOverPanel state={state} />}
            {showPlayingSidebar && (
              <>
                <PlayerPanel state={state} error={error} layout="sidebar" aiStatus={aiStatus} />
                <MoveHistory moves={moves} boardSize={state.board.size} />
              </>
            )}
          </aside>

          {showPlayingSidebar && (
            <section className="go-game__mobile-opponent">
              <PlayerPanel state={state} error={null} layout="opponent-only" aiStatus={aiStatus} />
            </section>
          )}

          <section className="go-game__mobile-controls">
            {showPlayingSidebar && (
              <GameControls
                canUndo={canUndo}
                canAct={canAct}
                canConfirmScore={canConfirmScore}
                showCoordinates={showCoordinates}
                onToggleCoordinates={toggleCoordinates}
                onAction={dispatchAction}
                onNewGame={openSetup}
                onExportSgf={exportCurrentSgf}
                onImportSgf={importSgfFile}
              />
            )}
            {isScoring && (
              <ScoringControls
                canResume={canResume}
                canConfirmScore={canConfirmScore}
                onAction={dispatchAction}
              />
            )}
            {isEnded && !isReviewing && (
              <FinishedControls
                onEnterReview={enterReview}
                onNewGame={openSetup}
                onExportSgf={exportCurrentSgf}
              />
            )}
          </section>
        </div>
      </main>
  );
}
