'use client'

import { useState } from 'react'
import type { Article } from '@/lib/news'
import { NewsCard } from './NewsCard'

const BATCH = 8

/**
 * The /news index: a large lead article, a 2×2 grid of the next four, then a
 * four-column grid of the rest, with a "Load More" button that pulls further
 * batches from the newsroom API.
 */
export function NewsFeed({ initial }: { initial: Article[] }) {
  const [featured, ...rest] = initial
  const [items, setItems] = useState<Article[]>(rest)
  const [offset, setOffset] = useState(initial.length)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(initial.length === 0)

  async function loadMore() {
    if (loading || done) return
    setLoading(true)
    try {
      const res = await fetch(`/api/news?offset=${offset}&limit=${BATCH}`)
      const data = (await res.json()) as { articles?: Article[] }
      const more = data.articles ?? []
      setItems((prev) => [...prev, ...more])
      setOffset((o) => o + more.length)
      if (more.length < BATCH) setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const lead = items.slice(0, 4)
  const grid = items.slice(4)

  return (
    <>
      <div className="news-index__lead">
        {featured && <NewsCard article={featured} variant="featured" />}
        <div className="news-index__lead-grid">
          {lead.map((a) => (
            <NewsCard key={a.id} article={a} variant="standard" />
          ))}
        </div>
      </div>

      {grid.length > 0 && (
        <div className="news-index__grid">
          {grid.map((a) => (
            <NewsCard key={a.id} article={a} variant="standard" />
          ))}
        </div>
      )}

      {!done && (
        <div className="news-index__more">
          <button
            type="button"
            className="btn btn--red news-index__more-btn"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </>
  )
}
