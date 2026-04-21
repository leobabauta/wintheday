import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "work.wintheday.app",
  appName: "Win the Day",
  webDir: "public",
  server: {
    url: "https://www.wintheday.work",
    androidScheme: "https",
  },
  ios: {
    // Keep content anchored to the safe area; prevents the document
    // from sliding under the status bar during rubber-band scrolls.
    contentInset: "always",
  },
  plugins: {
    Keyboard: {
      // "native" lets iOS resize the WKWebView naturally when the
      // keyboard opens, which avoids the horizontal layout shift we
      // were seeing when 100dvh collapsed abruptly.
      resize: "native",
    },
  },
};

export default config;
