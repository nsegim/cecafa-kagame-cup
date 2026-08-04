import { NextResponse, type NextRequest } from 'next/server'
import type { Where } from 'payload'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: NextRequest) {
  const { response } = await apiCapability('videos:view')
  if (response) return response

  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const q = searchParams.get('q')?.trim()
  const visible = searchParams.get('visible')

  const and: Where[] = []
  if (q) and.push({ title: { like: q } })
  if (visible) and.push({ visible: { equals: visible === 'true' } })

  const result = await payload.find({
    collection: 'videos',
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
  const { response } = await apiCapability('videos:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const thumbFile = formData.get('thumbnail')
  let thumbId: number | undefined

  if (thumbFile instanceof File) {
    const buffer = Buffer.from(await thumbFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: get('title') ?? 'Video thumbnail' },
      file: { data: buffer, mimetype: thumbFile.type, name: thumbFile.name, size: buffer.length },
    })
    thumbId = media.id
  }

  try {
    const doc = await payload.create({
      collection: 'videos',
      data: {
        title: get('title') ?? '',
        dateLabel: get('dateLabel'),
        videoUrl: get('videoUrl'),
        visible: get('visible') !== 'false',
        thumbnail: thumbId,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the video.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
