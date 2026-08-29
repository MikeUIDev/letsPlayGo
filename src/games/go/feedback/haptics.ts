import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativePlatform } from '../../../native/platform';
import type { FeedbackEvent } from './types';

async function runNativeHaptic(event: FeedbackEvent): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    switch (event) {
      case 'place':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'capture':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'illegal':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'success':
      case 'gameOver':
        await Haptics.notification({ type: NotificationType.Success });
        break;
    }
  } catch {
    // Ignore haptic failures (simulator, unsupported device, background).
  }
}

export function triggerHaptic(event: FeedbackEvent): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  void runNativeHaptic(event);
}
