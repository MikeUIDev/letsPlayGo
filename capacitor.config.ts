import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.letsplaygo.app',
  appName: "Let's Play Go",
  webDir: 'dist',
  ios: {
    // Match --app-bg / .go-app --color-bg for a seamless launch → WebView handoff.
    backgroundColor: '#f7f3ef',
  },
};

export default config;
