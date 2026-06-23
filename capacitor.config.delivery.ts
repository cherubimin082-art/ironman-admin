import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'today.ironman.delivery',
  appName: 'Ironman Delivery Partner',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
