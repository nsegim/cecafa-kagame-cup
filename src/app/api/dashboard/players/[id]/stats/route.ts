import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'
import { matchIdOf, matchLabelsFor } from '@/lib/dashboard/match-labels'

/** A player's full match-stat history — bounded by the tournament's own fixture count, no pagination needed. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'player-match-stats',
    where: { player: { equals: Number(id) } },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
  })

  const matchIds = result.docs.map((d) => matchIdOf(d.match)).filter((v): v is number => v != null)
  const labels = await matchLabelsFor(payload, Array.from(new Set(matchIds)))

  return NextResponse.json({
    rows: result.docs.map((d) => ({
      ...d,
      matchLabel: labels.get(matchIdOf(d.match) ?? -1) ?? 'Unknown match',
    })),
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:editStats')
  if (response) return response

  const { id } = await params
  const playerId = Number(id)
  const payload = await getPayloadClient()
  const body = await request.json()

  try {
    const doc = await payload.create({
      collection: 'player-match-stats',
      data: {
        player: playerId,
        match: Number(body.match),
        goals: Number(body.goals) || 0,
        assists: Number(body.assists) || 0,
        cleanSheet: Boolean(body.cleanSheet),
        minutes: body.minutes ? Number(body.minutes) : undefined,
        yellowCards: Number(body.yellowCards) || 0,
        redCards: Number(body.redCards) || 0,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save the stat line.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
