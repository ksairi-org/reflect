import {
  getMessaging,
  getToken,
  onMessage,
} from '@react-native-firebase/messaging'
import { getApp } from '@react-native-firebase/app'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as ExpoNotifications from 'expo-notifications'
import { Platform } from 'react-native'

if (Platform.OS === 'android') {
  ExpoNotifications.setNotificationChannelAsync('default', {
    name: 'Reflect',
    importance: ExpoNotifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  })
}

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const messaging = getMessaging(getApp())

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied'

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!Device.isDevice) return 'denied'
  const { status } = await ExpoNotifications.getPermissionsAsync()
  if (status === 'granted') return 'granted'
  if (status === 'undetermined') return 'undetermined'
  return 'denied'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status } = await ExpoNotifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function getFCMToken(): Promise<string | null> {
  if (!Device.isDevice) return null

  try {
    return await getToken(messaging)
  } catch (e) {
    console.warn('[FCM token] Failed to get token:', e)
    return null
  }
}

export function subscribeToForegroundMessages(
  onMessageCallback: (title: string, body: string) => void,
): () => void {
  return onMessage(messaging, async remoteMessage => {
    onMessageCallback(
      remoteMessage.notification?.title ?? 'Reflect',
      remoteMessage.notification?.body ?? '',
    )
  })
}

export async function scheduleLocalNotification(title: string, body: string, delaySeconds = 3) {
  await ExpoNotifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: ExpoNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  })
}

const REMINDER_NOTIF_ID_KEY = '@reflect/reminder_notif_id'

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  const existingId = await AsyncStorage.getItem(REMINDER_NOTIF_ID_KEY)
  if (existingId) {
    await ExpoNotifications.cancelScheduledNotificationAsync(existingId)
  }

  const id = await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: 'Reflect',
      body: "Time to jot down today's thoughts.",
    },
    trigger: {
      type: ExpoNotifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  })

  await AsyncStorage.setItem(REMINDER_NOTIF_ID_KEY, id)
}

export async function cancelDailyReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(REMINDER_NOTIF_ID_KEY)
  if (id) {
    await ExpoNotifications.cancelScheduledNotificationAsync(id)
    await AsyncStorage.removeItem(REMINDER_NOTIF_ID_KEY)
  }
}
