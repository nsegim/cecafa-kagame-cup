import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** Used for the feed's hide/unhide toggle — the only edit dashboard editors need post-publish. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { response } = await apiCapability('commentary:edit')
  if (response) return response

  const { entryId } = await params
  const payload = await getPayloadClient()
  const body = await request.json()

  try {
    const doc = await payload.update({
      collection: 'match-commentary',
      id: entryId,
      data: { hidden: Boolean(body.hidden) },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the entry.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { response } = await apiCapability('commentary:edit')
  if (response) return response

  const { entryId } = await params

  try {
    await getPayloadClient().then((payload) =>
      payload.delete({ collection: 'match-commentary', id: entryId }),
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the entry.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
