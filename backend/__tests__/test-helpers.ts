/**
 * Generate a valid test date for booking tests.
 * Returns the ISO date string (YYYY-MM-DD) and the UTC offset for 09:00 MSK.
 * The date is guaranteed to be:
 *   - Within the 14-day booking window from tomorrow
 *   - A weekday in MSK (Mon–Fri)
 *
 * Usage:
 *   const { dateStr, utcHour } = getValidTestDate()
 *   // dateStr = '2026-11-11', utcHour = 6 (09:00 MSK = 06:00 UTC)
 */
export function getValidTestDate(daysOffset = 1): {
  dateStr: string
  utcHour: number
  utcMinute: number
} {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)

  const target = new Date(tomorrow)
  target.setUTCDate(target.getUTCDate() + daysOffset)

  // Check MSK day of week
  const mskTimestamp = target.getTime() + 3 * 3600_000
  const mskDay = new Date(mskTimestamp).getUTCDay()

  // If weekend, shift to Monday
  if (mskDay === 0) {
    target.setUTCDate(target.getUTCDate() + 1) // Sunday → Monday
  } else if (mskDay === 6) {
    target.setUTCDate(target.getUTCDate() + 2) // Saturday → Monday
  }

  const dateStr = target.toISOString().split('T')[0]
  return { dateStr, utcHour: 6, utcMinute: 0 } // 09:00 MSK = 06:00 UTC
}

export function makeStartAt(dateStr: string, hour = 6, minute = 0): string {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
}
