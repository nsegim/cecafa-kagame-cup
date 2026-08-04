import { NextResponse, type NextRequest } from 'next/server'
import type { Where } from 'payload'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'
import { MATCH_SELECT } from '@/lib/dashboard/match-select'

/** Server-side paginated/sorted/filtered list — never returns the whole collection at once. */
export async function GET(request: NextRequest) {
  const { response } = await apiCapability('matches:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const sortId = searchParams.get('sortId')
  const sortDesc = searchParams.get('sortDesc') === 'true'
  const q = searchParams.get('q')?.trim()
  const stage = searchParams.get('stage')
  const status = searchParams.get('status')
  const group = searchParams.get('group')
  const venue = searchParams.get('venue')

  const and: Where[] = []
  if (q) and.push({ label: { like: q } })
  if (stage) and.push({ stage: { equals: stage } })
  if (status) and.push({ status: { equals: status } })
  if (group) and.push({ group: { equals: group } })
  if (venue) and.push({ venue: { equals: venue } })

  const sort = sortId ? `${sortDesc ? '-' : ''}${sortId}` : 'kickoff'

  const result = await payload.find({
    collection: 'matches',
    where: and.length > 0 ? { and } : undefined,
    sort,
    page,
    limit: pageSize,
    depth: 1,
    select: MATCH_SELECT,
  })

  return NextResponse.json({
    rows: result.docs,
    pageCount: result.totalPages,
    totalDocs: result.totalDocs,
  })
}

export async function POST(request: NextRequest) {
  const { response } = await apiCapability('matches:manage')
  if (response) return response

  const payload = await getPayloadClient()
  const body = await request.json()

  try {
    const doc = await payload.create({ collection: 'matches', data: body })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the match.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
