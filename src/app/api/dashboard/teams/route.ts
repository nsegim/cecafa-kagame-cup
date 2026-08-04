import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/**
 * Doubles as the team-picker typeahead source (match drawer) and the full
 * Teams list — both need the same all-teams read, and `matches:edit` /
 * `teams:view` happen to be identical role sets, so one route and one
 * capability check serves both. Teams is a fixed 12-club roster (no
 * "thousands of records" risk), so this deliberately skips the
 * page/pageSize DataTable contract other lists use — a plain full fetch is
 * the honest choice for a dataset this size.
 */
export async function GET(request: NextRequest) {
  const { response } = await apiCapability('teams:view')
  if (response) return response

  const payload = await getPayloadClient()
  const q = request.nextUrl.searchParams.get('q')?.trim()

  const result = await payload.find({
    collection: 'teams',
    where: q ? { name: { like: q } } : undefined,
    sort: ['group', 'name'],
    limit: 50,
    depth: 1,
  })

  return NextResponse.json({ rows: result.docs })
}

export async function POST(request: NextRequest) {
  const { response } = await apiCapability('teams:edit')
  if (response) return response

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

  type Country = 'RW' | 'UG' | 'KE' | 'TZ' | 'ZNZ' | 'SO' | 'SS' | 'SD' | 'DJ'
  type Group = 'A' | 'B' | 'C'

  try {
    const doc = await payload.create({
      collection: 'teams',
      data: {
        name: get('name') ?? '',
        slug: get('slug') ?? '',
        shortName: get('shortName') ?? '',
        country: (get('country') ?? 'RW') as Country,
        group: (get('group') ?? 'A') as Group,
        drawOfLotsRank: get('drawOfLotsRank') ? Number(get('drawOfLotsRank')) : undefined,
        crest: crestId,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the team.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
