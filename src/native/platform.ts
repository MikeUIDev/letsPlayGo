import { Capacitor } from '@capacitor/core';

/** True when running inside a Capacitor native shell (iOS/Android). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
