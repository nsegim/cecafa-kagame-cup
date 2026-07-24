/**
 * Pure, dependency-free match-status logic — safe to import from client
 * components (unlike `lib/tournament.ts`, which pulls in the Payload SDK).
 */
import type { Match } from '@/payload-types'

/**
 * A football match, plus stoppage/half-time and a buffer for knockout extra
 * time/penalties, comfortably wraps up within this long of its kickoff.
 */
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000

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
