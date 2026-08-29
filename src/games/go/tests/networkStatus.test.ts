import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getNetworkOnlineStateForTests,
  isNetworkOnline,
  registerNetworkStatusListener,
  resetNetworkStatusForTests,
  simulateNetworkOfflineForTests,
  simulateNetworkOnlineForTests,
} from '../../../native/networkStatus';

describe('network status', () => {
  beforeEach(() => {
    resetNetworkStatusForTests();
  });

  afterEach(() => {
    resetNetworkStatusForTests();
  });

  it('starts online in tests', () => {
    expect(isNetworkOnline()).toBe(true);
  });

  it('notifies listeners on offline/online transitions', () => {
    const listener = vi.fn();
    registerNetworkStatusListener(listener);
    listener.mockClear();

    simulateNetworkOfflineForTests();
    simulateNetworkOfflineForTests();
    simulateNetworkOnlineForTests();
    simulateNetworkOnlineForTests();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0]?.[0]).toBe(false);
    expect(listener.mock.calls[1]?.[0]).toBe(true);
    expect(getNetworkOnlineStateForTests()).toBe(true);
  });

  it('removes listeners when unsubscribed', () => {
    const listener = vi.fn();
    const unregister = registerNetworkStatusListener(listener);
    listener.mockClear();
    unregister();

    simulateNetworkOfflineForTests();
    expect(listener).not.toHaveBeenCalled();
  });
});
