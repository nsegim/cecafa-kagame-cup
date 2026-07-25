import { NextResponse } from 'next/server'
import { getSectionData } from '@/lib/section'

/**
 * Live JSON slice polled by the <SectionEmbed> widget so the iframe stays
 * current without a reload. Always dynamic — every poll reads fresh data.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getSectionData()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
