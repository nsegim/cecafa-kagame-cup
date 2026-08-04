import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('gallery:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    const doc = await payload.findByID({ collection: 'gallery-images', id, depth: 1 })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('gallery:edit')
  if (response) return response

  const { id } = await params
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

  try {
    const doc = await payload.update({
      collection: 'gallery-images',
      id,
      data: {
        title: get('title'),
        category: get('category') as 'Action' | 'Match Day' | 'Trophy' | 'Fans' | 'Stadium' | 'APR FC' | undefined,
        flickrAlbumUrl: get('flickrAlbumUrl'),
        description: get('description'),
        visible: formData.has('visible') ? get('visible') !== 'false' : undefined,
        ...(imageId ? { image: imageId } : {}),
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the gallery item.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('gallery:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'gallery-images', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the gallery item.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
