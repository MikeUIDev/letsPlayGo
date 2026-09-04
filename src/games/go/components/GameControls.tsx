import { useEffect, useRef, useState } from 'react';
import type { GameAction } from '../engine/types';
import { getFocusableElements } from '../../../accessibility/focusTrap';
import { registerOverlayCloser } from '../../../navigation/overlayNavigation';
import { SgfFileInput } from './SgfFileInput';

interface GameControlsProps {
  canUndo: boolean;
  canAct: boolean;
  canConfirmScore: boolean;
  showCoordinates: boolean;
  onToggleCoordinates: () => void;
  onAction: (action: GameAction) => void;
  onRequestPass: () => void;
  onRequestResign: () => void;
  onRequestNewGame: () => void;
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
  onRequestPass,
  onRequestResign,
  onRequestNewGame,
  onExportSgf,
  onImportSgf,
  className = '',
}: GameControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return registerOverlayCloser(() => setMenuOpen(false));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"]',
    );
    firstItem?.focus();

    function closeMenu() {
      setMenuOpen(false);
      moreButtonRef.current?.focus();
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }

    function handleMenuKeyDown(event: KeyboardEvent) {
      const panel = menuRef.current?.querySelector<HTMLElement>('[role="menu"]');
      if (!panel) {
        return;
      }

      const items = getFocusableElements(panel).filter(
        (element) =>
          element.getAttribute('role') === 'menuitem' ||
          element.getAttribute('role') === 'menuitemcheckbox',
      );
      const index = items.findIndex((item) => item === document.activeElement);
      if (index === -1) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items.at(-1)?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleMenuKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleMenuKeyDown);
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
        onClick={onRequestPass}
      >
        Pass
      </button>

      <div className="more-menu" ref={menuRef}>
        <button
          ref={moreButtonRef}
          type="button"
          className="control-button control-button--secondary"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="More game actions"
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
          <div className="more-menu__panel" role="menu" aria-label="More game actions">
            <button
              type="button"
              role="menuitem"
              className="more-menu__item"
              onClick={() => {
                setMenuOpen(false);
                moreButtonRef.current?.focus();
                onRequestNewGame();
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
              onClick={() => {
                onToggleCoordinates();
                setMenuOpen(false);
              }}
            >
              {showCoordinates ? 'Hide coordinates' : 'Show coordinates'}
            </button>
            <div className="more-menu__separator" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="more-menu__item more-menu__item--destructive"
              disabled={!canAct}
              onClick={() => {
                setMenuOpen(false);
                moreButtonRef.current?.focus();
                onRequestResign();
              }}
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
