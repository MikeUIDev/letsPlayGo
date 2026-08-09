import { useEffect, useRef, useState } from 'react';
import type { GameAction } from '../engine/types';
import { SgfFileInput } from './SgfFileInput';

interface GameControlsProps {
  canUndo: boolean;
  canAct: boolean;
  canConfirmScore: boolean;
  showCoordinates: boolean;
  onToggleCoordinates: () => void;
  onAction: (action: GameAction) => void;
  onNewGame: () => void;
  onExportSgf: () => void;
  onImportSgf: (content: string) => void;
  className?: string;
}

export function GameControls({
  canUndo,
  canAct,
  canConfirmScore,
  showCoordinates,
  onToggleCoordinates,
  onAction,
  onNewGame,
  onExportSgf,
  onImportSgf,
  className = '',
}: GameControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  function run(action: GameAction) {
    onAction(action);
    setMenuOpen(false);
  }

  return (
    <div className={`game-controls ${className}`.trim()}>
      <button
        type="button"
        className="control-button control-button--secondary"
        disabled={!canUndo}
        onClick={() => onAction({ type: 'undo' })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10 19a1 1 0 0 1-.78-.37l-4-5a1 1 0 0 1 0-1.26l4-5A1 1 0 0 1 11 8h6.5A4.5 4.5 0 0 1 22 12.5v.5a1 1 0 0 1-2 0v-.5A2.5 2.5 0 0 0 17.5 10H12.8l-2.88 3.6L12.8 17H17.5A2.5 2.5 0 0 0 20 14.5a1 1 0 0 1 2 0A4.5 4.5 0 0 1 17.5 19H11Z"
            fill="currentColor"
          />
        </svg>
        Undo
      </button>

      <button
        type="button"
        className="control-button control-button--primary"
        disabled={!canAct}
        onClick={() => onAction({ type: 'pass' })}
      >
        Pass
      </button>

      <div className="more-menu" ref={menuRef}>
        <button
          type="button"
          className="control-button control-button--secondary"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            <circle cx="18" cy="12" r="1.6" fill="currentColor" />
          </svg>
          More
        </button>
        {menuOpen && (
          <div className="more-menu__panel" role="menu">
            <button
              type="button"
              role="menuitem"
              className="more-menu__item"
              onClick={() => {
                setMenuOpen(false);
                onNewGame();
              }}
            >
              New Game
            </button>
            <button
              type="button"
              role="menuitem"
              className="more-menu__item"
              onClick={() => {
                setMenuOpen(false);
                onExportSgf();
              }}
            >
              Export SGF
            </button>
            <SgfFileInput id="controls-import-sgf" onFileSelected={onImportSgf}>
              {(openFilePicker) => (
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    openFilePicker();
                  }}
                >
                  Import SGF
                </button>
              )}
            </SgfFileInput>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={showCoordinates}
              className="more-menu__item"
              onClick={onToggleCoordinates}
            >
              Show coordinates
            </button>
            <button
              type="button"
              role="menuitem"
              className="more-menu__item"
              disabled={!canAct}
              onClick={() => run({ type: 'resign' })}
            >
              Resign
            </button>
            {canConfirmScore && (
              <button
                type="button"
                role="menuitem"
                className="more-menu__item"
                onClick={() => run({ type: 'confirmScore' })}
              >
                Confirm Score
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
