import { NextResponse, type NextRequest } from 'next/server'
import type { Where } from 'payload'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: NextRequest) {
  const { response } = await apiCapability('gallery:view')
  if (response) return response

  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 24))
  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const visible = searchParams.get('visible')

  const and: Where[] = []
  if (q) and.push({ title: { like: q } })
  if (category) and.push({ category: { equals: category } })
  if (visible) and.push({ visible: { equals: visible === 'true' } })

  const result = await payload.find({
    collection: 'gallery-images',
    where: and.length > 0 ? { and } : undefined,
    sort: '-createdAt',
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

export async function POST(request: NextRequest) {
  const { response } = await apiCapability('gallery:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const imageFile = formData.get('image')
  let imageId: number | undefined

  if (imageFile instanceof File) {
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: get('title') ?? 'Gallery image' },
      file: { data: buffer, mimetype: imageFile.type, name: imageFile.name, size: buffer.length },
    })
    imageId = media.id
  }

  if (!imageId) {
    return NextResponse.json({ error: 'A cover image is required.' }, { status: 400 })
  }

  type Category = 'Action' | 'Match Day' | 'Trophy' | 'Fans' | 'Stadium' | 'APR FC'

  try {
    const doc = await payload.create({
      collection: 'gallery-images',
      data: {
        title: get('title') ?? '',
        image: imageId,
        category: (get('category') ?? 'Action') as Category,
        flickrAlbumUrl: get('flickrAlbumUrl'),
        description: get('description'),
        visible: get('visible') !== 'false',
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the gallery item.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
