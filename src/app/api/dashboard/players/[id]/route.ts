import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    const doc = await payload.findByID({ collection: 'players', id, depth: 1 })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:manage')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const photoFile = formData.get('photo')
  let photoId: number | undefined

  if (photoFile instanceof File) {
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: get('name') ?? 'Player photo' },
      file: { data: buffer, mimetype: photoFile.type, name: photoFile.name, size: buffer.length },
    })
    photoId = media.id
  }

  try {
    const doc = await payload.update({
      collection: 'players',
      id,
      data: {
        name: get('name'),
        position: get('position') as
          | 'GK'
          | 'CB'
          | 'LB'
          | 'RB'
          | 'CDM'
          | 'CM'
          | 'CAM'
          | 'LW'
          | 'RW'
          | 'ST'
          | undefined,
        shirtNumber: get('shirtNumber') ? Number(get('shirtNumber')) : undefined,
        ...(photoId ? { photo: photoId } : {}),
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the player.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('players:manage')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'players', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the player.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
