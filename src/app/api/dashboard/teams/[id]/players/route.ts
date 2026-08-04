import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** A squad is at most ~30 players — fetched whole, no pagination needed. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'players',
    where: { team: { equals: Number(id) } },
    sort: 'shirtNumber',
    limit: 50,
    depth: 1,
  })

  return NextResponse.json({ rows: result.docs })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('players:manage')
  if (response) return response

  const { id } = await params
  const teamId = Number(id)
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

  type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'

  try {
    const doc = await payload.create({
      collection: 'players',
      data: {
        name: get('name') ?? '',
        team: teamId,
        position: (get('position') ?? 'ST') as Position,
        shirtNumber: get('shirtNumber') ? Number(get('shirtNumber')) : undefined,
        photo: photoId,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add the player.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
