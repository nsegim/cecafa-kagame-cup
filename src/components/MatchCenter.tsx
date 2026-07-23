'use client'

import { useState } from 'react'
import type { MatchEvent } from '@/lib/tournament'
import Image from 'next/image'

type Tab = 'live' | 'stats' | 'photos'

export interface MatchCenterProps {
  events: MatchEvent[]
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  homeStats: { goals: number; yellows: number; reds: number }
  awayStats: { goals: number; yellows: number; reds: number }
  photos: string[]
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'goal') return <span className="commentary__icon commentary__icon--goal" aria-hidden="true" />
  if (type === 'yellow') return <span className="commentary__icon commentary__icon--yellow" aria-hidden="true" />
  if (type === 'red') return <span className="commentary__icon commentary__icon--red" aria-hidden="true" />
  return <span className="commentary__icon commentary__icon--whistle" aria-hidden="true" />
}

function eventText(e: MatchEvent, homeName: string, awayName: string): React.ReactNode {
  const team = e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''
  switch (e.type) {
    case 'goal':
      return (
        <>
          <strong>GOAL!</strong> {e.playerName}
          {team ? ` — ${team}` : ''}. A goal is on the board.
        </>
      )
    case 'yellow':
      return (
        <>
          {e.playerName}
          {team ? ` (${team})` : ''} is shown a yellow card for a late challenge.
        </>
      )
    case 'red':
      return (
        <>
          <strong>Red card.</strong> {e.playerName}
          {team ? ` (${team})` : ''} is sent off.
        </>
      )
    case 'kickoff':
      return (
        <>
          <strong>Kick-off.</strong> We are under way at the stadium.
        </>
      )
    case 'fulltime':
      return (
        <>
          <strong>Full-time.</strong> The referee brings the match to a close.
        </>
      )
    case 'note':
      return e.text
    default:
      return null
  }
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="matchstat">
      <span className="matchstat__val">{home}</span>
      <span className="matchstat__label">{label}</span>
      <span className="matchstat__val">{away}</span>
    </div>
  )
}

/**
 * Photos are interspersed evenly through the commentary feed rather than at
 * fixed positions, so it adapts to however many real photos and events exist
 * (instead of assuming a specific transcript length).
 */
function photoInsertIndex(eventCount: number, photoCount: number): Map<number, number> {
  const map = new Map<number, number>()
  if (eventCount === 0 || photoCount === 0) return map
  for (let p = 0; p < photoCount; p++) {
    const position = Math.min(
      eventCount - 1,
      Math.round(((p + 1) * eventCount) / (photoCount + 1)),
    )
    if (!map.has(position)) map.set(position, p)
  }
  return map
}

export function MatchCenter({
  events,
  homeName,
  awayName,
  homeStats,
  awayStats,
  photos,
}: MatchCenterProps) {
  const [tab, setTab] = useState<Tab>('live')
  const photoAtIndex = photoInsertIndex(events.length, photos.length)

  return (
    <div className="matchcenter">
      <div className="matchcenter__tabs" role="tablist" aria-label="Match detail">
        {(
          [
            ['live', 'Live Expressions'],
            ['stats', 'Statistics'],
            ['photos', 'Match Photos'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`matchcenter__tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="commentary">
          {events.length === 0 ? (
            <p className="perf__empty">Commentary will appear once the match kicks off.</p>
          ) : (
            events.map((e, i) => {
              const photoIndex = photoAtIndex.get(i)
              const photoSrc = photoIndex != null ? photos[photoIndex] : null
              return (
                <div className="commentary__group" key={i}>
                  <div className="commentary__entry">
                    <span className="commentary__min">{e.minute != null ? `${e.minute}'` : ''}</span>
                    <EventIcon type={e.type} />
                    <p className="commentary__text">{eventText(e, homeName, awayName)}</p>
                  </div>
                  {photoSrc && (
                    <figure className="commentary__photo">
                      <Image
                        src={photoSrc}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        style={{ objectFit: 'cover' }}
                      />
                      <figcaption>
                        {e.playerName || (e.side === 'home' ? homeName : awayName)} · {e.minute ?? ''}
                        &apos;
                      </figcaption>
                    </figure>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="matchstats">
          <div className="matchstats__head">
            <span>{homeName}</span>
            <span>{awayName}</span>
          </div>
          <StatRow label="Goals" home={homeStats.goals} away={awayStats.goals} />
          <StatRow label="Yellow Cards" home={homeStats.yellows} away={awayStats.yellows} />
          <StatRow label="Red Cards" home={homeStats.reds} away={awayStats.reds} />
        </div>
      )}

      {tab === 'photos' && (
        <div className="matchphotos">
          {photos.length === 0 ? (
            <p className="perf__empty">Photos will appear here once added.</p>
          ) : (
            photos.map((src, i) => (
              <div key={i} className="matchphotos__img" style={{ position: 'relative' }}>
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 320px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
