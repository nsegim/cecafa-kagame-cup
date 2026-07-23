'use client'

import { useState } from 'react'
import { VideoLightbox } from './VideoLightbox'

export interface HighlightCard {
  id: string | number
  homeLabel: string
  awayLabel: string
  dateLabel: string
  thumbnailUrl: string | null
  videoUrl: string | null
}

const PER_PAGE = 3

function Card({ card, onPlay }: { card: HighlightCard; onPlay: () => void }) {
  return (
    <button
      type="button"
      disabled={!card.videoUrl}
      onClick={onPlay}
      className={`highlight-card ${!card.videoUrl ? 'highlight-card--placeholder' : ''}`}
    >
      <div
        className="highlight-card__pitch"
        style={card.thumbnailUrl ? { backgroundImage: `url(${card.thumbnailUrl})` } : undefined}
      >
        <span className="highlight-card__play" aria-hidden="true">
          ▶
        </span>
      </div>
      <div className="highlight-card__cap">
        <span className="highlight-card__teams">
          <span>{card.homeLabel}</span>
          <em>vs</em>
          <span>{card.awayLabel}</span>
        </span>
        <span className="highlight-card__date">{card.dateLabel}</span>
      </div>
    </button>
  )
}

export function Highlights({ cards }: { cards: HighlightCard[] }) {
  const pageCount = Math.max(1, Math.ceil(cards.length / PER_PAGE))
  const [page, setPage] = useState(0)
  const [playing, setPlaying] = useState<string | null>(null)
  const visible = cards.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  const go = (delta: number) => setPage((p) => (p + delta + pageCount) % pageCount)

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Review</span>
          <h2>Match Highlights</h2>
        </div>

        <div className="highlights-carousel">
          {pageCount > 1 && (
            <button
              type="button"
              className="highlights-arrow highlights-arrow--prev"
              aria-label="Previous highlights"
              onClick={() => go(-1)}
            >
              ←
            </button>
          )}

          <div className="highlights-viewport">
            <div className="highlights" key={page}>
              {visible.map((c) => (
                <Card key={c.id} card={c} onPlay={() => c.videoUrl && setPlaying(c.videoUrl)} />
              ))}
            </div>
          </div>

          {pageCount > 1 && (
            <button
              type="button"
              className="highlights-arrow highlights-arrow--next"
              aria-label="Next highlights"
              onClick={() => go(1)}
            >
              →
            </button>
          )}
        </div>

        {pageCount > 1 && (
          <div className="highlights-dots" role="tablist" aria-label="Highlight pages">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <button
                key={idx}
                role="tab"
                aria-selected={idx === page}
                aria-label={`Page ${idx + 1}`}
                className={`highlights-dot ${idx === page ? 'is-active' : ''}`}
                onClick={() => setPage(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {playing && <VideoLightbox videoUrl={playing} onClose={() => setPlaying(null)} />}
    </section>
  )
}
