import { getSectionData } from '@/lib/section'
import { polledJson } from '@/lib/jsonResponse'

/**
 * Live JSON slice polled by the <SectionEmbed> widget so the iframe stays
 * current without a reload.
 *
 * This is potentially the highest-volume endpoint on the site: it is polled by
 * every embedded frame wherever the widget is placed, which can be far more
 * concurrent readers than the CECAFA site's own traffic. It is compressed,
 * ETagged and CDN-cacheable for that reason — see `polledJson`.
 */
export const dynamic = 'force-dynamic'

/** The widget polls every 60s; a 30s shared window halves origin reads without visible lag. */
const CDN_CACHE_SECONDS = 30
const CDN_STALE_SECONDS = 60

export async function GET(req: Request) {
  const data = await getSectionData()
  return polledJson(req, data, {
    sMaxAge: CDN_CACHE_SECONDS,
    staleWhileRevalidate: CDN_STALE_SECONDS,
  })
}
