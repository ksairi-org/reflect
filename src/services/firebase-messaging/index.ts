import messaging from '@react-native-firebase/messaging'
import * as ExpoNotifications from 'expo-notifications'

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await ExpoNotifications.requestPermissionsAsync()
  if (status !== 'granted') return false

  // Also request Firebase messaging permission (required on iOS)
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  return enabled
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken()
    return token
  } catch {
    return null
  }
}

export function subscribeToForegroundMessages(
  onMessage: (title: string, body: string) => void,
): () => void {
  return messaging().onMessage(async remoteMessage => {
    const title = remoteMessage.notification?.title ?? 'Reflect'
    const body = remoteMessage.notification?.body ?? ''
    onMessage(title, body)
  })
}

export async function scheduleLocalNotification(title: string, body: string, delaySeconds = 3) {
  await ExpoNotifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: ExpoNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  })
}
