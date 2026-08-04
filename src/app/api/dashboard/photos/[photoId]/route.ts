import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/**
 * Removes a match-photos row only — the underlying Media doc is left alone.
 * A photo could in principle be reused elsewhere; deleting the row (which is
 * all the public feed reads) is the safe, least-surprise operation.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { response } = await apiCapability('photos:edit')
  if (response) return response

  const { photoId } = await params

  try {
    await getPayloadClient().then((payload) =>
      payload.delete({ collection: 'match-photos', id: photoId }),
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the photo.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
