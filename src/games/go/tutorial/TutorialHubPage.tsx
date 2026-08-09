import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { BEGINNER_TUTORIAL_COURSE } from './course';
import { loadTutorialProgress, resetTutorialProgress } from './progress';
import './tutorial.css';

export function TutorialHubPage() {
  const [progress, setProgress] = useState(() => loadTutorialProgress());

  const resumeLesson = useMemo(() => {
    if (!progress.lastLessonId) {
      return null;
    }
    return BEGINNER_TUTORIAL_COURSE.lessons.find((lesson) => lesson.id === progress.lastLessonId) ?? null;
  }, [progress.lastLessonId]);

  return (
    <div className="tutorial-page">
      <div className="go-shell tutorial-page__inner">
        <header className="tutorial-header">
          <p className="tutorial-header__eyebrow">Interactive Tutorial</p>
          <h1 className="tutorial-header__title">Learn Go by playing</h1>
          <p className="tutorial-header__intro">
            Short guided lessons on the board. Works offline — no AI backend required.
          </p>
        </header>

        {resumeLesson ? (
          <div className="tutorial-resume">
            <p>
              Continue where you left off: <strong>{resumeLesson.title}</strong>
            </p>
            <Link to={`/learn/tutorial/${resumeLesson.id}`} className="tutorial-resume__link">
              Resume lesson
            </Link>
          </div>
        ) : null}

        <ol className="tutorial-lesson-list">
          {BEGINNER_TUTORIAL_COURSE.lessons.map((lesson) => {
            const completed = progress.completedLessonIds.includes(lesson.id);
            return (
              <li key={lesson.id} className="tutorial-lesson-list__item">
                <div className="tutorial-lesson-list__meta">
                  <span className="tutorial-lesson-list__order">{lesson.order}</span>
                  <div>
                    <h2 className="tutorial-lesson-list__title">{lesson.title}</h2>
                    <p className="tutorial-lesson-list__summary">{lesson.summary}</p>
                  </div>
                </div>
                <div className="tutorial-lesson-list__actions">
                  {completed ? <span className="tutorial-lesson-list__badge">Completed</span> : null}
                  <Link
                    to={`/learn/tutorial/${lesson.id}${completed ? '?replay=1' : ''}`}
                    className="tutorial-lesson-list__link"
                  >
                    {completed ? 'Replay' : 'Start'}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="tutorial-hub-footer">
          <Link to="/learn" className="tutorial-hub-footer__link">
            ← Back to Learn reference
          </Link>
          <button
            type="button"
            className="tutorial-hub-footer__reset"
            onClick={() => {
              setProgress(resetTutorialProgress());
            }}
          >
            Restart tutorial progress
          </button>
        </div>
      </div>
    </div>
  );
}
