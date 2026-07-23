import { notFound, redirect } from 'next/navigation'
import { fetchArticleBySlug } from '@/lib/news'

export const revalidate = 300

/**
 * Articles are external links curated in Payload. Opening one redirects the
 * reader to the original story on the external site. The internal /news/[slug]
 * route is kept so the existing news cards (which link here) keep working — it
 * simply forwards to the article's external URL.
 */
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await fetchArticleBySlug(slug)
  if (!article) notFound()
  redirect(article.url)
}
