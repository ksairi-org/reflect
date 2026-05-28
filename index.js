import messaging from '@react-native-firebase/messaging'
import * as ExpoNotifications from 'expo-notifications'
import { Platform } from 'react-native'

// Must be registered at module level before React mounts.
// Handles FCM messages when the app is in background or killed state.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const title = remoteMessage.notification?.title ?? 'Reflect'
  const body = remoteMessage.notification?.body ?? ''
  if (!title && !body) return

  if (Platform.OS === 'android') {
    await ExpoNotifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    })
  }
})

import 'expo-router/entry'
