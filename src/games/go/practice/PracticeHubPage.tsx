import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  PRACTICE_CATEGORIES,
  difficultyLabel,
  getPracticeCategoryUrl,
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

  return (
    <div className="practice-page" id="main-content" tabIndex={-1}>
      <div className="go-shell practice-page__inner">
        <header className="practice-header">
          <p className="practice-header__eyebrow">Practice</p>
          <h1 className="practice-header__title">Go Puzzles</h1>
          <p className="practice-header__intro">
            Solve short positions offline. {solvedCount} / {totalCount} solved.
          </p>
        </header>

        {nextPuzzle ? (
          <div className="practice-resume">
            <p>
              Continue with: <strong>{nextPuzzle.title}</strong> ({difficultyLabel(nextPuzzle.difficulty)})
            </p>
            <Link to={`/practice/${nextPuzzle.id}`} className="practice-resume__link">
              Start next unsolved puzzle
            </Link>
          </div>
        ) : (
          <div className="practice-resume practice-resume--complete">
            <p>You solved every starter puzzle. Replay any category below.</p>
          </div>
        )}

        <div className="practice-category-list">
          {(categoryFilter
            ? PRACTICE_CATEGORIES.filter((category) => category.id === categoryFilter)
            : PRACTICE_CATEGORIES
          ).map((category) => {
            const puzzles = getPuzzlesByCategory(category.id);
            const solved = puzzles.filter((puzzle) => progress.solvedPuzzleIds.includes(puzzle.id)).length;
            return (
              <section key={category.id} className="practice-category-card">
                <div className="practice-category-card__header">
                  <h2 className="practice-category-card__title">{category.label}</h2>
                  <p className="practice-category-card__summary">
                    {puzzles.length} puzzles · {solved} solved
                  </p>
                  <p className="practice-category-card__description">{category.description}</p>
                </div>
                <ul className="practice-puzzle-list">
                  {puzzles.map((puzzle) => {
                    const isSolved = progress.solvedPuzzleIds.includes(puzzle.id);
                    return (
                      <li key={puzzle.id} className="practice-puzzle-list__item">
                        <div>
                          <p className="practice-puzzle-list__title">{puzzle.title}</p>
                          <p className="practice-puzzle-list__meta">{difficultyLabel(puzzle.difficulty)}</p>
                        </div>
                        <div className="practice-puzzle-list__actions">
                          {isSolved ? <span className="practice-puzzle-list__badge">Solved</span> : null}
                          <Link to={`/practice/${puzzle.id}`} className="practice-puzzle-list__link">
                            {isSolved ? 'Replay' : 'Solve'}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Link to={getPracticeCategoryUrl(category.id)} className="practice-category-card__browse">
                  Browse {category.label}
                </Link>
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
