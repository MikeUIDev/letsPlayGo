import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { BEGINNER_TUTORIAL_COURSE } from './course';
import { loadTutorialProgress, resetTutorialProgress } from './progress';
import './tutorial.css';

export function TutorialHubPage() {
  const [progress, setProgress] = useState(() => loadTutorialProgress());

  const currentLessonId = useMemo(() => {
    if (!progress.lastLessonId) {
      return null;
    }
    if (progress.completedLessonIds.includes(progress.lastLessonId)) {
      return null;
    }
    return progress.lastLessonId;
  }, [progress.completedLessonIds, progress.lastLessonId]);

  return (
    <div className="tutorial-page" id="main-content" tabIndex={-1}>
      <div className="go-shell tutorial-page__inner">
        <header className="tutorial-header tutorial-header--hub">
          <p className="tutorial-header__eyebrow">Interactive Tutorial</p>
          <h1 className="tutorial-header__title">Learn Go by playing</h1>
          <p className="tutorial-header__intro">
            Short guided lessons on the board. Works offline — no AI backend required.
          </p>
        </header>

        <ol className="tutorial-lesson-list">
          {BEGINNER_TUTORIAL_COURSE.lessons.map((lesson) => {
            const completed = progress.completedLessonIds.includes(lesson.id);
            const isCurrent = currentLessonId === lesson.id;
            const href = `/learn/tutorial/${lesson.id}${completed ? '?replay=1' : ''}`;
            const statusLabel = completed ? 'Completed' : isCurrent ? 'Continue' : null;

            return (
              <li key={lesson.id}>
                <Link
                  to={href}
                  className={`tutorial-lesson-row${completed ? ' tutorial-lesson-row--completed' : ''}${isCurrent ? ' tutorial-lesson-row--current' : ''}`}
                  aria-label={`${lesson.title}. ${completed ? 'Completed. Replay lesson.' : isCurrent ? 'Continue lesson.' : 'Start lesson.'}`}
                >
                  <span
                    className={`tutorial-lesson-row__order${completed ? ' tutorial-lesson-row__order--done' : ''}`}
                    aria-hidden="true"
                  >
                    {completed ? '✓' : lesson.order}
                  </span>
                  <span className="tutorial-lesson-row__text">
                    <span className="tutorial-lesson-row__title">{lesson.title}</span>
                    <span className="tutorial-lesson-row__summary">{lesson.summary}</span>
                  </span>
                  <span className="tutorial-lesson-row__trailing">
                    {statusLabel ? (
                      <span className="tutorial-lesson-row__status">{statusLabel}</span>
                    ) : null}
                    <span className="tutorial-lesson-row__chevron" aria-hidden="true">
                      ›
                    </span>
                  </span>
                </Link>
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
