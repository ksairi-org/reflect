export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type NewJournalEntry = Pick<JournalEntry, 'content'>;
