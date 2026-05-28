import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keepinmind.notes.app',
  appName: 'Keep In Mind',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.file"],
      serverClientId: "725462917918-68b6s3ihho559pnbljq57ea577o4n9ff.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
