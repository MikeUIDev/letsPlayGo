type LiveAnnouncerProps = {
  message: string | null;
  politeness?: 'polite' | 'assertive';
};

/** Off-screen live region for concise screen reader updates. */
export function LiveAnnouncer({ message, politeness = 'polite' }: LiveAnnouncerProps) {
  return (
    <div className="visually-hidden" aria-live={politeness} aria-atomic="true">
      {message ?? ''}
    </div>
  );
}
