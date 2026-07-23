/**
 * News comes from IGIHE's existing WordPress newsroom over the REST API.
 *
 * Articles are never copied into our database — journalists keep publishing
 * where they already work, and we render whatever is live. Copying would give
 * us a second version of the truth to keep in sync during the tournament.
 */

const WP_BASE = process.env.IGIHE_WP_BASE ?? 'https://old.igihe.com/wp-json/wp/v2'

/** IGIHE's "Football" category. */
export const FOOTBALL_CATEGORY = 9143

/**
 * Once the newsroom starts tagging Kagame Cup coverage, set this to that tag ID
 * and the feed narrows from all football to this tournament only.
 */
export const KAGAME_TAG = process.env.IGIHE_KAGAME_TAG
  ? Number(process.env.IGIHE_KAGAME_TAG)
  : undefined

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

export interface ArticleDetail extends Article {
  contentHtml: string
  tags: string[]
  authorName: string | null
  authorAvatarUrl: string | null
}

export interface Comment {
  id: number
  authorName: string
  authorAvatarUrl: string | null
  date: string
  contentHtml: string
}

/** WordPress returns HTML-encoded strings; headlines are full of &#8217; etc. */
function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&hellip;': '…',
    '&ndash;': '–',
    '&mdash;': '—',
    '&laquo;': '«',
    '&raquo;': '»',
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&ldquo;': '“',
    '&rdquo;': '”',
  }
  return input
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, (m) => named[m.toLowerCase()] ?? m)
}

function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
}

/** Mirrors the "8 min read" labels in the design. ~200 words per minute. */
function readingTime(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function pickImage(post: Record<string, unknown>): string | null {
  const fi = post.featured_image as { url?: string } | undefined
  if (fi && typeof fi.url === 'string' && fi.url) return fi.url

  const embedded = post._embedded as Record<string, unknown> | undefined
  const media = embedded?.['wp:featuredmedia'] as Array<{ source_url?: string }> | undefined
  if (media?.[0]?.source_url) return media[0].source_url as string

  return null
}

/**
 * The card tag ("Analysis", "News", …). WordPress embeds terms as an array of
 * taxonomy arrays; the first group is categories. We skip the broad "Football"
 * bucket so the tag is the more specific one where present.
 */
function pickCategory(post: Record<string, unknown>): string | null {
  const embedded = post._embedded as Record<string, unknown> | undefined
  const termGroups = embedded?.['wp:term'] as Array<Array<{ name?: string; id?: number }>> | undefined
  const categories = termGroups?.[0]
  if (!categories?.length) return null

  const specific =
    categories.find((c) => c.id !== FOOTBALL_CATEGORY && c.name && !/^amakuru$/i.test(c.name)) ??
    categories[0]
  return specific?.name ? decodeEntities(specific.name) : null
}

/** WordPress embeds tags as the second taxonomy group (after categories). */
function pickTags(post: Record<string, unknown>): string[] {
  const embedded = post._embedded as Record<string, unknown> | undefined
  const termGroups = embedded?.['wp:term'] as Array<Array<{ name?: string }>> | undefined
  const tags = termGroups?.[1] ?? []
  return tags.filter((t) => t.name).map((t) => decodeEntities(t.name!))
}

/**
 * IGIHE's newsroom uses a byline plugin (`bylines`) rather than the single
 * standard WP author, so we read that first and fall back to the embedded
 * author if a post doesn't have one set.
 */
function pickAuthor(post: Record<string, unknown>): { name: string | null; avatarUrl: string | null } {
  const bylines = post.bylines as Array<{ name?: string; image?: { url?: string } }> | undefined
  if (bylines?.[0]?.name) {
    return { name: decodeEntities(bylines[0].name), avatarUrl: bylines[0].image?.url || null }
  }

  const embedded = post._embedded as Record<string, unknown> | undefined
  const author = (embedded?.author as Array<{ name?: string; avatar_urls?: Record<string, string> }>)?.[0]
  if (author?.name) {
    return { name: decodeEntities(author.name), avatarUrl: author.avatar_urls?.['96'] || null }
  }

  return { name: null, avatarUrl: null }
}

function toArticle(post: Record<string, unknown>): Article {
  const title = (post.title as { rendered?: string })?.rendered ?? ''
  const excerpt = (post.excerpt as { rendered?: string })?.rendered ?? ''
  const content = (post.content as { rendered?: string })?.rendered ?? ''

  return {
    id: Number(post.id),
    slug: String(post.slug ?? ''),
    title: stripHtml(title),
    excerpt: stripHtml(excerpt),
    url: String(post.link ?? ''),
    imageUrl: pickImage(post),
    category: pickCategory(post),
    publishedAt: String(post.date ?? ''),
    readingMinutes: readingTime(content || excerpt),
  }
}

export interface FetchNewsOptions {
  limit?: number
  /** How many of the most recent articles to skip — for "load more" pagination. */
  offset?: number
  /** Seconds before Next.js refetches. We don't control IGIHE's CMS, so poll. */
  revalidate?: number
  signal?: AbortSignal
}

/**
 * Returns an empty array rather than throwing. A newsroom API hiccup during the
 * tournament must not take down the standings — the news strip just goes quiet.
 */
export async function fetchLatestNews({
  limit = 6,
  offset = 0,
  revalidate = 600,
  signal,
}: FetchNewsOptions = {}): Promise<Article[]> {
  const params = new URLSearchParams({
    per_page: String(limit),
    // Embed everything so we get both the featured image and the category terms.
    _embed: '1',
    orderby: 'date',
    order: 'desc',
  })

  if (offset > 0) params.set('offset', String(offset))

  if (KAGAME_TAG) params.set('tags', String(KAGAME_TAG))
  else params.set('categories', String(FOOTBALL_CATEGORY))

  const url = `${WP_BASE}/posts?${params.toString()}`

  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
      next: { revalidate, tags: ['news'] },
    })

    if (!res.ok) {
      console.error(`[news] IGIHE API returned ${res.status} for ${url}`)
      return []
    }

    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []

    return data.map((p) => toArticle(p as Record<string, unknown>))
  } catch (err) {
    console.error('[news] failed to reach IGIHE API:', err)
    return []
  }
}

/** A single article by its WordPress slug, for the internal /news/[slug] page. */
export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const url = `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&_embed=1`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600, tags: ['news'] },
    })

    if (!res.ok) {
      console.error(`[news] IGIHE API returned ${res.status} for ${url}`)
      return null
    }

    const data: unknown = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const post = data[0] as Record<string, unknown>
    const content = (post.content as { rendered?: string })?.rendered ?? ''
    const author = pickAuthor(post)

    return {
      ...toArticle(post),
      contentHtml: content,
      tags: pickTags(post),
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
    }
  } catch (err) {
    console.error('[news] failed to reach IGIHE API:', err)
    return null
  }
}

/** Other Football-category articles, for the Related Posts section. */
export async function fetchRelatedArticles(excludeId: number, limit = 2): Promise<Article[]> {
  const params = new URLSearchParams({
    per_page: String(limit),
    _embed: '1',
    orderby: 'date',
    order: 'desc',
    exclude: String(excludeId),
  })
  if (KAGAME_TAG) params.set('tags', String(KAGAME_TAG))
  else params.set('categories', String(FOOTBALL_CATEGORY))

  const url = `${WP_BASE}/posts?${params.toString()}`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600, tags: ['news'] },
    })
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((p) => toArticle(p as Record<string, unknown>))
  } catch (err) {
    console.error('[news] failed to reach IGIHE API:', err)
    return []
  }
}

/** Real comment count for a post, read from the response header (no body needed). */
export async function getCommentCount(postId: number): Promise<number> {
  const url = `${WP_BASE}/comments?post=${postId}&per_page=1`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300, tags: ['news'] },
    })
    if (!res.ok) return 0
    return Number(res.headers.get('X-WP-Total') ?? 0)
  } catch {
    return 0
  }
}

/** Real, published comments for a post, oldest first. */
export async function fetchComments(postId: number): Promise<Comment[]> {
  const url = `${WP_BASE}/comments?post=${postId}&order=asc&per_page=50`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300, tags: ['news'] },
    })
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []

    return (data as Record<string, unknown>[]).map((c) => ({
      id: Number(c.id),
      authorName: stripHtml((c.author_name as string) ?? 'Anonymous'),
      authorAvatarUrl:
        ((c.author_avatar_urls as Record<string, string> | undefined)?.['48'] as string) || null,
      date: String(c.date ?? ''),
      contentHtml: ((c.content as { rendered?: string })?.rendered as string) ?? '',
    }))
  } catch (err) {
    console.error('[news] failed to reach IGIHE API:', err)
    return []
  }
}

export interface NewCommentInput {
  postId: number
  authorName: string
  authorEmail: string
  content: string
}

/**
 * Posts a new comment to IGIHE's WordPress. Whether it appears immediately or
 * waits for moderation depends on IGIHE's own comment settings — we don't
 * control that, only the submission itself.
 */
export async function postComment(input: NewCommentInput): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${WP_BASE}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        post: input.postId,
        author_name: input.authorName,
        author_email: input.authorEmail,
        content: input.content,
      }),
    })

    if (res.ok) return { ok: true }

    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return { ok: false, message: body?.message || 'Something went wrong.' }
  } catch {
    return { ok: false, message: 'Could not reach the newsroom. Please try again.' }
  }
}
