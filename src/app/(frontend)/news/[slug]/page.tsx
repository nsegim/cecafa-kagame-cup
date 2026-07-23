import { notFound } from 'next/navigation'
import {
  fetchArticleBySlug,
  fetchComments,
  fetchRelatedArticles,
  getCommentCount,
  type Article,
} from '@/lib/news'
import { shortDate, articleDateTime } from '@/lib/datetime'
import { PageHero } from '@/components/PageHero'
import { CommentForm } from '@/components/CommentForm'
import { ShareButton } from '@/components/ShareButton'
import Link from 'next/link'

export const revalidate = 300

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v11H8l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function commentDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Kigali',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function RelatedCard({ article, commentCount }: { article: Article; commentCount: number }) {
  return (
    <Link href={`/news/${article.slug}`} className="related-card">
      <div
        className="related-card__img"
        style={article.imageUrl ? { backgroundImage: `url(${article.imageUrl})` } : undefined}
      >
        {article.category && <span className="related-card__tag">{article.category}</span>}
      </div>
      <div className="related-card__body">
        <span className="related-card__date">{shortDate(article.publishedAt)}</span>
        <h3 className="related-card__title">{article.title}</h3>
        <p className="related-card__excerpt">{article.excerpt}</p>
        <span className="related-card__meta">
          {article.readingMinutes} min read
          <span className="related-card__meta-item">
            <CommentIcon /> {commentCount}
          </span>
        </span>
      </div>
    </Link>
  )
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await fetchArticleBySlug(slug)
  if (!article) notFound()

  const [comments, related, commentCount] = await Promise.all([
    fetchComments(article.id),
    fetchRelatedArticles(article.id, 2),
    getCommentCount(article.id),
  ])

  const relatedCounts = await Promise.all(related.map((r) => getCommentCount(r.id)))

  return (
    <>
      <PageHero
        slide={{ title: article.title, blurb: article.excerpt }}
        author={
          article.authorName
            ? {
                name: article.authorName,
                avatarUrl: article.authorAvatarUrl,
                dateLabel: articleDateTime(article.publishedAt),
              }
            : undefined
        }
      />

      <section className="section">
        <div className="container article">
          {article.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.imageUrl} alt="" className="article__hero-img" />
          )}

          <div className="article__meta">
            <span className="article__meta-left">
              {article.category && <span className="article__category">{article.category}</span>}
              {article.category && <span className="article__meta-sep">|</span>}
              <span className="article__date">{shortDate(article.publishedAt)}</span>
            </span>
            <span className="article__meta-right">
              <CommentIcon /> {commentCount}
            </span>
          </div>

          <div className="article-body" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

          <div className="article__tags">
            <div className="article__tag-list">
              {article.tags.map((t) => (
                <span key={t} className="article__tag">
                  {t}
                </span>
              ))}
            </div>
            <ShareButton title={article.title} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section--band">
          <div className="container">
            <div className="section-head">
              <h2>Related Posts</h2>
            </div>
            <div className="related-grid">
              {related.map((r, i) => (
                <RelatedCard key={r.id} article={r} commentCount={relatedCounts[i] ?? 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container article">
          <h2 className="comments__title">
            {commentCount} Comment{commentCount === 1 ? '' : 's'}
          </h2>

          {comments.length > 0 && (
            <ul className="comments__list">
              {comments.map((c) => (
                <li key={c.id} className="comment">
                  <div className="comment__avatar">
                    {c.authorAvatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.authorAvatarUrl} alt="" />
                    )}
                  </div>
                  <div className="comment__body">
                    <span className="comment__date">{commentDate(c.date)}</span>
                    <span className="comment__author">{c.authorName}</span>
                    <div
                      className="comment__content"
                      dangerouslySetInnerHTML={{ __html: c.contentHtml }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <CommentForm postId={article.id} />
        </div>
      </section>
    </>
  )
}
