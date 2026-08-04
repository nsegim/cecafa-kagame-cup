import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** The /gallery page's hero banner — a single global doc, not a list. */
export async function GET() {
  const { response } = await apiCapability('gallery:view')
  if (response) return response

  const payload = await getPayloadClient()
  const doc = await payload.findGlobal({ slug: 'gallery', depth: 1 })
  return NextResponse.json(doc)
}

export async function PATCH(request: NextRequest) {
  const { response } = await apiCapability('gallery:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const formData = await request.formData()
  const imageFile = formData.get('heroImage')

  let imageId: number | undefined
  if (imageFile instanceof File) {
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Gallery hero banner' },
      file: { data: buffer, mimetype: imageFile.type, name: imageFile.name, size: buffer.length },
    })
    imageId = media.id
  }

  try {
    const doc = await payload.updateGlobal({
      slug: 'gallery',
      data: { ...(imageId ? { heroImage: imageId } : {}) },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the gallery banner.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
