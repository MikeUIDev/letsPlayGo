type GameStatusBannerProps = {
  message: string;
  variant?: 'error' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  dismissLabel?: string;
};

export function GameStatusBanner({
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  retryLabel = 'Retry',
  dismissLabel = 'Dismiss',
}: GameStatusBannerProps) {
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div className={`game-status-banner game-status-banner--${variant}`} role={role}>
      <p className="game-status-banner__message">{message}</p>
      {(onRetry || onDismiss) && (
        <div className="game-status-banner__actions">
          {onRetry ? (
            <button
              type="button"
              className="control-button control-button--secondary game-status-banner__retry"
              onClick={onRetry}
            >
              {retryLabel}
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="game-status-banner__action game-status-banner__action--muted" onClick={onDismiss}>
              {dismissLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
