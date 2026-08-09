import { useCallback, useMemo, useState } from 'react';
import {
  loadCoordinatesPreference,
  resolveShowCoordinates,
  saveCoordinatesPreference,
  type CoordinateDisplayContext,
  type CoordinatesPreference,
} from '../coordinates';

export function useCoordinatesPreference(context: CoordinateDisplayContext) {
  const [preference, setPreference] = useState<CoordinatesPreference>(() => loadCoordinatesPreference());

  const showCoordinates = useMemo(
    () => resolveShowCoordinates(preference, context),
    [context, preference],
  );

  const toggleCoordinates = useCallback(() => {
    setPreference((current) => {
      const next: CoordinatesPreference = resolveShowCoordinates(current, context) ? 'off' : 'on';
      saveCoordinatesPreference(next);
      return next;
    });
  }, [context]);

  const setCoordinatesPreference = useCallback((next: CoordinatesPreference) => {
    saveCoordinatesPreference(next);
    setPreference(next);
  }, []);

  return {
    preference,
    showCoordinates,
    toggleCoordinates,
    setCoordinatesPreference,
  };
}
