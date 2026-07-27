import type { MetadataRoute } from 'next'
import { getAllMatchIds } from '@/lib/tournament'
import { fetchLatestNews } from '@/lib/news'
import { SITE_URL } from '@/lib/site'

/**
 * The site's sitemap.
 *
 * Regenerated on the same cadence as the pages it lists — a fixture added
 * mid-tournament shows up within the hour rather than at the next deploy.
 *
 * `/embed/*` is deliberately absent: those frames are `noindex` by design (see
 * the embed layout's metadata) and must not compete with the real match pages.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [matchIds, articles] = await Promise.all([
    getAllMatchIds(),
    // Both already degrade to an empty result rather than throwing, so a DB
    // blip yields a smaller sitemap instead of a failed build.
    fetchLatestNews({ limit: 200 }),
  ])

  const now = new Date()

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/matches`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/teams`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    ...matchIds.map((id) => ({
      url: `${SITE_URL}/matches/${id}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/news/${a.slug}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ]
}
