'use client'

import { useState } from 'react'
import type { MatchEvent } from '@/lib/tournament'

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

export function MatchCenter({
  events,
  homeName,
  awayName,
  homeStats,
  awayStats,
  photos,
}: MatchCenterProps) {
  const [tab, setTab] = useState<Tab>('live')

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
            events.map((e, i) => (
              <div className="commentary__entry" key={i}>
                <span className="commentary__min">{e.minute != null ? `${e.minute}'` : ''}</span>
                <EventIcon type={e.type} />
                <p className="commentary__text">{eventText(e, homeName, awayName)}</p>
              </div>
            ))
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
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="matchphotos__img" />
          ))}
        </div>
      )}
    </div>
  )
}
