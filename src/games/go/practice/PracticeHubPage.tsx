import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  PRACTICE_CATEGORIES,
  difficultyLabel,
} from './categories';
import {
  loadPracticeProgress,
  resetPracticeProgress,
} from './progress';
import {
  getNextUnsolvedPuzzle,
  getPuzzlesByCategory,
  PRACTICE_PUZZLES,
} from './puzzles';
import type { PuzzleCategory } from './types';
import './practice.css';

export function PracticeHubPage() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') as PuzzleCategory | null;
  const [progress, setProgress] = useState(() => loadPracticeProgress());

  const solvedCount = progress.solvedPuzzleIds.length;
  const totalCount = PRACTICE_PUZZLES.length;

  const nextPuzzle = useMemo(
    () => getNextUnsolvedPuzzle(progress.solvedPuzzleIds, categoryFilter ?? undefined),
    [categoryFilter, progress.solvedPuzzleIds],
  );

  const categories = categoryFilter
    ? PRACTICE_CATEGORIES.filter((category) => category.id === categoryFilter)
    : PRACTICE_CATEGORIES;

  return (
    <div className="practice-page" id="main-content" tabIndex={-1}>
      <div className="go-shell practice-page__inner">
        <header className="practice-header practice-header--hub">
          <p className="practice-header__eyebrow">Practice</p>
          <h1 className="practice-header__title">Go Puzzles</h1>
          <p className="practice-header__progress" aria-live="polite">
            {solvedCount} of {totalCount} solved
          </p>
        </header>

        {nextPuzzle ? (
          <Link to={`/practice/${nextPuzzle.id}`} className="practice-continue">
            <span className="practice-continue__action">Continue</span>
            <span className="practice-continue__title">{nextPuzzle.title}</span>
            <span className="practice-continue__meta">{difficultyLabel(nextPuzzle.difficulty)}</span>
          </Link>
        ) : (
          <div className="practice-continue practice-continue--complete" role="status">
            <span className="practice-continue__action">All solved</span>
            <span className="practice-continue__title">Replay any puzzle below</span>
          </div>
        )}

        {categoryFilter ? (
          <p className="practice-filter-bar">
            <Link to="/practice" className="practice-filter-bar__link">
              ← All categories
            </Link>
          </p>
        ) : null}

        <div className="practice-category-list">
          {categories.map((category) => {
            const puzzles = getPuzzlesByCategory(category.id);
            const solved = puzzles.filter((puzzle) =>
              progress.solvedPuzzleIds.includes(puzzle.id),
            ).length;

            return (
              <section key={category.id} className="practice-category-card" aria-labelledby={`practice-cat-${category.id}`}>
                <div className="practice-category-card__header">
                  <h2 id={`practice-cat-${category.id}`} className="practice-category-card__title">
                    {category.label}
                  </h2>
                  <p className="practice-category-card__summary">
                    {solved} of {puzzles.length} solved
                  </p>
                </div>
                <ul className="practice-puzzle-list">
                  {puzzles.map((puzzle) => {
                    const isSolved = progress.solvedPuzzleIds.includes(puzzle.id);
                    return (
                      <li
                        key={puzzle.id}
                        className={`practice-puzzle-list__item${isSolved ? ' practice-puzzle-list__item--solved' : ''}`}
                      >
                        <div className="practice-puzzle-list__main">
                          <p className="practice-puzzle-list__title">{puzzle.title}</p>
                          {isSolved ? (
                            <p className="practice-puzzle-list__status">
                              <span className="practice-puzzle-list__check" aria-hidden="true">
                                ✓
                              </span>
                              Solved
                            </p>
                          ) : (
                            <p className="practice-puzzle-list__meta">
                              {difficultyLabel(puzzle.difficulty)}
                            </p>
                          )}
                        </div>
                        <Link
                          to={`/practice/${puzzle.id}`}
                          className={`practice-puzzle-list__link${isSolved ? '' : ' practice-puzzle-list__link--start'}`}
                        >
                          {isSolved ? 'Replay' : 'Start'}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="practice-hub-footer">
          <Link to="/learn" className="practice-hub-footer__link">
            ← Back to Learn
          </Link>
          <Link to="/learn/tutorial" className="practice-hub-footer__link">
            Interactive Tutorial
          </Link>
          <button
            type="button"
            className="practice-hub-footer__reset"
            onClick={() => setProgress(resetPracticeProgress())}
          >
            Reset puzzle progress
          </button>
        </div>
      </div>
    </div>
  );
}
