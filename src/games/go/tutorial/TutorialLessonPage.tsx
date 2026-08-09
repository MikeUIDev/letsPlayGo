import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GoBoard } from '../components/GoBoard';
import { BEGINNER_TUTORIAL_COURSE, getNextLessonId, getTutorialLesson } from './course';
import { loadTutorialProgress } from './progress';
import { useTutorialLesson } from './useTutorialLesson';
import { TutorialControls } from './components/TutorialControls';
import { TutorialInstructionPanel } from './components/TutorialInstructionPanel';
import './tutorial.css';

export function TutorialLessonPage() {
  const { lessonId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const lesson = getTutorialLesson(lessonId);

  if (!lesson) {
    return <Navigate to="/learn/tutorial" replace />;
  }

  const progress = loadTutorialProgress();
  const replay = searchParams.get('replay') === '1';
  const resumeStep =
    !replay && progress.lastLessonId === lesson.id ? progress.lastStepIndex : 0;
  const initialStep = Math.min(resumeStep, lesson.steps.length - 1);

  return <TutorialLessonRunner key={`${lesson.id}-${initialStep}-${replay}`} lesson={lesson} initialStep={initialStep} />;
}

function TutorialLessonRunner({
  lesson,
  initialStep,
}: {
  lesson: NonNullable<ReturnType<typeof getTutorialLesson>>;
  initialStep: number;
}) {
  const {
    stepIndex,
    currentStep,
    isComplete,
    boardState,
    lastMove,
    feedbackState,
    feedbackMessage,
    hint,
    tipMessage,
    territoryMap,
    conceptHighlights,
    showBoard,
    canPlay,
    canPass,
    showHint,
    handlePlay,
    handlePass,
    handleContinue,
    advanceStep,
    goToPreviousStep,
  } = useTutorialLesson(lesson, initialStep);

  const nextLessonId = getNextLessonId(lesson.id);
  const lessonNumber = lesson.order;
  const totalLessons = BEGINNER_TUTORIAL_COURSE.lessons.length;
  const navigate = useNavigate();
  const allowIllegalPlays = Boolean(
    currentStep?.kind === 'play' && currentStep.expectIllegal,
  );

  if (isComplete || feedbackState === 'complete') {
    return (
      <div className="tutorial-page">
        <div className="go-shell tutorial-page__inner">
          <header className="tutorial-header">
            <p className="tutorial-header__eyebrow">Tutorial</p>
            <h1 className="tutorial-header__title">Lesson complete!</h1>
            <p className="tutorial-header__intro">{lesson.title} finished.</p>
          </header>
          <div className="tutorial-complete">
            {nextLessonId ? (
              <Link to={`/learn/tutorial/${nextLessonId}`} className="tutorial-complete__link">
                Continue to next lesson →
              </Link>
            ) : (
              <p className="tutorial-complete__message">You finished the beginner course!</p>
            )}
            <Link to="/learn/tutorial" className="tutorial-complete__link tutorial-complete__link--secondary">
              Back to all lessons
            </Link>
            <Link to="/learn" className="tutorial-complete__link tutorial-complete__link--secondary">
              Return to Learn reference
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isInfoStep = currentStep?.kind === 'info';
  const canContinue = isInfoStep || feedbackState === 'correct';
  const canHint =
    Boolean(currentStep && (currentStep.kind === 'play' || currentStep.kind === 'pass')) &&
    feedbackState !== 'correct';

  return (
    <div className="tutorial-page">
      <div className="go-shell tutorial-page__inner">
        <header className="tutorial-header">
          <p className="tutorial-header__eyebrow">Tutorial</p>
          <h1 className="tutorial-header__title">{lesson.title}</h1>
          <p className="tutorial-header__intro">{lesson.summary}</p>
          <div className="tutorial-progress-bar" aria-hidden="true">
            <div
              className="tutorial-progress-bar__fill"
              style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }}
            />
          </div>
          <p className="tutorial-progress-bar__label">
            Step {stepIndex + 1} of {lesson.steps.length}
          </p>
        </header>

        <div className="tutorial-layout">
          <TutorialInstructionPanel
            step={currentStep}
            lessonTitle={lesson.title}
            lessonNumber={lessonNumber}
            totalLessons={totalLessons}
            feedbackState={feedbackState}
            feedbackMessage={feedbackMessage}
            tipMessage={tipMessage}
            hintMessage={hint?.message ?? null}
          />

          {showBoard && boardState ? (
            <div className="tutorial-board-wrap">
              <GoBoard
                state={boardState}
                lastMove={lastMove}
                territoryMap={territoryMap}
                deadStoneKeys={new Set()}
                humanCanPlay={canPlay}
                onPlay={handlePlay}
                onMarkDead={() => undefined}
                reviewMode={isInfoStep}
                showCoordinates
                conceptHighlightKeys={conceptHighlights}
                allowIllegalPlays={allowIllegalPlays}
              />
            </div>
          ) : null}
        </div>

        <TutorialControls
          feedbackState={feedbackState}
          canContinue={canContinue}
          canPrevious={stepIndex > 0}
          canPass={canPass}
          canHint={canHint}
          onContinue={() => {
            if (feedbackState === 'correct') {
              handleContinue();
            } else {
              advanceStep();
            }
          }}
          onPrevious={goToPreviousStep}
          onPass={handlePass}
          onHint={showHint}
          onExit={() => navigate('/learn/tutorial')}
        />
      </div>
    </div>
  );
}
