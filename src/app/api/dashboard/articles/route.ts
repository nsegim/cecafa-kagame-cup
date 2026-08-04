import { NextResponse, type NextRequest } from 'next/server'
import type { Where } from 'payload'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: NextRequest) {
  const { response } = await apiCapability('articles:view')
  if (response) return response

  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const sortId = searchParams.get('sortId')
  const sortDesc = searchParams.get('sortDesc') === 'true'
  const q = searchParams.get('q')?.trim()
  const visibility = searchParams.get('visibility')
  const featured = searchParams.get('featured')

  const and: Where[] = []
  if (q) and.push({ title: { like: q } })
  if (visibility) and.push({ visibility: { equals: visibility } })
  if (featured) and.push({ featured: { equals: featured === 'true' } })

  const sort = sortId ? `${sortDesc ? '-' : ''}${sortId}` : '-publishDate'

  const result = await payload.find({
    collection: 'articles',
    where: and.length > 0 ? { and } : undefined,
    sort,
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
  const { response } = await apiCapability('articles:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const imageFile = formData.get('featuredImage')
  let imageId: number | undefined

  if (imageFile instanceof File) {
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: `${get('title') ?? 'Article'} image` },
      file: { data: buffer, mimetype: imageFile.type, name: imageFile.name, size: buffer.length },
    })
    imageId = media.id
  }

  if (!imageId) {
    return NextResponse.json({ error: 'A featured image is required.' }, { status: 400 })
  }

  try {
    const doc = await payload.create({
      collection: 'articles',
      data: {
        title: get('title') ?? '',
        featuredImage: imageId,
        shortDescription: get('shortDescription') ?? '',
        externalUrl: get('externalUrl') ?? '',
        category: get('category'),
        readingMinutes: get('readingMinutes') ? Number(get('readingMinutes')) : undefined,
        featured: get('featured') === 'true',
        displayOrder: get('displayOrder') ? Number(get('displayOrder')) : undefined,
        visibility: (get('visibility') ?? 'visible') as 'visible' | 'hidden',
        publishDate: get('publishDate'),
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the article.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
