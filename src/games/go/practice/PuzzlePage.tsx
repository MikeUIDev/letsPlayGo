import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { GoBoard } from '../components/GoBoard';
import { getNextPuzzleAfter, getPuzzleById } from './puzzles';
import { loadPracticeProgress } from './progress';
import { usePuzzleSession } from './usePuzzleSession';
import { PuzzleControls } from './components/PuzzleControls';
import { PuzzlePanel } from './components/PuzzlePanel';
import './practice.css';

export function PuzzlePage() {
  const { puzzleId = '' } = useParams();
  const navigate = useNavigate();
  const puzzle = getPuzzleById(puzzleId);

  if (!puzzle) {
    return <Navigate to="/practice" replace />;
  }

  return <PuzzleRunner key={puzzle.id} puzzle={puzzle} onExit={() => navigate('/practice', { replace: true })} />;
}

function PuzzleRunner({
  puzzle,
  onExit,
}: {
  puzzle: NonNullable<ReturnType<typeof getPuzzleById>>;
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    boardState,
    lastMove,
    stepIndex,
    feedbackState,
    feedbackMessage,
    hint,
    conceptHighlights,
    isSolved,
    canPlay,
    showHint,
    handlePlay,
    resetSession,
    retryStep,
  } = usePuzzleSession(puzzle);

  const progress = loadPracticeProgress();
  const nextPuzzle = getNextPuzzleAfter(puzzle.id, progress.solvedPuzzleIds);

  return (
    <div className="practice-page practice-page--puzzle" id="main-content" tabIndex={-1}>
      <div className="go-shell practice-page__inner">
        <header className="practice-header practice-header--compact">
          <p className="practice-header__eyebrow">Practice</p>
          <h1 className="practice-header__title">{puzzle.title}</h1>
        </header>

        <div className="practice-layout practice-layout--puzzle">
          <div className="practice-board-wrap">
            <GoBoard
              state={boardState}
              lastMove={lastMove}
              territoryMap={new Map()}
              deadStoneKeys={new Set()}
              humanCanPlay={canPlay}
              onPlay={handlePlay}
              onMarkDead={() => undefined}
              showCoordinates
              conceptHighlightKeys={conceptHighlights}
              touchFriendly={puzzle.boardSize >= 13}
            />
          </div>

          <PuzzlePanel
            puzzle={puzzle}
            feedbackState={feedbackState}
            feedbackMessage={isSolved ? 'Puzzle solved!' : feedbackMessage}
            hintMessage={hint?.message ?? null}
            stepIndex={stepIndex}
            totalSteps={puzzle.solution.length}
            isSolved={isSolved}
            actions={
              <PuzzleControls
                canHint={!isSolved && puzzle.hints.length > 0}
                canRetry={feedbackState === 'try-again'}
                canNext={isSolved}
                onHint={showHint}
                onRetry={retryStep}
                onReset={resetSession}
                onNext={() => {
                  if (nextPuzzle) {
                    const nextPath = `/practice/${nextPuzzle.id}`;
                    if (location.pathname !== nextPath) {
                      navigate(nextPath, { replace: true });
                    }
                  } else {
                    onExit();
                  }
                }}
              />
            }
          />
        </div>

        {isSolved && !nextPuzzle ? (
          <p className="practice-complete-note">
            Category complete. <Link to="/practice">Browse other puzzles</Link>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
