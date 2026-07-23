/**
 * News is curated in Payload (the `articles` collection).
 *
 * Editors don't write article bodies here — each Article is an external link
 * (title, image, blurb, destination URL) plus ordering/visibility controls. The
 * newsroom keeps publishing wherever it already does; this layer decides which
 * stories surface on the site and in what order. Clicking a card redirects to
 * the external URL (see `app/(frontend)/news/[slug]/page.tsx`).
 *
 * The exported `Article` shape is unchanged, so every news component
 * (FeaturedGrid, NewsFeed, NewsCard, LatestNews) renders exactly as before.
 */
import { getPayloadClient } from '@/lib/payload'
import type { Article as ArticleDoc, Media } from '@/payload-types'

export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string
  url: string
  imageUrl: string | null
  publishedAt: string
  readingMinutes: number
  category: string | null
}

function articleImageUrl(img: ArticleDoc['featuredImage']): string | null {
  if (!img || typeof img === 'number') return null
  const media = img as Media
  return media.sizes?.card?.url || media.sizes?.hero?.url || media.url || null
}

function toArticle(doc: ArticleDoc): Article {
  return {
    id: doc.id,
    slug: doc.slug || String(doc.id),
    title: doc.title,
    excerpt: doc.shortDescription ?? '',
    url: doc.externalUrl,
    imageUrl: articleImageUrl(doc.featuredImage),
    publishedAt: doc.publishDate ?? doc.createdAt,
    readingMinutes: doc.readingMinutes ?? 3,
    category: doc.category ?? null,
  }
}

export interface FetchNewsOptions {
  limit?: number
  /** How many of the most recent articles to skip — for "load more" pagination. */
  offset?: number
}

/**
 * Visible articles, ordered the way an editor curated them: featured first,
 * then by display order, then newest. Returns an empty array on any failure so
 * a data hiccup never takes down the rest of the page.
 */
export async function fetchLatestNews({
  limit = 6,
  offset = 0,
}: FetchNewsOptions = {}): Promise<Article[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'articles',
      where: { visibility: { equals: 'visible' } },
      sort: ['-featured', 'displayOrder', '-publishDate'],
      limit: offset + limit,
      depth: 1,
    })
    return (res.docs as ArticleDoc[]).slice(offset, offset + limit).map(toArticle)
  } catch (err) {
    console.error('[news] failed to read articles from Payload:', err)
    return []
  }
}

/** A single visible article by slug — used by the redirect route. */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'articles',
      where: { slug: { equals: slug }, visibility: { equals: 'visible' } },
      limit: 1,
      depth: 1,
    })
    const doc = res.docs[0] as ArticleDoc | undefined
    return doc ? toArticle(doc) : null
  } catch (err) {
    console.error('[news] failed to read article from Payload:', err)
    return null
  }
}
