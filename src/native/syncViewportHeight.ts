/** Keep `--viewport-height` aligned with the visible area on iOS WebViews. */
export function syncViewportHeight(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  const update = () => {
    const height = window.visualViewport?.height ?? window.innerHeight;
    root.style.setProperty('--viewport-height', `${Math.round(height)}px`);
  };

  update();

  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);
}
