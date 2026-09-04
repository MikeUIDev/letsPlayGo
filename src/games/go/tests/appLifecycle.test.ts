import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import {
  getAppLifecycleActiveStateForTests,
  isAppForeground,
  registerAppLifecycle,
  resetAppLifecycleForTests,
  simulateAppBackgroundForTests,
  simulateAppForegroundForTests,
  simulatePageShowForTests,
} from '../../../native/appLifecycle';

describe('app lifecycle', () => {
  beforeEach(() => {
    resetAppLifecycleForTests();
  });

  afterEach(() => {
    resetAppLifecycleForTests();
  });

  it('deduplicates repeated background notifications', () => {
    const onBackground = vi.fn();
    registerAppLifecycle({ onBackground });

    simulateAppBackgroundForTests();
    simulateAppBackgroundForTests();

    expect(onBackground).toHaveBeenCalledTimes(1);
    expect(getAppLifecycleActiveStateForTests()).toBe(false);
  });

  it('notifies foreground after background', () => {
    const onBackground = vi.fn();
    const onForeground = vi.fn();
    registerAppLifecycle({ onBackground, onForeground });

    simulateAppBackgroundForTests();
    simulateAppForegroundForTests();
    simulateAppForegroundForTests();

    expect(onBackground).toHaveBeenCalledTimes(1);
    expect(onForeground).toHaveBeenCalledTimes(1);
    expect(getAppLifecycleActiveStateForTests()).toBe(true);
  });

  it('removes listeners when the last registration unsubscribes', () => {
    const first = vi.fn();
    const second = vi.fn();

    const unregisterFirst = registerAppLifecycle({ onBackground: first });
    const unregisterSecond = registerAppLifecycle({ onBackground: second });

    simulateAppBackgroundForTests();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    resetAppLifecycleForTests();
    first.mockClear();
    second.mockClear();

    const unregisterOnly = registerAppLifecycle({ onBackground: first });
    simulateAppBackgroundForTests();
    expect(first).toHaveBeenCalledTimes(1);

    unregisterOnly();
    first.mockClear();
    simulateAppBackgroundForTests();
    expect(first).not.toHaveBeenCalled();

    void unregisterFirst;
    void unregisterSecond;
  });

  it('supports multiple independent registrations', () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    registerAppLifecycle({ onBackground: handlerA });
    registerAppLifecycle({ onBackground: handlerB });

    simulateAppBackgroundForTests();

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('restores foreground after pagehide via pageshow (bfcache restore)', () => {
    const onForeground = vi.fn();
    registerAppLifecycle({ onForeground });

    simulateAppBackgroundForTests();
    expect(getAppLifecycleActiveStateForTests()).toBe(false);

    simulatePageShowForTests();

    expect(onForeground).toHaveBeenCalledTimes(1);
    expect(getAppLifecycleActiveStateForTests()).toBe(true);
    expect(isAppForeground()).toBe(true);
  });
});
