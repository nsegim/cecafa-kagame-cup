import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('articles:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    const doc = await payload.findByID({ collection: 'articles', id, depth: 1 })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('articles:edit')
  if (response) return response

  const { id } = await params
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

  try {
    const doc = await payload.update({
      collection: 'articles',
      id,
      data: {
        title: get('title'),
        shortDescription: get('shortDescription'),
        externalUrl: get('externalUrl'),
        category: get('category'),
        readingMinutes: get('readingMinutes') ? Number(get('readingMinutes')) : undefined,
        featured: get('featured') === 'true',
        displayOrder: get('displayOrder') ? Number(get('displayOrder')) : undefined,
        visibility: get('visibility') as 'visible' | 'hidden' | undefined,
        publishDate: get('publishDate'),
        ...(imageId ? { featuredImage: imageId } : {}),
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the article.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('articles:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'articles', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the article.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
