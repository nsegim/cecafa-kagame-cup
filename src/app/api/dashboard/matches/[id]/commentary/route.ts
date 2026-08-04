import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'
import { plainTextToLexical } from '@/lib/dashboard/lexical'

/** Server-paginated commentary feed for a single match — newest-posted first. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('commentary:edit')
  if (response) return response

  const { id } = await params
  const matchId = Number(id)
  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20))

  const result = await payload.find({
    collection: 'match-commentary',
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
 * Creates one commentary entry. Accepts multipart/form-data so an entry can
 * carry photos in the same request (mirroring the bulk photo uploader):
 * images are uploaded to Media first, then referenced on the entry.
 * `text` is plain text from the dashboard's composer, converted to the
 * minimal Lexical shape the field expects — the full rich-text toolbar
 * stays an /admin-only capability for now.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('commentary:edit')
  if (response) return response

  const { id } = await params
  const matchId = Number(id)
  if (!matchId) return NextResponse.json({ error: 'Invalid match id' }, { status: 400 })

  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const text = get('text')
  const files = formData.getAll('images').filter((f): f is File => f instanceof File)

  const imageIds = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const alt = file.name.replace(/\.[^.]+$/, '').trim() || 'Live Expressions photo'
      const media = await payload.create({
        collection: 'media',
        data: { alt },
        file: { data: buffer, mimetype: file.type, name: file.name, size: buffer.length },
      })
      return media.id
    }),
  )

  type CommentaryType =
    | 'note'
    | 'goal'
    | 'yellow'
    | 'red'
    | 'substitution'
    | 'halftime'
    | 'secondhalf'
    | 'postmatch'

  try {
    const doc = await payload.create({
      collection: 'match-commentary',
      data: {
        match: matchId,
        type: (get('type') ?? 'note') as CommentaryType,
        minute: get('minute') ? Number(get('minute')) : undefined,
        team: get('team') as 'home' | 'away' | undefined,
        player: get('player') ? Number(get('player')) : undefined,
        playerOff: get('playerOff') ? Number(get('playerOff')) : undefined,
        playerOn: get('playerOn') ? Number(get('playerOn')) : undefined,
        text: text ? plainTextToLexical(text) : undefined,
        images: imageIds.length > 0 ? imageIds : undefined,
        hidden: get('hidden') === 'true',
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not post the update.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
