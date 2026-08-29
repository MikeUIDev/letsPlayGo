import { isNativePlatform } from './platform';

const listeners = new Set<(online: boolean) => void>();
let isOnline = readBrowserOnline();
let listenersAttached = false;
let removeNativeListener: (() => void) | null = null;
let removeWebListeners: (() => void) | null = null;

function readBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

function notify(online: boolean): void {
  if (isOnline === online) {
    return;
  }

  isOnline = online;
  for (const listener of listeners) {
    listener(online);
  }
}

function attachWebListeners(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const onOnline = () => notify(true);
  const onOffline = () => notify(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  removeWebListeners = () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

async function attachNativeListeners(): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    isOnline = status.connected;

    const handle = await Network.addListener('networkStatusChange', (status) => {
      notify(status.connected);
    });

    removeNativeListener = () => {
      void handle.remove();
    };
    return true;
  } catch {
    return false;
  }
}

function attachListeners(): void {
  if (listenersAttached) {
    return;
  }

  listenersAttached = true;
  isOnline = readBrowserOnline();

  if (isNativePlatform()) {
    void attachNativeListeners().then((nativeAttached) => {
      if (!nativeAttached) {
        attachWebListeners();
      }
    });
    return;
  }

  attachWebListeners();
}

function detachListeners(): void {
  removeNativeListener?.();
  removeNativeListener = null;
  removeWebListeners?.();
  removeWebListeners = null;
  listenersAttached = false;
  isOnline = readBrowserOnline();
}

/** Best-effort online check used before network requests. */
export function isNetworkOnline(): boolean {
  return isOnline;
}

/** Subscribe to connectivity changes. Returns an unsubscribe function. */
export function registerNetworkStatusListener(listener: (online: boolean) => void): () => void {
  listeners.add(listener);
  attachListeners();
  listener(isOnline);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detachListeners();
    }
  };
}

/** Test helpers */
export function resetNetworkStatusForTests(): void {
  listeners.clear();
  detachListeners();
  isOnline = true;
}

export function simulateNetworkOfflineForTests(): void {
  notify(false);
}

export function simulateNetworkOnlineForTests(): void {
  notify(true);
}

export function getNetworkOnlineStateForTests(): boolean {
  return isOnline;
}
