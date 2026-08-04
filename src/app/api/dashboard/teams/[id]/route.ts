import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('teams:view')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    const doc = await payload.findByID({ collection: 'teams', id, depth: 1 })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await apiCapability('teams:edit')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()
  const formData = await request.formData()

  const get = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }

  const crestFile = formData.get('crest')
  let crestId: number | undefined

  if (crestFile instanceof File) {
    const buffer = Buffer.from(await crestFile.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: `${get('name') ?? 'Team'} crest` },
      file: { data: buffer, mimetype: crestFile.type, name: crestFile.name, size: buffer.length },
    })
    crestId = media.id
  }

  try {
    const doc = await payload.update({
      collection: 'teams',
      id,
      data: {
        name: get('name'),
        slug: get('slug'),
        shortName: get('shortName'),
        country: get('country') as
          | 'RW'
          | 'UG'
          | 'KE'
          | 'TZ'
          | 'ZNZ'
          | 'SO'
          | 'SS'
          | 'SD'
          | 'DJ'
          | undefined,
        group: get('group') as 'A' | 'B' | 'C' | undefined,
        drawOfLotsRank: get('drawOfLotsRank') ? Number(get('drawOfLotsRank')) : undefined,
        ...(crestId ? { crest: crestId } : {}),
      },
    })
    return NextResponse.json(doc)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the team.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await apiCapability('teams:delete')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()

  try {
    await payload.delete({ collection: 'teams', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the team.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
