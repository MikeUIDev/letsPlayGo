import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinishedControls, ScoringControls } from './components/ScoringControls';
import { GameConfirmSheet } from './components/GameConfirmSheet';
import { GameControls } from './components/GameControls';
import { GameOverPanel } from './components/GameOverPanel';
import { GameStatusBanner } from './components/GameStatusBanner';
import { GoBoard } from './components/GoBoard';
import { MoveHistory } from './components/MoveHistory';
import { NewGameSetupScreen } from './components/NewGameSetupScreen';
import { PlayerPanel } from './components/PlayerPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { ScoringPanel } from './components/ScoringPanel';
import { LiveCoachPanel } from './components/LiveCoachPanel';
import { useCoordinatesPreference } from './hooks/useCoordinatesPreference';
import { useGameConfirmations } from './hooks/useGameConfirmations';
import { resolveShowCoordinates } from './coordinates';
import { isAiStatusMessage } from './ai/errors';
import { LiveAnnouncer } from './accessibility/LiveAnnouncer';
import { useGameAnnouncement } from './accessibility/useGameAnnouncement';
import { useGoGameSession } from './context/GoGameSessionProvider';
import { useGoLiveCoach } from './hooks/useGoLiveCoach';
import { useGoReview } from './hooks/useGoReview';
import { getLastMovePosition } from './utils/lastMove';
import './go.css';

/** DEV-only; production builds replace this branch with null and drop the chunk. */
const DevAiFailureToolbar = import.meta.env.DEV
  ? lazy(() =>
      import('./components/DevAiFailureToolbar').then((module) => ({
        default: module.DevAiFailureToolbar,
      })),
    )
  : null;

export function GoGamePage() {
  const navigate = useNavigate();
  const {
    view,
    setupDraft,
    canCancelSetup,
    state,
    moves,
    error,
    canUndo,
    canAct,
    canPlay,
    aiStatus,
    showAiThinkingIndicator,
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
    discardSavedGame,
    exportCurrentSgf,
    importSgfFile,
    enterReview,
    exitReview,
    clearError,
    retryAi,
    canRetryAi,
  } = useGoGameSession();

  const gameAnnouncement = useGameAnnouncement(state, aiStatus, error);

  const confirmations = useGameConfirmations({
    state,
    dispatchAction,
    openSetup,
    openSetupFromResume,
    discardSavedGame,
  });

  const review = useGoReview({
    sourceState: state,
    analysis,
    enabled: isReviewing && isEnded,
  });

  const liveCoachEnabled = Boolean(
    state?.config.liveCoach && state.phase === 'playing' && !isReviewing && !isScoring && !isEnded,
  );

  const liveCoach = useGoLiveCoach({
    state,
    analysis,
    enabled: liveCoachEnabled,
    aiStatus,
  });

  const coordinateContext = useMemo(
    () => ({
      mode: state?.config.mode ?? setupDraft.mode,
      aiDifficulty:
        state?.config.mode === 'ai'
          ? state.config.difficulty
          : setupDraft.mode === 'ai'
            ? setupDraft.difficulty
            : undefined,
      isReviewing,
    }),
    [isReviewing, setupDraft, state],
  );
  const { preference, showCoordinates, toggleCoordinates, setCoordinatesPreference } =
    useCoordinatesPreference(coordinateContext);

  const setupShowCoordinates = useMemo(
    () =>
      resolveShowCoordinates(preference, {
        mode: setupDraft.mode,
        aiDifficulty: setupDraft.mode === 'ai' ? setupDraft.difficulty : undefined,
        isReviewing: false,
      }),
    [preference, setupDraft],
  );

  const playingLastMove = useMemo(() => (state ? getLastMovePosition(state) : null), [state]);
  const boardState = isReviewing ? review.reviewState : state;
  const boardLastMove = isReviewing ? review.lastMove : playingLastMove;

  const showPlayingSidebar = Boolean(state && !isScoring && !isEnded && !isReviewing);
  const gridPhaseClass = isReviewing ? 'review' : isEnded ? 'ended' : isScoring ? 'scoring' : 'playing';

  const confirmSheet =
    confirmations.sheetProps ? (
      <GameConfirmSheet
        open={confirmations.pending !== null}
        title={confirmations.sheetProps.title}
        message={confirmations.sheetProps.message}
        confirmLabel={confirmations.sheetProps.confirmLabel}
        destructive={confirmations.sheetProps.destructive}
        onConfirm={confirmations.confirm}
        onCancel={confirmations.cancel}
      />
    ) : null;

  const aiFailureBanner = Boolean(error && isAiStatusMessage(error));
  const statusBanner =
    error ? (
      <GameStatusBanner
        message={error}
        variant={aiFailureBanner ? 'info' : 'error'}
        onRetry={aiStatus === 'error' && canRetryAi ? retryAi : undefined}
        onDismiss={aiFailureBanner ? undefined : clearError}
      />
    ) : null;

  const gameControlsProps = {
    canUndo,
    canAct,
    canConfirmScore,
    showCoordinates,
    onToggleCoordinates: toggleCoordinates,
    onAction: dispatchAction,
    onRequestPass: confirmations.requestPass,
    onRequestResign: confirmations.requestResign,
    onRequestNewGame: confirmations.requestNewGame,
    onExportSgf: exportCurrentSgf,
    onImportSgf: importSgfFile,
  };

  if (view === 'setup') {
    return (
      <NewGameSetupScreen
        setup={setupDraft}
        canCancel={canCancelSetup}
        error={error}
        showCoordinates={setupShowCoordinates}
        onShowCoordinatesChange={(show) => setCoordinatesPreference(show ? 'on' : 'off')}
        onSetupChange={updateSetupDraft}
        onStart={startGame}
        onCancel={() => {
          cancelSetup();
          if (!canCancelSetup) {
            navigate('/');
          }
        }}
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
    <main className="go-game" id="main-content" tabIndex={-1}>
      <LiveAnnouncer
        message={gameAnnouncement?.message ?? null}
        politeness={gameAnnouncement?.politeness ?? 'polite'}
      />
      {DevAiFailureToolbar ? (
        <Suspense fallback={null}>
          <DevAiFailureToolbar />
        </Suspense>
      ) : null}
      <div className={`go-shell go-game__grid go-game__grid--${gridPhaseClass}`}>
        {(isScoring || (isEnded && !isReviewing)) && (
          <section className="go-game__mobile-scoring">
            {isScoring ? (
              <ScoringPanel breakdown={scoreBreakdown} captures={state.captures} error={error} />
            ) : (
              <GameOverPanel state={state} breakdown={scoreBreakdown} />
            )}
          </section>
        )}

        {isReviewing && (
          <section className="go-game__mobile-review">
            <ReviewPanel {...reviewPanelProps} />
          </section>
        )}

        <section className="go-game__board-column">
          <div className="go-game__board-stage">
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
              candidateMarkers={isReviewing ? review.candidateMarkers : liveCoach.hintMarkers}
              primaryCandidateRank={1}
              emphasizeBestMove={isReviewing ? review.emphasizeBestMove : liveCoach.emphasizeHint}
              variationMarkers={isReviewing ? review.variationMarkers : new Map()}
              conceptHighlightKeys={
                isReviewing ? review.conceptHighlightKeys : liveCoach.conceptHighlightKeys
              }
            />
          </div>
          <div className="go-game__board-footer">
            {showPlayingSidebar && (
              <GameControls className="go-game__board-controls" {...gameControlsProps} />
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
                onEnterReview={enterReview}
                onNewGame={confirmations.requestNewGame}
                onExportSgf={exportCurrentSgf}
              />
            )}
          </div>
        </section>

        {showPlayingSidebar && (
          <section className="go-game__mobile-players">
            <PlayerPanel
              state={state}
              error={null}
              layout="mobile-players"
              aiStatus={aiStatus}
              showAiThinkingIndicator={showAiThinkingIndicator}
            />
            {statusBanner}
          </section>
        )}

        <aside className="go-game__sidebar">
          {isReviewing && <ReviewPanel {...reviewPanelProps} />}
          {isScoring && <ScoringPanel breakdown={scoreBreakdown} captures={state.captures} error={error} />}
          {isEnded && !isReviewing && <GameOverPanel state={state} breakdown={scoreBreakdown} />}
          {showPlayingSidebar && (
            <>
              <PlayerPanel
                state={state}
                error={null}
                layout="sidebar"
                aiStatus={aiStatus}
                showAiThinkingIndicator={showAiThinkingIndicator}
              />
              {statusBanner}
              {liveCoachEnabled ? (
                <LiveCoachPanel
                  panel={liveCoach.panel}
                  hintLabel={liveCoach.hint?.label ?? null}
                  hintWhy={liveCoach.hint?.why ?? null}
                  hintStatus={liveCoach.hintStatus}
                  hintError={liveCoach.hintError}
                  canRequestHint={liveCoach.canRequestHint}
                  expandedConceptId={liveCoach.expandedConceptId}
                  primaryConcept={liveCoach.feedback?.primaryConcept ?? null}
                  secondaryConcept={liveCoach.feedback?.secondaryConcept ?? null}
                  onToggleConcept={liveCoach.toggleConcept}
                  onRequestHint={liveCoach.requestHint}
                  onDismiss={liveCoach.dismissFeedback}
                />
              ) : null}
              <MoveHistory moves={moves} boardSize={state.board.size} />
            </>
          )}
        </aside>

        {showPlayingSidebar && (
          <section className="go-game__mobile-meta">
            <PlayerPanel
              state={state}
              error={null}
              layout="mobile-meta"
              aiStatus={aiStatus}
              showAiThinkingIndicator={showAiThinkingIndicator}
            />
            <MoveHistory moves={moves} boardSize={state.board.size} compactEmpty />
          </section>
        )}

        <section className="go-game__mobile-controls">
          {isScoring && (
            <ScoringControls
              canResume={canResume}
              canConfirmScore={canConfirmScore}
              onAction={dispatchAction}
            />
          )}
        </section>
      </div>
      {confirmSheet}
    </main>
  );
}
