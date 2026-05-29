import { withGradleProperties } from "@expo/config-plugins";
import type { ConfigContext, ExpoConfig } from "expo/config";

const SPLASH_IMAGE = "./assets/images/splash.png";
const SPLASH_BG_LIGHT = "#F5F0E8";
const SPLASH_BG_DARK = "#110f0e";
// 288dp is the Android 12+ maximum for windowSplashScreenAnimatedIcon — the system
// clips the icon to a circle at this size. Must match animationViewStyle in _layout.tsx
// so the Rive animation starts at the same visual size as the native splash icon.
const ANDROID_SPLASH_SIZE = 288;

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig: ExpoConfig = {
    ...config,
    owner: "ksairi-org",
    name: process.env.DISPLAY_NAME ?? "reflect",
    slug: "reflect",
    version: config.version,
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: process.env.EXPO_UPDATE_URL,
      checkAutomatically: "ON_LOAD",
      requestHeaders: {
        "expo-channel-name": process.env.EXPO_UPDATE_CHANNEL ?? "prd",
      },
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEMA ?? "reflect",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.APP_IDENTIFIER ?? "com.reflect.prod",
      googleServicesFile: process.env.GOOGLE_SERVICES_INFOPLIST_PATH,
      infoPlist: {
        UIBackgroundModes: ["fetch", "remote-notification"],
        ITSAppUsesNonExemptEncryption: false,
      },
      entitlements: {
        "aps-environment": "production",
        "com.apple.developer.applesignin": ["Default"],
        ...(process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID
          ? { "com.apple.developer.in-app-payments": [process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID] }
          : {}),
      },
    },
    android: {
      package: process.env.APP_IDENTIFIER ?? "com.reflect.prod",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: SPLASH_BG_LIGHT,
      },
      predictiveBackGestureEnabled: false,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON_PATH,
      permissions: ["android.permission.POST_NOTIFICATIONS"],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: SPLASH_BG_LIGHT,
          image: SPLASH_IMAGE,
          dark: {
            backgroundColor: SPLASH_BG_DARK,
          },
          ios: {
            // Full-screen legacy mode — no size constraint; image fills the screen.
            // No imageWidth needed: iOS Rive animation also fills full screen via Fit.Contain.
            enableFullScreenImage_legacy: true,
          },
          android: {
            imageWidth: ANDROID_SPLASH_SIZE,
          },
        },
      ],
      "expo-router",
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
      "@react-native-firebase/app",
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          enableBackgroundRemoteNotifications: true,
        },
      ],
      [
        "expo-build-properties",
        {
          android: { minSdkVersion: 24, kotlinVersion: "2.0.21" },
          ios: {
            useFrameworks: "static",
            forceStaticLinking: ["RNFBApp", "RNFBAnalytics", "RNFBMessaging"],
          },
        },
      ],
      "expo-secure-store",
      "expo-updates",
    ],
    extra: {
      eas: {
        projectId: "ffe92c43-db25-4566-b08e-b8dee91b107b",
      },
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };

  // expo-updates reads rootProject["kspVersion"] (no prefix) to select the KSP version
  // compatible with the Kotlin version. expo-build-properties writes android.kotlinVersion
  // (with prefix), which expo-updates cannot read. Writing kspVersion directly ensures
  // the correct KSP version is used instead of falling back to the 1.9.x default.
  // expo-build-properties writes android.kotlinVersion (prefixed), but expo-updates reads
  // rootProject["kotlinVersion"] (no prefix) and rootProject["kspVersion"]. Write both
  // unprefixed so expo-updates picks the correct KSP version instead of the 1.9.x fallback.
  return withGradleProperties(baseConfig, (cfg) => {
    cfg.modResults = cfg.modResults.filter(
      (item) => item.key !== "kspVersion" && item.key !== "kotlinVersion",
    );
    cfg.modResults.push({ type: "property", key: "kotlinVersion", value: "2.0.21" });
    cfg.modResults.push({ type: "property", key: "kspVersion", value: "2.0.21-1.0.28" });
    return cfg;
  });
};
