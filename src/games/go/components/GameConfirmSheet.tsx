import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../../accessibility/useFocusTrap';
import { registerOverlayCloser } from '../../../navigation/overlayNavigation';

export type GameConfirmSheetProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GameConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: GameConfirmSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const historyPushedRef = useRef(false);
  const closingFromHistoryRef = useRef(false);
  const lockedRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const dismissHistoryEntry = useCallback(() => {
    if (historyPushedRef.current) {
      closingFromHistoryRef.current = true;
      history.back();
      historyPushedRef.current = false;
    }
  }, []);

  const settle = useCallback(
    (action: () => void) => {
      if (lockedRef.current) {
        return;
      }
      lockedRef.current = true;
      setBusy(true);
      dismissHistoryEntry();
      action();
    },
    [dismissHistoryEntry],
  );

  const handleCancel = useCallback(() => {
    settle(onCancel);
  }, [onCancel, settle]);

  const handleConfirm = useCallback(() => {
    settle(onConfirm);
  }, [onConfirm, settle]);

  useFocusTrap({
    active: open,
    containerRef: panelRef,
    onEscape: handleCancel,
    initialFocus: 'first',
    restoreFocus: true,
  });

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      closingFromHistoryRef.current = false;
      lockedRef.current = false;
      setBusy(false);
      return;
    }

    lockedRef.current = false;
    setBusy(false);

    const onPopState = () => {
      if (closingFromHistoryRef.current) {
        closingFromHistoryRef.current = false;
        return;
      }
      if (lockedRef.current) {
        return;
      }
      historyPushedRef.current = false;
      lockedRef.current = true;
      setBusy(true);
      onCancel();
    };

    history.pushState({ gameSheet: true }, '');
    historyPushedRef.current = true;
    window.addEventListener('popstate', onPopState);

    const unregisterOverlay = registerOverlayCloser(handleCancel);

    return () => {
      window.removeEventListener('popstate', onPopState);
      unregisterOverlay();
    };
  }, [handleCancel, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="game-sheet" role="presentation">
      <button
        type="button"
        className="game-sheet__backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={handleCancel}
      />
      <div
        ref={panelRef}
        className="game-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-sheet-title"
        aria-describedby="game-sheet-message"
      >
        <header className="game-sheet__header">
          <h2 id="game-sheet-title" className="game-sheet__title">
            {title}
          </h2>
          <p id="game-sheet-message" className="game-sheet__message">
            {message}
          </p>
        </header>
        <div className="game-sheet__actions">
          <button
            type="button"
            className="control-button control-button--secondary game-sheet__button"
            disabled={busy}
            onClick={handleCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`control-button game-sheet__button${destructive ? ' control-button--destructive' : ' control-button--primary'}`}
            disabled={busy}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
