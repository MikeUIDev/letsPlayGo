import { useEffect, useState } from 'react';
import { prefersCoarsePointer } from './touchPlacement';

/** Reactive `(pointer: coarse)` — enables confirm-on-second-tap only on touch devices. */
export function usePrefersCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(prefersCoarsePointer);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const coarseMedia = window.matchMedia('(pointer: coarse)');
    const fineMedia = window.matchMedia('(pointer: fine)');
    const sync = () => setCoarse(coarseMedia.matches && !fineMedia.matches);
    sync();
    coarseMedia.addEventListener('change', sync);
    fineMedia.addEventListener('change', sync);
    return () => {
      coarseMedia.removeEventListener('change', sync);
      fineMedia.removeEventListener('change', sync);
    };
  }, []);

  return coarse;
}
