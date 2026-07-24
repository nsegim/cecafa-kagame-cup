'use client'

import { useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import type { MatchEvent } from '@/lib/tournament'
import { richTextHasContent } from '@/lib/richText'
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
  if (type === 'goal')
    return <span className="commentary__icon commentary__icon--goal" aria-hidden="true" />
  if (type === 'yellow')
    return <span className="commentary__icon commentary__icon--yellow" aria-hidden="true" />
  if (type === 'red')
    return <span className="commentary__icon commentary__icon--red" aria-hidden="true" />
  if (type === 'substitution')
    return <span className="commentary__icon commentary__icon--substitution" aria-hidden="true" />
  return <span className="commentary__icon commentary__icon--whistle" aria-hidden="true" />
}

/**
 * The auto-generated caption line for an event (GOAL!, cards, subs, whistle
 * markers). Returns `null` for a plain 'note', whose whole content is the
 * editor's rich text — rendered separately below the caption by <RichText>.
 * The editor's optional extra detail is no longer inlined here; it renders as
 * its own rich-text block under the caption.
 */
function eventCaption(e: MatchEvent, homeName: string, awayName: string): React.ReactNode {
  const team = e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''
  switch (e.type) {
    case 'goal': {
      // The scorer is optional — fall back to just the team when it's unknown.
      const scorer = e.playerName ? `${e.playerName}${team ? ` — ${team}` : ''}` : team
      return (
        <>
          <strong>GOAL!</strong>
          {scorer ? ` ${scorer}` : ''}. A goal is on the board.
        </>
      )
    }
    case 'yellow':
      return (
        <>
          {e.playerName}
          {team ? ` (${team})` : ''} ahawe ikarita y'umuhondo.
        </>
      )
    case 'red':
      return (
        <>
          <strong>Ikarita y'umutuku.</strong> {e.playerName}
          {team ? ` (${team})` : ''} avuye mu kibuga.
        </>
      )
    case 'substitution':
      return (
        <>
          <strong>Gusimbuza{team ? ` — ${team}` : ''}.</strong> {e.playerOutName ?? 'Player'} off,{' '}
          {e.playerInName ?? 'Player'} on.
        </>
      )
    case 'kickoff':
      return (
        <>
          <strong>Umukino uratangiye!</strong>
        </>
      )
    case 'halftime':
      return (
        <>
          <strong>Ikiruhuko.</strong>
        </>
      )
    case 'secondhalf':
      return (
        <>
          <strong>Umukino ukomeje!</strong>
        </>
      )
    case 'fulltime':
      return (
        <>
          <strong>Umukino urarangiye.</strong>
        </>
      )
    case 'note':
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
    const position = Math.min(eventCount - 1, Math.round(((p + 1) * eventCount) / (photoCount + 1)))
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
            ['live', `Imigendekere y'umukino`],
            ['stats', `Imibare y'umukino`],
            ['photos', `Amafoto y'umukino`],
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
            <p className="perf__empty">Ubusesenguzi bw'umukino buraza umukino nutangira.</p>
          ) : (
            events.map((e, i) => {
              // An image an editor attached directly to this entry takes priority
              // over the general Match Photos pool interspersed by position.
              const photoIndex = photoAtIndex.get(i)
              const photoSrc = e.image ?? (photoIndex != null ? photos[photoIndex] : null)
              return (
                <div className="commentary__group" key={i}>
                  <div className="commentary__entry">
                    <span className="commentary__min">
                      {e.minute != null ? `${e.minute}'` : ''}
                    </span>
                    <EventIcon type={e.type} />
                    <div className="commentary__text">
                      {(() => {
                        const caption = eventCaption(e, homeName, awayName)
                        return caption ? <p className="commentary__caption">{caption}</p> : null
                      })()}
                      {richTextHasContent(e.text) && (
                        <div className="commentary__richtext">
                          <RichText data={e.text as DefaultTypedEditorState} />
                        </div>
                      )}
                    </div>
                  </div>
                  {photoSrc && (
                    <figure className="commentary__photo">
                      <a
                        href={photoSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="commentary__photo-frame"
                        aria-label="Fungura ifoto"
                      >
                        <Image
                          src={photoSrc}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 100vw, 800px"
                          style={{ objectFit: 'cover' }}
                        />
                      </a>
                      <figcaption>
                        {e.playerName || (e.side === 'home' ? homeName : awayName)}
                        {e.minute != null ? ` · ${e.minute}'` : ''}
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
          <StatRow label="Ibitego" home={homeStats.goals} away={awayStats.goals} />
          <StatRow label="Amakarita y'umuhondo" home={homeStats.yellows} away={awayStats.yellows} />
          <StatRow label="Amakarita y'umutuku" home={homeStats.reds} away={awayStats.reds} />
        </div>
      )}

      {tab === 'photos' && (
        <div className="matchphotos">
          {photos.length === 0 ? (
            <p className="perf__empty"></p>
          ) : (
            photos.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="matchphotos__img"
                style={{ position: 'relative', display: 'block' }}
                aria-label="Fungura ifoto"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 320px"
                  style={{ objectFit: 'cover' }}
                />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}
