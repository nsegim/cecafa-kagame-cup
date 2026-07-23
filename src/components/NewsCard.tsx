import Link from 'next/link'
import type { Article } from '@/lib/news'
import { shortDate } from '@/lib/datetime'

export type NewsCardVariant = 'featured' | 'standard' | 'compact'

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
      <div
        className="news-card__img"
        style={article.imageUrl ? { backgroundImage: `url(${article.imageUrl})` } : undefined}
      >
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
