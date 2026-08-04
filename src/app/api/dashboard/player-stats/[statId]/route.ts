import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ statId: string }> },
) {
  const { response } = await apiCapability('players:editStats')
  if (response) return response

  const { statId } = await params
  const payload = await getPayloadClient()
  const body = await request.json()

  try {
    const doc = await payload.update({
      collection: 'player-match-stats',
      id: statId,
      data: {
        goals: body.goals != null ? Number(body.goals) : undefined,
        assists: body.assists != null ? Number(body.assists) : undefined,
        cleanSheet: body.cleanSheet != null ? Boolean(body.cleanSheet) : undefined,
        minutes: body.minutes != null ? Number(body.minutes) : undefined,
        yellowCards: body.yellowCards != null ? Number(body.yellowCards) : undefined,
        redCards: body.redCards != null ? Number(body.redCards) : undefined,
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the stat line.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ statId: string }> },
) {
  const { response } = await apiCapability('players:editStats')
  if (response) return response

  const { statId } = await params

  try {
    await getPayloadClient().then((payload) =>
      payload.delete({ collection: 'player-match-stats', id: statId }),
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the stat line.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
