/**
 * Matches are entered and displayed in Kigali local time (CAT, UTC+2, no
 * DST) regardless of the editor's own browser timezone — matching the
 * convention already documented on `Matches.kickoff`. A plain
 * `<input type="datetime-local">` has no timezone concept, so its value is
 * treated as Kigali wall-clock time on the way in and out, not the browser's.
 */
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000

/** "2026-08-05T15:30" (Kigali wall time) -> ISO instant. */
export function kigaliLocalToISO(value: string): string {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - KIGALI_OFFSET_MS).toISOString()
}

/** ISO instant -> "2026-08-05T15:30" for a datetime-local input, in Kigali wall time. */
export function isoToKigaliLocal(iso: string): string {
  const kigali = new Date(new Date(iso).getTime() + KIGALI_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${kigali.getUTCFullYear()}-${pad(kigali.getUTCMonth() + 1)}-${pad(kigali.getUTCDate())}T${pad(kigali.getUTCHours())}:${pad(kigali.getUTCMinutes())}`
}
