import { NextResponse } from 'next/server'
import { getMatchDetail, effectiveMatchStatus } from '@/lib/tournament'
import { matchSideStats, type LiveMatchData } from '@/lib/matchStats'

/**
 * Live-updatable slice of a match, polled by the match page while it's live.
 * Always dynamic — every poll must read the current scoreline/feed, never a
 * cached response.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 })
  }

  const detail = await getMatchDetail(numericId)
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

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
