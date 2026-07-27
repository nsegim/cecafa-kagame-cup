'use client'

import { useEffect, useState } from 'react'
import type { SectionData, SectionMatch } from '@/lib/section'

/**
 * The embeddable "Section" widget rendered inside an <iframe> on other sites.
 * Seeded from the server render, then it polls `/embed/section/data` so the
 * data stays live without a reload. Every link uses target="_blank" so a click
 * opens our own site in a new browser tab instead of navigating inside the
 * iframe. Relative hrefs resolve against the iframe's origin (our system).
 */
const POLL_MS = 60_000

/** Trim an overlong headline to a word boundary so it fits ~2 lines on the
 * feature tile across all screen widths, regardless of line-clamp support. */
function clampTitle(s: string, max = 200): string {
  if (s.length <= max) return s
  return (
    s
      .slice(0, max)
      .replace(/\s+\S*$/, '')
      .trimEnd() + '…'
  )
}

function Crest({ url, label }: { url: string | null; label: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="secw__crest" src={url} alt="" width={22} height={22} />
  }
  return (
    <span className="secw__crest secw__crest--mono" aria-hidden="true">
      {label.slice(0, 3).toUpperCase()}
    </span>
  )
}

function MatchRow({ m }: { m: SectionMatch }) {
  const played = m.status !== 'scheduled'
  return (
    <a
      className="upcoming-row upcoming-row--link"
      href={`/matches/${m.id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="upcoming-row__team">{m.homeShort}</span>
      <Crest url={m.homeCrest} label={m.homeShort} />
      {played ? (
        <span className={`upcoming-row__score ${m.status === 'live' ? 'is-live' : ''}`}>
          <span className="upcoming-row__nums">
            {m.homeScore}
            <span className="upcoming-row__dash">-</span>
            {m.awayScore}
          </span>
          <span className="upcoming-row__state">{m.status === 'live' ? 'LIVE' : 'FT'}</span>
        </span>
      ) : (
        <span className="upcoming-row__time">{m.time}</span>
      )}
      <Crest url={m.awayCrest} label={m.awayShort} />
      <span className="upcoming-row__team">{m.awayShort}</span>
    </a>
  )
}

export function SectionEmbed({ initial }: { initial: SectionData }) {
  const [data, setData] = useState<SectionData>(initial)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      try {
        // `no-cache` rather than `no-store` so the browser sends a conditional
        // request — an unchanged widget comes back as an empty 304.
        const res = await fetch('/embed/section/data', { cache: 'no-cache' })
        if (!cancelled && res.ok) setData((await res.json()) as SectionData)
      } catch {
        // transient network blip — keep the last good data, try again next tick
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }
    timer = setTimeout(tick, POLL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const { feature, news, groups } = data

  return (
    <div className="secw">
      <div className="secw__bar">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="secw__brand"
          aria-label="CECAFA Kagame Cup"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/whitLogo.png" alt="CECAFA Kagame Cup" width={72} height={62} />
        </a>
        <a href="/news" target="_blank" rel="noopener noreferrer" className="secw__all-news">
          MENYA AMAKURU YOSE YA CECAFA KAGAME CUP
        </a>
      </div>

      <div className="secw__grid">
        {feature && (
          <a
            className="secw__feature"
            href={feature.href}
            target="_blank"
            rel="noopener noreferrer"
            style={
              feature.thumbnailUrl ? { backgroundImage: `url(${feature.thumbnailUrl})` } : undefined
            }
          >
            {feature.isVideo && (
              <span className="secw__play" aria-hidden="true">
                ▶
              </span>
            )}
            {feature.category && <span className="secw__tag">{feature.category}</span>}
            <span className="secw__feature-overlay">
              <span className="secw__feature-title">{clampTitle(feature.title)}</span>
            </span>
          </a>
        )}

        <div className="secw__news">
          {news.map((a) => (
            <a
              key={a.id}
              className="secw__card"
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div
                className="secw__card-img"
                style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined}
              >
                {a.category && <span className="secw__tag">{a.category}</span>}
              </div>
              <h3 className="secw__card-title">{a.title}</h3>
              {a.excerpt && <p className="secw__card-excerpt">{a.excerpt}</p>}
              {/* <span className="secw__card-meta">{a.readingMinutes} min read</span> */}
            </a>
          ))}
        </div>

        <div className="upcoming-panel secw__panel">
          <div className="upcoming-panel__head">IMIKINO IKURIKIRA</div>
          <div className="upcoming-panel__body">
            {groups.length === 0 ? (
              <p className="upcoming-panel__empty">No fixtures yet.</p>
            ) : (
              groups.map((g) => (
                <div key={g.dateLabel} className="upcoming-panel__group">
                  <h4 className="upcoming-panel__date">{g.dateLabel}</h4>
                  {g.matches.map((m) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </div>
              ))
            )}
          </div>
          <a
            href="/matches"
            target="_blank"
            rel="noopener noreferrer"
            className="upcoming-panel__cta"
          >
            Reba imikino yose
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
