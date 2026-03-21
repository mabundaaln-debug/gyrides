import type { CapacitorConfig } from "@capacitor/cli";

const SERVER_URL =
  process.env.SERVER_URL ||
  "https://02c3ec18-1528-40b9-b513-4516bcf45e57-00-2hzsfxgev8r2e.spock.replit.dev";

const config: CapacitorConfig = {
  appId: "za.co.mpfunomedical.gyrides",
  appName: "GY Rides",
  webDir: "dist/public",
  server: {
    url: SERVER_URL,
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: "gyrides.keystore",
      keystoreAlias: "gyrides",
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
  },
};

export default config;
