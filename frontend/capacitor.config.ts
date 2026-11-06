import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personaltrader.app',
  appName: 'Personal Trader',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

