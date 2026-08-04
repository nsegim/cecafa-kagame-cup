import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('videos:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    const doc = await payload.findByID({ collection: 'videos', id, depth: 1 })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('videos:edit')
  if (response) return response

  const { id } = await params
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
    const doc = await payload.update({
      collection: 'videos',
      id,
      data: {
        title: get('title'),
        dateLabel: get('dateLabel'),
        videoUrl: get('videoUrl'),
        visible: formData.has('visible') ? get('visible') !== 'false' : undefined,
        ...(thumbId ? { thumbnail: thumbId } : {}),
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the video.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('videos:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'videos', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the video.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
