import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** Squad lookup for the commentary composer's player pickers, optionally filtered by team. */
export async function GET(request: NextRequest) {
  const { response } = await apiCapability('commentary:edit')
  if (response) return response

  const payload = await getPayloadClient()
  const team = request.nextUrl.searchParams.get('team')

  const result = await payload.find({
    collection: 'players',
    where: team ? { team: { equals: Number(team) } } : undefined,
    sort: 'name',
    limit: 100,
    depth: 0,
    select: { name: true, team: true, shirtNumber: true, position: true },
  })

  return NextResponse.json({ rows: result.docs })
}
