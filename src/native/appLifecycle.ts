import { isNativePlatform } from './platform';

export type AppLifecycleHandlers = {
  onBackground?: () => void;
  onForeground?: () => void;
};

const registrations = new Set<AppLifecycleHandlers>();
let isActive = true;
let listenersAttached = false;
let removeNativeListener: (() => void) | null = null;
let removeWebListeners: (() => void) | null = null;

function notifyBackground(): void {
  if (!isActive) {
    return;
  }

  isActive = false;
  for (const registration of registrations) {
    registration.onBackground?.();
  }
}

function notifyForeground(): void {
  if (isActive) {
    return;
  }

  isActive = true;
  for (const registration of registrations) {
    registration.onForeground?.();
  }
}

function attachWebListeners(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      notifyBackground();
    } else if (document.visibilityState === 'visible') {
      notifyForeground();
    }
  };

  const onPageHide = () => {
    notifyBackground();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  removeWebListeners = () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
  };
}

async function attachNativeListeners(): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('appStateChange', ({ isActive: active }) => {
      if (active) {
        notifyForeground();
      } else {
        notifyBackground();
      }
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
  isActive = true;
}

/**
 * Register foreground/background handlers. Uses Capacitor App on native platforms
 * and visibility/page lifecycle events on web. Listeners are shared and removed
 * when the last registration is unsubscribed.
 */
export function registerAppLifecycle(handlers: AppLifecycleHandlers): () => void {
  registrations.add(handlers);
  attachListeners();

  return () => {
    registrations.delete(handlers);
    if (registrations.size === 0) {
      detachListeners();
    }
  };
}

/** True when the app is considered visible/active (best-effort on web). */
export function isAppForeground(): boolean {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false;
  }

  return isActive;
}

/** Test helpers */
export function resetAppLifecycleForTests(): void {
  registrations.clear();
  detachListeners();
  isActive = true;
}

export function simulateAppBackgroundForTests(): void {
  notifyBackground();
}

export function simulateAppForegroundForTests(): void {
  notifyForeground();
}

export function getAppLifecycleActiveStateForTests(): boolean {
  return isActive;
}
