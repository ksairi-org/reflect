export {};

declare module '@expo/config-types' {
  interface ExpoConfig {
    newArchEnabled?: boolean;
  }

  interface Android {
    edgeToEdgeEnabled?: boolean;
    predictiveBackGestureEnabled?: boolean;
  }
}
