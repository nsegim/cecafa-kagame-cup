/** All match times are displayed in Kigali local time (CAT, UTC+2). */
const TZ = 'Africa/Kigali'

export function matchDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function matchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function matchDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Day/month/year split for the stacked date badge on the matches list. */
export function matchDateParts(iso: string): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: get('day'), month: get('month'), year: get('year') }
}

/** Editorial byline style, e.g. "Jan 12, 2025 at 11:45 PM". */
export function articleDateTime(iso: string): string {
  const date = new Date(iso).toLocaleDateString('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = new Date(iso).toLocaleTimeString('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${date} at ${time}`
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  })
}
