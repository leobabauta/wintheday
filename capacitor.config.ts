import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "work.wintheday.app",
  appName: "Win the Day",
  webDir: "public",
  server: {
    url: "https://www.wintheday.work",
    androidScheme: "https",
  },
};

export default config;
