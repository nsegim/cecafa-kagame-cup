import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'
import { MATCH_SELECT } from '@/lib/dashboard/match-select'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('matches:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    // Same lean select as the list route — the edit drawer only ever reads
    // these fields; the legacy commentary/photos/lineups arrays would bloat
    // this response for no reason (see MATCH_SELECT).
    const doc = await payload.findByID({ collection: 'matches', id, depth: 1, select: MATCH_SELECT })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('matches:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()
  const body = await request.json()

  try {
    const doc = await payload.update({ collection: 'matches', id, data: body })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the match.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('matches:manage')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'matches', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the match.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
