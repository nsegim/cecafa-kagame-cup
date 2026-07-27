import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * `/admin` and `/api` are of no use to a crawler, and `/embed` is content that
 * deliberately duplicates the real match pages for use inside someone else's
 * iframe — it already sends `noindex`, and disallowing it here keeps crawl
 * budget on the pages that should rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/embed/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
