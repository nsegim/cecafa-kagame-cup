import Link from 'next/link'
import type { Article } from '@/lib/news'
import { shortDate } from '@/lib/datetime'

function Card({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className={`news-card ${featured ? 'news-card--featured' : ''}`}
    >
      <div
        className="news-card__img"
        style={article.imageUrl ? { backgroundImage: `url(${article.imageUrl})` } : undefined}
      >
        {article.category && <span className="news-card__tag">{article.category}</span>}
        {!article.imageUrl && <span className="news-card__img-fallback">IGIHE</span>}
      </div>
      <div className="news-card__body">
        <h3 className="news-card__title">{article.title}</h3>
        {featured && article.excerpt && <p className="news-card__excerpt">{article.excerpt}</p>}
        <span className="news-card__meta">
          {shortDate(article.publishedAt)} · {article.readingMinutes} min read
        </span>
      </div>
    </Link>
  )
}

export function LatestNews({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <section className="section" id="news">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Blog</span>
            <h2>The Latest News</h2>
          </div>
          <p className="news-empty">Live news from IGIHE will appear here during the tournament.</p>
        </div>
      </section>
    )
  }

  const [featured, ...rest] = articles

  return (
    <section className="section" id="news">
      <div className="container">
        <div className="section-head">
          <span className="kicker">INKURU</span>
          <h2>Amakuru Aheruka</h2>
        </div>

        <div className="news-grid">
          <Card article={featured} featured />
          <div className="news-grid__rest">
            {rest.slice(0, 4).map((a) => (
              <Card key={a.id} article={a} />
            ))}
          </div>
        </div>

        <div className="news-more">
          <a
            href="https://igihe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--red"
          >
            Andi makuru
          </a>
        </div>
      </div>
    </section>
  )
}
