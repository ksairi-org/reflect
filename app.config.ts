import { withGradleProperties, withProjectBuildGradle } from "@expo/config-plugins";
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

  // expo-updates uses KSP (Kotlin Symbol Processing) for Room. It reads rootProject["kspVersion"]
  // in its buildscript block to select the compatible KSP version. expo-build-properties writes
  // android.kotlinVersion (prefixed), which expo-updates cannot see from its buildscript context.
  // Fix: pin both kspVersion and kotlinVersion as unprefixed gradle.properties entries, AND pin
  // the KSP classpath in the root build.gradle so the correct version is on the root classpath
  // before any subproject buildscript is evaluated.
  const KSP_VERSION = "2.0.21-1.0.28";
  let cfg = withGradleProperties(baseConfig, (c) => {
    c.modResults = c.modResults.filter(
      (item) => item.key !== "kspVersion" && item.key !== "kotlinVersion",
    );
    c.modResults.push({ type: "property", key: "kotlinVersion", value: "2.0.21" });
    c.modResults.push({ type: "property", key: "kspVersion", value: KSP_VERSION });
    return c;
  });
  cfg = withProjectBuildGradle(cfg, (c) => {
    if (!c.modResults.contents.includes("symbol-processing-gradle-plugin")) {
      c.modResults.contents = c.modResults.contents.replace(
        /classpath\('com\.facebook\.react:react-native-gradle-plugin'\)/,
        `classpath('com.facebook.react:react-native-gradle-plugin')\n        classpath('com.google.devtools.ksp:symbol-processing-gradle-plugin:${KSP_VERSION}')`,
      );
    }
    return c;
  });
  return cfg;
};
