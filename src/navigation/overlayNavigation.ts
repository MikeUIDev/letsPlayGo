type OverlayCloser = () => void;

const overlayClosers = new Set<OverlayCloser>();

/** Register a menu/modal close handler (e.g. More menu). Returns unregister. */
export function registerOverlayCloser(closer: OverlayCloser): () => void {
  overlayClosers.add(closer);
  return () => overlayClosers.delete(closer);
}

export function closeRegisteredOverlays(): void {
  overlayClosers.forEach((closer) => closer());
}
