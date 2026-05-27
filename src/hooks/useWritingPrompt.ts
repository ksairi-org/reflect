export function getDailyPromptIndex(promptCount: number): number {
  return Math.floor(Date.now() / 86400000) % promptCount
}
