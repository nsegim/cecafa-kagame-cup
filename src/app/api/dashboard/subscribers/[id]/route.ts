import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('subscribers:manage')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'subscribers', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the subscriber.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
