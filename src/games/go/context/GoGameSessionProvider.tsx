import { createContext, useContext, type ReactNode } from 'react';
import { useGoGame, type UseGoGameResult } from '../hooks/useGoGame';

const GoGameSessionContext = createContext<UseGoGameResult | null>(null);

/** Keeps active game state in memory while navigating to Learn/Practice routes. */
export function GoGameSessionProvider({ children }: { children: ReactNode }) {
  const session = useGoGame();
  return <GoGameSessionContext.Provider value={session}>{children}</GoGameSessionContext.Provider>;
}

export function useGoGameSession(): UseGoGameResult {
  const session = useContext(GoGameSessionContext);
  if (!session) {
    throw new Error('useGoGameSession must be used within GoGameSessionProvider');
  }
  return session;
}
