import { useMemo } from 'react';
import { FinishedControls, ScoringControls } from './components/ScoringControls';
import { GameControls } from './components/GameControls';
import { GameHeader } from './components/GameHeader';
import { GameOverPanel } from './components/GameOverPanel';
import { GoBoard } from './components/GoBoard';
import { MoveHistory } from './components/MoveHistory';
import { NewGameSetupScreen } from './components/NewGameSetupScreen';
import { PlayerPanel } from './components/PlayerPanel';
import { ResumeGameScreen } from './components/ResumeGameScreen';
import { ScoringPanel } from './components/ScoringPanel';
import { useGoGame } from './hooks/useGoGame';
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
  } = useGoGame();

  const lastMove = useMemo(() => (state ? getLastMovePosition(state) : null), [state]);
  const showPlayingSidebar = Boolean(state && !isScoring && !isEnded);
  const gridPhaseClass = isEnded ? 'ended' : isScoring ? 'scoring' : 'playing';

  if (view === 'resume' && resumeSnapshot) {
    return (
      <div className="go-app">
        <GameHeader />
        <ResumeGameScreen
          savedGame={resumeSnapshot}
          onResume={resumeSavedGame}
          onNewGame={openSetupFromResume}
          onDiscard={discardSavedGame}
        />
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="go-app">
        <GameHeader />
        <NewGameSetupScreen
          setup={setupDraft}
          canCancel={canCancelSetup}
          error={error}
          onSetupChange={updateSetupDraft}
          onStart={startGame}
          onCancel={cancelSetup}
          onImportSgf={importSgfFile}
        />
      </div>
    );
  }

  if (!state || !scoreBreakdown) {
    return null;
  }

  return (
    <div className="go-app">
      <GameHeader />

      <main className="go-game">
        <div className={`go-shell go-game__grid go-game__grid--${gridPhaseClass}`}>
          {showPlayingSidebar && (
            <section className="go-game__mobile-active">
              <PlayerPanel state={state} error={error} layout="active-only" aiStatus={aiStatus} />
            </section>
          )}

          {(isScoring || isEnded) && (
            <section className="go-game__mobile-scoring">
              {isScoring ? (
                <ScoringPanel breakdown={scoreBreakdown} error={error} />
              ) : (
                <GameOverPanel state={state} />
              )}
            </section>
          )}

          <section className="go-game__board-column">
            <GoBoard
              state={state}
              lastMove={lastMove}
              territoryMap={territoryMap}
              deadStoneKeys={deadStoneKeys}
              humanCanPlay={canPlay}
              onPlay={play}
              onMarkDead={markDead}
            />
            <div className="go-game__board-footer">
              {showPlayingSidebar && (
                <GameControls
                  className="go-game__controls--desktop"
                  canUndo={canUndo}
                  canAct={canAct}
                  canConfirmScore={canConfirmScore}
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
              {isEnded && (
                <FinishedControls
                  className="go-game__controls--desktop"
                  onNewGame={openSetup}
                  onExportSgf={exportCurrentSgf}
                />
              )}
            </div>
          </section>

          <aside className="go-game__sidebar">
            {isScoring && <ScoringPanel breakdown={scoreBreakdown} error={error} />}
            {isEnded && <GameOverPanel state={state} />}
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
            {isEnded && (
              <FinishedControls onNewGame={openSetup} onExportSgf={exportCurrentSgf} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
