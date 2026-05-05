import { getAnalytics, logEvent } from '@react-native-firebase/analytics'
import { getApp } from '@react-native-firebase/app'

const analytics = getAnalytics(getApp())

export async function logJournalEntryCreated(wordCount: number) {
  await logEvent(analytics, 'journal_entry_created', { word_count: wordCount })
}

export async function logJournalEntryDeleted() {
  await logEvent(analytics, 'journal_entry_deleted', {})
}

export async function logScreenView(screenName: string) {
  await logEvent(analytics, 'screen_view', { screen_name: screenName, screen_class: screenName })
}
