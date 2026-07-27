import Link from 'next/link'
import Image from 'next/image'
import type { Article } from '@/lib/news'
import { shortDate } from '@/lib/datetime'

export type NewsCardVariant = 'featured' | 'standard' | 'compact'

/**
 * Rendered widths per variant, so the optimiser can pick a sensible source
 * instead of always shipping the full 768px card variant from Cloudinary.
 */
const IMAGE_SIZES: Record<NewsCardVariant, string> = {
  featured: '(max-width: 900px) 100vw, 46vw',
  standard: '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw',
  compact: '(max-width: 600px) 40vw, 160px',
}

/**
 * Shared news teaser. `featured` is the large lead card (tall image, excerpt),
 * `standard` is the grid card (16:9 image, excerpt), `compact` drops the excerpt
 * for the tight homepage list.
 */
export function NewsCard({
  article,
  variant = 'standard',
  showDate = false,
}: {
  article: Article
  variant?: NewsCardVariant
  showDate?: boolean
}) {
  const showExcerpt = variant !== 'compact'

  return (
    <Link href={`/news/${article.slug}`} className={`news-card news-card--${variant}`}>
      {/* A CSS `background-image` here meant no srcset, no AVIF/WebP negotiation
          and no lazy loading — the full Cloudinary `card` render was fetched for
          every teaser. `.news-card__img` is already `position: relative` with
          `overflow: hidden`, and `.news-card__tag` already sits at `z-index: 2`,
          so `fill` drops in without a stylesheet change. */}
      <div className="news-card__img">
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes={IMAGE_SIZES[variant]}
            style={{ objectFit: 'cover' }}
          />
        )}
        {article.category && <span className="news-card__tag">{article.category}</span>}
        {!article.imageUrl && <span className="news-card__img-fallback">IGIHE</span>}
      </div>
      <div className="news-card__body">
        <h3 className="news-card__title">{article.title}</h3>
        {showExcerpt && article.excerpt && <p className="news-card__excerpt">{article.excerpt}</p>}
        <span className="news-card__meta">
          {showDate
            ? `${shortDate(article.publishedAt)} · ${article.readingMinutes} min read`
            : `${article.readingMinutes} min read`}
        </span>
      </div>
    </Link>
  )
}
