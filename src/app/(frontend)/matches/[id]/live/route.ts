import { NextResponse } from 'next/server'
import { getMatchDetail, effectiveMatchStatus } from '@/lib/tournament'
import { matchSideStats, type LiveMatchData } from '@/lib/matchStats'
import { polledJson } from '@/lib/jsonResponse'

/**
 * Live-updatable slice of a match, polled by the match page while it's live.
 *
 * Dynamic, because every poll must read the current scoreline and feed rather
 * than a build-time snapshot. It is NOT, however, uncacheable: see the
 * `s-maxage` below — a few seconds of shared cache lets the CDN answer a whole
 * stadium's worth of concurrent viewers from one origin read, which is the
 * difference between this route holding up during the final and not.
 */
export const dynamic = 'force-dynamic'

/**
 * Clients poll every 15s. A 5s shared window is short enough that no viewer
 * waits materially longer for a goal than they did before, and long enough that
 * N concurrent viewers collapse to roughly one origin request per 5s instead of
 * N every 15s.
 */
const CDN_CACHE_SECONDS = 5
const CDN_STALE_SECONDS = 25

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 })
  }

  const detail = await getMatchDetail(numericId, { includeOtherMatches: false })
  if (!detail) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const { match, events, photos } = detail
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const { home, away } = matchSideStats(events, homeScore, awayScore)

  const body: LiveMatchData = {
    status: effectiveMatchStatus(match),
    homeScore,
    awayScore,
    events,
    photos,
    homeStats: home,
    awayStats: away,
  }

  return polledJson(req, body, {
    sMaxAge: CDN_CACHE_SECONDS,
    staleWhileRevalidate: CDN_STALE_SECONDS,
  })
}
