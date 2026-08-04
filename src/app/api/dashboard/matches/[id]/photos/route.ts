import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** Server-paginated photo grid for a single match — newest-uploaded first. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('photos:edit')
  if (response) return response

  const { id } = await params
  const matchId = Number(id)
  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(60, Math.max(1, Number(searchParams.get('pageSize')) || 24))

  const result = await payload.find({
    collection: 'match-photos',
    where: { match: { equals: matchId } },
    sort: '-sequence',
    page,
    limit: pageSize,
    depth: 1,
  })

  return NextResponse.json({
    rows: result.docs,
    pageCount: result.totalPages,
    totalDocs: result.totalDocs,
  })
}

/**
 * Bulk photo upload, collapsed into one server-side round trip: each file is
 * uploaded to Media and attached as its own `match-photos` row in the same
 * request. The original Payload-admin version (src/components/admin/
 * BulkPhotoUpload.tsx) did this as two separate client round trips per file
 * (POST /api/media, then POST /api/match-photos) — same behavior, fewer hops.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('photos:edit')
  if (response) return response

  const { id } = await params
  const matchId = Number(id)
  if (!matchId) return NextResponse.json({ error: 'Invalid match id' }, { status: 400 })

  const payload = await getPayloadClient()
  const formData = await request.formData()
  const files = formData.getAll('files').filter((f): f is File => f instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const alt = file.name.replace(/\.[^.]+$/, '').trim() || 'Match photo'

      const media = await payload.create({
        collection: 'media',
        data: { alt },
        file: { data: buffer, mimetype: file.type, name: file.name, size: buffer.length },
      })

      return payload.create({
        collection: 'match-photos',
        data: { match: matchId, image: media.id },
      })
    }),
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - succeeded

  return NextResponse.json({ succeeded, failed, total: files.length })
}
