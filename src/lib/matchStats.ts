/**
 * Pure, client-safe helpers for the live match view. No Payload SDK imports —
 * only the `MatchEvent` *type* (erased at build), so this is safe to import
 * from both the server data layer and client components.
 */
import type { MatchEvent } from './tournament'

export interface MatchSideStats {
  goals: number
  yellows: number
  reds: number
}

/**
 * The slice of a match that changes while it's live and is polled by the
 * client. Kept deliberately small — no lineups, teams or venue, which never
 * change mid-match.
 */
export interface LiveMatchData {
  status: 'scheduled' | 'live' | 'final'
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  photos: string[]
  homeStats: MatchSideStats
  awayStats: MatchSideStats
}

/** Derive per-side goal/card tallies from the commentary feed + scoreline. */
export function matchSideStats(
  events: MatchEvent[],
  homeScore: number,
  awayScore: number,
): { home: MatchSideStats; away: MatchSideStats } {
  const count = (side: 'home' | 'away', type: 'yellow' | 'red') =>
    events.filter((e) => e.side === side && e.type === type).length
  return {
    home: { goals: homeScore, yellows: count('home', 'yellow'), reds: count('home', 'red') },
    away: { goals: awayScore, yellows: count('away', 'yellow'), reds: count('away', 'red') },
  }
}
