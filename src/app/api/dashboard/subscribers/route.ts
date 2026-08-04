import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(request: NextRequest) {
  const { response } = await apiCapability('subscribers:view')
  if (response) return response

  const payload = await getPayloadClient()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const q = searchParams.get('q')?.trim()
  const sortId = searchParams.get('sortId')
  const sortDesc = searchParams.get('sortDesc') === 'true'
  const sort = sortId ? `${sortDesc ? '-' : ''}${sortId}` : '-createdAt'

  const result = await payload.find({
    collection: 'subscribers',
    where: q ? { email: { like: q } } : undefined,
    sort,
    page,
    limit: pageSize,
    depth: 0,
  })

  return NextResponse.json({
    rows: result.docs,
    pageCount: result.totalPages,
    totalDocs: result.totalDocs,
  })
}
