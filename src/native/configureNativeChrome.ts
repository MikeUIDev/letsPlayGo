import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativePlatform } from './platform';

/** Configure iOS/Android system chrome for the light app shell. */
export async function configureNativeChrome(): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Dark status-bar icons/text on our light header background.
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Status bar styling is best-effort on unsupported platforms/simulators.
  }
}
