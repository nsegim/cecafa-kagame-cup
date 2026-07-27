import { NextResponse } from 'next/server'
import { getMatchDetail } from '@/lib/tournament'
import { buildMatchWidgetData } from '@/lib/matchWidget'
import { polledJson } from '@/lib/jsonResponse'

/**
 * The self-contained, cross-origin JSON the `<cecafa-match>` web component
 * polls. Unlike `/matches/[id]/live` this carries the crests, names and meta
 * too, because the widget has no server render of its own to fall back on — see
 * `buildMatchWidgetData`.
 *
 * CORS-enabled (`cors: true`) so a browser on a partner's origin may read it;
 * a plain GET with only `If-None-Match` needs no preflight, so there's no
 * OPTIONS handler. Same polling economics as the live route: a short shared
 * window collapses a fan-out of readers into ~one origin read per window, and
 * the ETag 304s the many polls where nothing changed.
 */
export const dynamic = 'force-dynamic'

const CDN_CACHE_SECONDS = 5
const CDN_STALE_SECONDS = 25

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json(
      { error: 'Invalid match id' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const detail = await getMatchDetail(numericId, { includeOtherMatches: false })
  if (!detail) {
    return NextResponse.json(
      { error: 'Match not found' },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  return polledJson(req, buildMatchWidgetData(detail), {
    sMaxAge: CDN_CACHE_SECONDS,
    staleWhileRevalidate: CDN_STALE_SECONDS,
    cors: true,
  })
}
