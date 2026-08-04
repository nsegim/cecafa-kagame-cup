import { NextResponse } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** CSV export — kept behind `subscribers:manage` (super_admin only), since a full email list is the one genuinely sensitive export in this system. */
export async function GET() {
  const { response } = await apiCapability('subscribers:manage')
  if (response) return response

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'subscribers',
    sort: '-createdAt',
    limit: 0,
    depth: 0,
  })

  const header = 'email,source,subscribed_at'
  const rows = result.docs.map((s) =>
    [csvEscape(s.email), csvEscape(s.source ?? ''), s.createdAt].join(','),
  )
  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
