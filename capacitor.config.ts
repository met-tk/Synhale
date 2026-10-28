import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synhale.breathscape',
  appName: 'Synhale',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
