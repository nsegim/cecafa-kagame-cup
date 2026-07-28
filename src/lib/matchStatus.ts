/**
 * Pure, dependency-free match-status logic — safe to import from client
 * components (unlike `lib/tournament.ts`, which pulls in the Payload SDK).
 */
import type { Match } from '@/payload-types'
import type { MatchEvent } from './tournament'

/**
 * A football match, plus stoppage/half-time and a buffer for knockout extra
 * time/penalties, comfortably wraps up within this long of its kickoff.
 */
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000

/**
 * How long after kickoff the feed is still worth polling once the result is in.
 * A match is done inside the live window above; the rest of this is the
 * post-match window — reactions, quotes and photos an editor keeps posting
 * after the whistle, which readers still sitting on the page should receive
 * without reloading.
 */
const COVERAGE_WINDOW_MS = 6 * 60 * 60 * 1000

/**
 * The break, so a Half Time / Second Half marker — and anything an editor posts
 * during the interval without typing a minute — lands there on the feed.
 */
export const HALF_TIME_MINUTE = 45

/**
 * Whether new entries can still arrive for this fixture. True while it's in
 * play, and for a while after the whistle so post-match updates reach a reader
 * who never left the page. Outside that window a result is settled and polling
 * would just be load on the origin.
 */
export function withinCoverageWindow(kickoff: string): boolean {
  return Date.now() < new Date(kickoff).getTime() + COVERAGE_WINDOW_MS
}

/**
 * Whether the match is sitting at the interval, read from the feed itself
 * (newest-first) rather than a separate status field — an editor marks the
 * break by posting a Half Time entry, and resumes with Second Half.
 *
 * Scanning from the top stops at the most recent marker. A minute logged past
 * the break also counts as resumed, so the interval doesn't stick if an editor
 * carries on without posting the Second Half marker.
 */
export function isHalfTimeBreak(events: MatchEvent[]): boolean {
  for (const e of events) {
    if (e.type === 'secondhalf') return false
    if (e.type === 'halftime') return true
    if (e.minute != null && e.minute > HALF_TIME_MINUTE) return false
  }
  return false
}

/**
 * The match's live-ness as the site should display it — not necessarily the
 * raw `status` field. An editor's explicit 'Final' always wins (they've
 * recorded the real result), an explicit 'Live' always shows as live, and a
 * fixture still sitting at 'Scheduled' automatically reads as live once its
 * kickoff time has passed, with no one needing to flip a switch. It stops
 * reading as live on its own once the window elapses, unless an editor has
 * explicitly kept `status` at 'live'.
 */
export function effectiveMatchStatus(match: Pick<Match, 'status' | 'kickoff'>): 'scheduled' | 'live' | 'final' {
  if (match.status === 'final') return 'final'
  if (match.status === 'live') return 'live'
  const kickoffMs = new Date(match.kickoff).getTime()
  const now = Date.now()
  if (now >= kickoffMs && now < kickoffMs + LIVE_WINDOW_MS) return 'live'
  return 'scheduled'
}
