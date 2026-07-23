import { NextResponse } from 'next/server'
import { fetchLatestNews } from '@/lib/news'

/**
 * Paginated news feed for the /news "Load more" button. Reads from IGIHE's
 * newsroom API (via fetchLatestNews) and returns a JSON batch.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0)
  const limit = Math.min(24, Math.max(1, Number(searchParams.get('limit') ?? 8) || 8))

  const articles = await fetchLatestNews({ limit, offset })
  return NextResponse.json({ articles })
}
