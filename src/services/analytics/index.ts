import analytics from '@react-native-firebase/analytics'

export async function logJournalEntryCreated(wordCount: number) {
  await analytics().logEvent('journal_entry_created', { word_count: wordCount })
}

export async function logJournalEntryDeleted() {
  await analytics().logEvent('journal_entry_deleted', {})
}

export async function logScreenView(screenName: string) {
  await analytics().logScreenView({ screen_name: screenName, screen_class: screenName })
}
