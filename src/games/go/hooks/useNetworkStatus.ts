import { useEffect, useState } from 'react';
import { isNetworkOnline, registerNetworkStatusListener } from '../../../native/networkStatus';

/** React hook for connectivity state with shared native/web listeners. */
export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(() => isNetworkOnline());

  useEffect(() => {
    return registerNetworkStatusListener(setIsOnline);
  }, []);

  return { isOnline };
}
