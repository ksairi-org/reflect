import { Platform, LogBox } from 'react-native'
import * as Device from 'expo-device'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'

LogBox.ignoreLogs(['[RevenueCat]'])

const isSandbox = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'stg'

const configureRevenueCat = () => {
  if (!Device.isDevice) return

  const apiKey =
    Platform.OS === 'android' && process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY
      ? process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY
      : process.env.EXPO_PUBLIC_RC_API_KEY

  if (!apiKey) {
    console.warn('[RevenueCat] RC API key is not set — IAP will not work')
    return
  }

  if (isSandbox) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }

  Purchases.configure({ apiKey })
}

export { configureRevenueCat }
