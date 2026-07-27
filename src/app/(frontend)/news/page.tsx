import type { Metadata } from 'next'
import { fetchLatestNews } from '@/lib/news'
import { NewsFeed } from '@/components/NewsFeed'

export const revalidate = 300

const DESCRIPTION =
  'The latest news, analysis and interviews from the CECAFA Kagame Cup 2026 in Rwanda.'

export const metadata: Metadata = {
  title: 'News',
  description: DESCRIPTION,
  alternates: { canonical: '/news' },
  openGraph: { title: 'News', description: DESCRIPTION, url: '/news' },
}

export default async function NewsIndexPage() {
  // 1 lead + 4 in the 2×2 grid + 8 in the four-column grid.
  const articles = await fetchLatestNews({ limit: 13 })

  return (
    <section className="section news-index">
      <div className="container">
        <NewsFeed initial={articles} />
      </div>
    </section>
  )
}
